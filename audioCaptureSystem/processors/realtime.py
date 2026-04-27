import argparse
import os
import sys
import time

import numpy as np
import sounddevice as sd

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import AudioIOConfig, PitchConfig
from core.pipeline import PitchProcessingPipeline


def list_devices():
    print("\n=== Entradas ===")
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev["max_input_channels"] > 0:
            print(f"[{i}] {dev['name'][:60]}")

    print("\n=== Salidas ===")
    for i, dev in enumerate(devices):
        if dev["max_output_channels"] > 0:
            print(f"[{i}] {dev['name'][:60]}")


class RealtimeAutoTune:
    def __init__(self, args):
        self.io_config = AudioIOConfig(
            sample_rate=args.sample_rate,
            channels=1,
            block_size=args.block_size,
        )
        self.pitch_config = PitchConfig(
            method=args.method,
            strength=float(np.clip(args.strength, 0.0, 1.0)),
            smoothing=float(np.clip(args.smooth, 0.0, 0.95)),
            dry_wet=float(np.clip(args.dry_wet, 0.0, 1.0)),
            key_note=args.key.upper() if args.key else None,
            key_octave=args.octave,
            confidence_threshold=args.threshold,
        )
        self.pipeline = PitchProcessingPipeline(
            io_config=self.io_config,
            pitch_config=self.pitch_config,
        )

        self.input_device = args.input_device
        self.output_device = args.output_device
        self.duration = args.duration
        self.bypass = args.bypass

        self.pitch_values = []
        self.frames_total = 0
        self.frames_voiced = 0

    def callback(self, indata, outdata, frames, callback_time, status):
        if status:
            print(f"Stream status: {status}")

        mono = indata[:, 0] if indata.ndim > 1 else indata
        if self.bypass:
            processed = mono
            pitch = 0.0
            note = "-"
        else:
            processed, pitch, note = self.pipeline.process_chunk(mono)

        self.frames_total += 1
        if pitch > 0:
            self.frames_voiced += 1
            self.pitch_values.append(pitch)

        outdata[:, 0] = processed
        if outdata.shape[1] > 1:
            outdata[:, 1] = processed

        if pitch > 0:
            print(
                f"Pitch {pitch:7.2f} Hz | Nota {note:>4} | Strength {self.pitch_config.strength:.2f} | DryWet {self.pitch_config.dry_wet:.2f}",
                end="\r",
            )

    def run(self):
        print("\n=== Realtime Auto-Tune Pro ===")
        print(f"Sample rate: {self.io_config.sample_rate}")
        print(f"Block size: {self.io_config.block_size}")
        print(f"Metodo: {self.pitch_config.method}")
        print(f"Strength: {self.pitch_config.strength}")
        print(f"Dry/Wet: {self.pitch_config.dry_wet}")
        print(
            f"Key lock: {self.pitch_config.key_note or 'AUTO'}{self.pitch_config.key_octave if self.pitch_config.key_note else ''}"
        )
        print("Ctrl+C para detener.\n")

        stream_devices = (self.input_device, self.output_device)
        if self.input_device is None and self.output_device is None:
            stream_devices = None

        start_time = time.time()
        try:
            with sd.Stream(
                device=stream_devices,
                channels=2,
                samplerate=self.io_config.sample_rate,
                blocksize=self.io_config.block_size,
                callback=self.callback,
            ):
                if self.duration > 0:
                    sd.sleep(int(self.duration * 1000))
                else:
                    while True:
                        sd.sleep(250)
        except KeyboardInterrupt:
            pass

        elapsed = time.time() - start_time
        voiced_ratio = (self.frames_voiced / max(self.frames_total, 1)) * 100.0
        avg_pitch = float(np.mean(self.pitch_values)) if self.pitch_values else 0.0

        print("\n\n=== Resumen ===")
        print(f"Tiempo ejecutado: {elapsed:.2f} s")
        print(f"Frames con voz: {self.frames_voiced}/{self.frames_total} ({voiced_ratio:.1f}%)")
        print(f"Pitch promedio: {avg_pitch:.2f} Hz")


def build_parser():
    parser = argparse.ArgumentParser(description="Auto-Tune en tiempo real (arquitectura modular)")
    parser.add_argument("--list-devices", action="store_true", help="Listar dispositivos y salir")
    parser.add_argument("--input-device", type=int, default=None)
    parser.add_argument("--output-device", type=int, default=None)
    parser.add_argument("--sample-rate", type=int, default=44100)
    parser.add_argument("--block-size", type=int, default=1024)
    parser.add_argument("--method", choices=["autocorrelation", "yin"], default="autocorrelation")
    parser.add_argument("--strength", type=float, default=0.8)
    parser.add_argument("--smooth", type=float, default=0.3)
    parser.add_argument("--dry-wet", type=float, default=1.0)
    parser.add_argument("--threshold", type=float, default=50.0)
    parser.add_argument("--key", type=str, default=None, help="Nota fija objetivo (C, F#, A)")
    parser.add_argument("--octave", type=int, default=4)
    parser.add_argument("--duration", type=float, default=30.0, help="Segundos; <=0 indefinido")
    parser.add_argument("--bypass", action="store_true", help="Monitoreo sin correccion")
    return parser


def main():
    parser = build_parser()
    args = parser.parse_args()

    if args.list_devices:
        list_devices()
        return

    app = RealtimeAutoTune(args)
    app.run()


if __name__ == "__main__":
    main()
