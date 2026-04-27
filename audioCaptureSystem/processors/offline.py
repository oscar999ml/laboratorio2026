import argparse
import json
import os
import sys

import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from core.config import AudioIOConfig, OfflineRenderConfig, PitchConfig
from core.notes import find_nearest_note
from core.pipeline import PitchProcessingPipeline


class OfflineProcessor:
    def __init__(self, sample_rate=44100):
        self.sample_rate = sample_rate

    def load_audio(self, filepath):
        audio, sr = sf.read(filepath)
        if len(audio.shape) > 1:
            audio = audio[:, 0]
        audio = audio.astype(np.float32)

        if sr != self.sample_rate:
            audio = self._resample(audio, sr, self.sample_rate)

        return audio

    def _resample(self, audio, orig_sr, target_sr):
        duration = len(audio) / max(orig_sr, 1)
        samples = int(duration * target_sr)
        indices = np.linspace(0, len(audio) - 1, samples)
        return np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)

    def analyze_audio(self, audio, sample_rate):
        chunk = 4096
        hop = 1024
        pitches = []

        for start in range(0, max(1, len(audio) - chunk), hop):
            frame = audio[start : start + chunk]
            if len(frame) < 1024:
                continue
            # Simple FFT-based hint for quick diagnostics in CLI logs.
            spectrum = np.abs(np.fft.rfft(frame * np.hanning(len(frame))))
            freqs = np.fft.rfftfreq(len(frame), d=1.0 / sample_rate)
            idx = int(np.argmax(spectrum[1:]) + 1) if len(spectrum) > 1 else 0
            pitch = float(freqs[idx]) if idx > 0 else 0.0
            if 50 <= pitch <= 1200:
                pitches.append(pitch)

        if not pitches:
            return {"average_pitch": 0.0, "detected_note": "-"}

        avg_pitch = float(np.mean(pitches))
        note, octave, cents = find_nearest_note(avg_pitch)
        label = f"{note}{octave} ({cents:+.1f}c)" if note else "-"
        return {
            "average_pitch": avg_pitch,
            "detected_note": label,
        }

    def process(self, audio, pitch_config, render_config):
        io_config = AudioIOConfig(sample_rate=self.sample_rate, channels=1)
        pipeline = PitchProcessingPipeline(
            io_config=io_config,
            pitch_config=pitch_config,
            render_config=render_config,
        )
        output, stats = pipeline.process_offline(audio)
        return output, stats

    def save_audio(self, audio, filepath):
        sf.write(filepath, audio, self.sample_rate)


def build_parser():
    parser = argparse.ArgumentParser(description="Procesamiento offline con arquitectura modular")
    parser.add_argument("input", help="Archivo de entrada WAV")
    parser.add_argument("--output", help="Ruta de salida WAV")
    parser.add_argument("--method", choices=["autocorrelation", "yin"], default="autocorrelation")
    parser.add_argument("--strength", type=float, default=0.8, help="Intensidad de corrección (0-1)")
    parser.add_argument("--smooth", type=float, default=0.3, help="Suavizado temporal del pitch (0-0.95)")
    parser.add_argument("--dry-wet", type=float, default=1.0, help="Mezcla señal original/procesada (0-1)")
    parser.add_argument("--key", type=str, default=None, help="Nota objetivo fija (ej. C, F#, A)")
    parser.add_argument("--octave", type=int, default=4, help="Octava de la nota objetivo")
    parser.add_argument("--chunk", type=int, default=4096)
    parser.add_argument("--hop", type=int, default=1024)
    parser.add_argument("--normalize", action="store_true", help="Normaliza salida para evitar clipping")
    parser.add_argument("--json-report", action="store_true", help="Imprime resumen JSON")
    return parser


def process_file(args):
    input_path = args.input
    if not os.path.isabs(input_path):
        input_path = os.path.abspath(input_path)

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Archivo no encontrado: {input_path}")

    if args.output:
        output_path = args.output
    else:
        base, ext = os.path.splitext(input_path)
        output_path = f"{base}_autotune_pro{ext}"

    processor = OfflineProcessor(sample_rate=44100)
    audio = processor.load_audio(input_path)

    pitch_config = PitchConfig(
        method=args.method,
        strength=float(np.clip(args.strength, 0.0, 1.0)),
        smoothing=float(np.clip(args.smooth, 0.0, 0.95)),
        dry_wet=float(np.clip(args.dry_wet, 0.0, 1.0)),
        key_note=args.key.upper() if args.key else None,
        key_octave=args.octave,
    )
    render_config = OfflineRenderConfig(
        chunk_size=max(512, args.chunk),
        hop_size=max(256, args.hop),
        normalize_output=bool(args.normalize),
    )

    analysis = processor.analyze_audio(audio, sample_rate=processor.sample_rate)
    processed, stats = processor.process(audio, pitch_config=pitch_config, render_config=render_config)
    processor.save_audio(processed, output_path)

    report = {
        "input": input_path,
        "output": output_path,
        "duration_seconds": round(len(audio) / processor.sample_rate, 2),
        "analysis": analysis,
        "stats": {
            "chunks_total": stats.chunks_total,
            "chunks_voiced": stats.chunks_voiced,
            "average_pitch": round(stats.average_pitch, 2),
        },
        "config": {
            "method": pitch_config.method,
            "strength": pitch_config.strength,
            "smoothing": pitch_config.smoothing,
            "dry_wet": pitch_config.dry_wet,
            "key": pitch_config.key_note,
            "octave": pitch_config.key_octave,
        },
    }

    if args.json_report:
        print(json.dumps(report, indent=2, ensure_ascii=True))
    else:
        print("\n=== Procesamiento Offline Profesional ===")
        print(f"Entrada: {report['input']}")
        print(f"Salida: {report['output']}")
        print(f"Duracion: {report['duration_seconds']} s")
        print(f"Pitch promedio estimado: {report['analysis']['average_pitch']:.2f} Hz")
        print(f"Nota estimada: {report['analysis']['detected_note']}")
        print(
            f"Frames con voz: {report['stats']['chunks_voiced']} / {report['stats']['chunks_total']}"
        )

    return output_path


def main():
    parser = build_parser()
    args = parser.parse_args()
    process_file(args)


if __name__ == "__main__":
    main()
