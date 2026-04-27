import argparse
import logging
import shutil
import signal
import subprocess
import sys
import threading
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Optional


LOGGER = logging.getLogger("screen_audio_capture")


@dataclass(frozen=True)
class RecordingConfig:
    output_dir: Path
    fps: int = 60
    duration_seconds: Optional[int] = None
    video_preset: str = "veryfast"
    video_crf: int = 20
    capture_audio: bool = True
    audio_backend: str = "wasapi"
    audio_device: str = "default"
    include_mouse: bool = True


class FFmpegScreenRecorder:
    def __init__(self, config: RecordingConfig) -> None:
        self.config = config
        self.process: Optional[subprocess.Popen[str]] = None
        self._stop_event = threading.Event()
        self._stderr_thread: Optional[threading.Thread] = None

    @staticmethod
    def ensure_ffmpeg_installed() -> None:
        ffmpeg_path = shutil.which("ffmpeg")
        if ffmpeg_path is None:
            raise RuntimeError(
                "ffmpeg no esta instalado o no esta en PATH. "
                "Instalalo desde https://ffmpeg.org/download.html"
            )
        LOGGER.info("ffmpeg detectado en: %s", ffmpeg_path)

    @staticmethod
    def list_audio_devices() -> int:
        FFmpegScreenRecorder.ensure_ffmpeg_installed()
        cmd = ["ffmpeg", "-hide_banner", "-list_devices", "true", "-f", "dshow", "-i", "dummy"]
        LOGGER.info("Listando dispositivos de audio (dshow)...")
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        output = (result.stdout or "") + (result.stderr or "")
        print(output)
        return result.returncode

    def build_command(self, output_file: Path) -> list[str]:
        cfg = self.config

        cmd: list[str] = [
            "ffmpeg",
            "-hide_banner",
            "-y",
            "-fflags",
            "+genpts",
            "-thread_queue_size",
            "4096",
            "-f",
            "gdigrab",
            "-draw_mouse",
            "1" if cfg.include_mouse else "0",
            "-framerate",
            str(cfg.fps),
            "-use_wallclock_as_timestamps",
            "1",
            "-i",
            "desktop",
        ]

        if cfg.capture_audio:
            cmd.extend(["-thread_queue_size", "4096"])
            if cfg.audio_backend == "dshow":
                cmd.extend(
                    [
                        "-f",
                        "dshow",
                        "-audio_buffer_size",
                        "50",
                        "-use_wallclock_as_timestamps",
                        "1",
                        "-i",
                        f"audio={cfg.audio_device}",
                    ]
                )
            elif cfg.audio_backend == "wasapi":
                cmd.extend(["-f", "wasapi", "-use_wallclock_as_timestamps", "1", "-i", cfg.audio_device])
            else:
                raise ValueError(f"audio_backend no soportado: {cfg.audio_backend}")

        cmd.extend(
            [
                "-map",
                "0:v:0",
            ]
        )
        if cfg.capture_audio:
            cmd.extend(["-map", "1:a:0", "-af", "aresample=async=1:first_pts=0"])

        cmd.extend(
            [
                "-c:v",
                "libx264",
                "-preset",
                cfg.video_preset,
                "-tune",
                "zerolatency",
                "-crf",
                str(cfg.video_crf),
                "-pix_fmt",
                "yuv420p",
                "-g",
                str(cfg.fps * 2),
                "-max_muxing_queue_size",
                "2048",
                "-movflags",
                "+faststart",
            ]
        )

        if cfg.capture_audio:
            cmd.extend(["-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2"])

        if cfg.duration_seconds is not None:
            cmd.extend(["-t", str(cfg.duration_seconds)])

        cmd.append(str(output_file))
        return cmd

    def _stream_ffmpeg_logs(self) -> None:
        if self.process is None or self.process.stderr is None:
            return
        for line in self.process.stderr:
            if self._stop_event.is_set():
                break
            LOGGER.debug("ffmpeg: %s", line.rstrip())

    def start(self, output_file: Path) -> None:
        cmd = self.build_command(output_file)
        LOGGER.info("Iniciando captura en tiempo real")
        LOGGER.info("Salida: %s", output_file)
        LOGGER.debug("Comando ffmpeg: %s", " ".join(cmd))

        self.process = subprocess.Popen(
            cmd,
            stdin=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",
        )

        self._stderr_thread = threading.Thread(target=self._stream_ffmpeg_logs, daemon=True)
        self._stderr_thread.start()

    def stop(self) -> int:
        self._stop_event.set()
        if self.process is None:
            return 0

        if self.process.poll() is None:
            try:
                if self.process.stdin:
                    self.process.stdin.write("q\n")
                    self.process.stdin.flush()
            except OSError:
                LOGGER.warning("No se pudo enviar cierre limpio; terminando proceso.")
                self.process.terminate()

        return_code = self.process.wait(timeout=15)
        LOGGER.info("ffmpeg finalizo con codigo: %s", return_code)
        return return_code


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Grabador profesional de pantalla + audio en tiempo real usando FFmpeg."
    )
    subparsers = parser.add_subparsers(dest="command")

    subparsers.add_parser("list-devices", help="Muestra dispositivos detectados por FFmpeg (dshow).")

    record_parser = subparsers.add_parser("record", help="Inicia grabacion de pantalla + audio.")
    record_parser.add_argument("--fps", type=int, default=60, help="FPS objetivo para captura de video.")
    record_parser.add_argument("--duration", type=int, default=None, help="Duracion en segundos. Sin valor = manual.")
    record_parser.add_argument("--output-dir", type=Path, default=Path.home() / "Videos" / "Recordings")
    record_parser.add_argument("--video-preset", type=str, default="veryfast")
    record_parser.add_argument("--video-crf", type=int, default=20)
    record_parser.add_argument("--audio-backend", choices=["wasapi", "dshow"], default="wasapi")
    record_parser.add_argument("--audio-device", type=str, default="default")
    record_parser.add_argument("--no-audio", action="store_true", help="Desactiva captura de audio.")
    record_parser.add_argument("--hide-mouse", action="store_true", help="No mostrar puntero en el video.")

    parser.set_defaults(command="record")
    return parser.parse_args()


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )


