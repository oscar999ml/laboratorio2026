from __future__ import annotations

import numpy as np
from typing import Tuple

from core.PitchDetector import PitchDetector
from core.PitchCorrector import PitchCorrector
from core.config import AudioIOConfig, OfflineRenderConfig, PitchConfig, ProcessingStats
from core.notes import find_nearest_note, note_to_hz


class PitchProcessingPipeline:
    def __init__(
        self,
        io_config: AudioIOConfig | None = None,
        pitch_config: PitchConfig | None = None,
        render_config: OfflineRenderConfig | None = None,
    ):
        self.io_config = io_config or AudioIOConfig()
        self.pitch_config = pitch_config or PitchConfig()
        self.render_config = render_config or OfflineRenderConfig()

        self.detector = PitchDetector(
            sample_rate=self.io_config.sample_rate,
            min_freq=self.pitch_config.min_freq,
            max_freq=self.pitch_config.max_freq,
        )
        self.corrector = PitchCorrector(sample_rate=self.io_config.sample_rate)
        self.prev_pitch = 0.0

    def _target_frequency(self, detected_pitch: float) -> float:
        if detected_pitch <= 0:
            return 0.0

        if self.pitch_config.key_note:
            return note_to_hz(self.pitch_config.key_note.upper(), self.pitch_config.key_octave)

        note, octave, _ = find_nearest_note(detected_pitch)
        if note is None:
            return 0.0
        return note_to_hz(note, octave)

    def process_chunk(self, audio_chunk: np.ndarray) -> Tuple[np.ndarray, float, str]:
        if len(audio_chunk) < 512:
            return audio_chunk, 0.0, "-"

        pitch = self.detector.detect(audio_chunk, method=self.pitch_config.method)
        if pitch > self.pitch_config.confidence_threshold and self.prev_pitch > 0:
            alpha = np.clip(self.pitch_config.smoothing, 0.0, 0.95)
            pitch = (1.0 - alpha) * pitch + alpha * self.prev_pitch

        if pitch <= self.pitch_config.confidence_threshold:
            self.prev_pitch = 0.0
            return audio_chunk, 0.0, "-"

        self.prev_pitch = pitch
        target_freq = self._target_frequency(pitch)
        if target_freq <= 0:
            return audio_chunk, pitch, "-"

        corrected = self.corrector.process_segment(
            audio_chunk,
            detected_freq=pitch,
            target_freq=target_freq,
            strength=self.pitch_config.strength,
        )

        dry_wet = float(np.clip(self.pitch_config.dry_wet, 0.0, 1.0))
        mixed = (1.0 - dry_wet) * audio_chunk + dry_wet * corrected

        note, octave, _ = find_nearest_note(pitch)
        label = f"{note}{octave}" if note else "-"
        return mixed.astype(audio_chunk.dtype), pitch, label

    def process_offline(self, audio: np.ndarray) -> Tuple[np.ndarray, ProcessingStats]:
        chunk_size = self.render_config.chunk_size
        hop_size = self.render_config.hop_size

        if len(audio) < chunk_size:
            chunk_size = max(512, len(audio))
            hop_size = max(256, chunk_size // 2)

        output_sum = np.zeros_like(audio, dtype=np.float64)
        weight_sum = np.zeros_like(audio, dtype=np.float64)
        window = np.hanning(chunk_size).astype(np.float64)

        pitches = []
        chunks_total = 0
        chunks_voiced = 0

        for start in range(0, max(1, len(audio) - chunk_size + 1), hop_size):
            end = min(start + chunk_size, len(audio))
            chunk = audio[start:end]
            if len(chunk) < chunk_size:
                padded = np.zeros(chunk_size, dtype=audio.dtype)
                padded[: len(chunk)] = chunk
                chunk = padded

            corrected, pitch, _ = self.process_chunk(chunk)
            if pitch > 0:
                pitches.append(pitch)
                chunks_voiced += 1

            valid_len = min(end - start, chunk_size)
            output_sum[start:end] += (corrected[:valid_len] * window[:valid_len]).astype(np.float64)
            weight_sum[start:end] += window[:valid_len]
            chunks_total += 1

        safe_weight = np.where(weight_sum <= 1e-8, 1.0, weight_sum)
        output = (output_sum / safe_weight).astype(np.float32)

        if self.render_config.normalize_output:
            peak = np.max(np.abs(output)) if len(output) else 0
            if peak > 0.99:
                output = output / peak * 0.99

        stats = ProcessingStats(
            chunks_total=chunks_total,
            chunks_voiced=chunks_voiced,
            average_pitch=float(np.mean(pitches)) if pitches else 0.0,
        )
        return output, stats