def build_output_file(output_dir: Path) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    return output_dir / f"recording_{timestamp}.mp4"


def run_recording(args: argparse.Namespace) -> int:
    FFmpegScreenRecorder.ensure_ffmpeg_installed()

    config = RecordingConfig(
        output_dir=args.output_dir,
        fps=args.fps,
        duration_seconds=args.duration,
        video_preset=args.video_preset,
        video_crf=args.video_crf,
        capture_audio=not args.no_audio,
        audio_backend=args.audio_backend,
        audio_device=args.audio_device,
        include_mouse=not args.hide_mouse,
    )

    output_file = build_output_file(config.output_dir)
    recorder = FFmpegScreenRecorder(config)
    recorder.start(output_file)

    def handle_shutdown(signum: int, _frame: object) -> None:
        LOGGER.info("Signal %s recibido. Cerrando grabacion...", signum)
        recorder.stop()
        raise SystemExit(0)

    signal.signal(signal.SIGINT, handle_shutdown)
    if hasattr(signal, "SIGTERM"):
        signal.signal(signal.SIGTERM, handle_shutdown)

    LOGGER.info("Grabando... presiona Ctrl+C para detener.")
    try:
        if config.duration_seconds is None:
            recorder.process.wait() if recorder.process else None
        else:
            recorder.process.wait(timeout=config.duration_seconds + 30) if recorder.process else None
    except KeyboardInterrupt:
        LOGGER.info("Interrupcion manual detectada.")
    except subprocess.TimeoutExpired:
        LOGGER.warning("Timeout de seguridad alcanzado; cerrando proceso.")
    finally:
        code = recorder.stop()
        if code != 0:
            LOGGER.error("La grabacion termino con error. Revisa logs de ffmpeg.")
            return code

    LOGGER.info("Grabacion completada: %s", output_file)
    return 0


def main() -> int:
    setup_logging()
    args = parse_args()

    if args.command == "list-devices":
        return FFmpegScreenRecorder.list_audio_devices()
    if args.command == "record":
        return run_recording(args)

    LOGGER.error("Comando no reconocido: %s", args.command)
    return 2


if __name__ == "__main__":
    sys.exit(main())
