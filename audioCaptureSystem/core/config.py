from dataclasses import dataclass
from typing import Optional


@dataclass
class AudioIOConfig:
    sample_rate: int = 44100
    channels: int = 1
    block_size: int = 2048


@dataclass
class PitchConfig:
    method: str = "autocorrelation"
    strength: float = 0.8
    min_freq: float = 80.0
    max_freq: float = 1000.0
    smoothing: float = 0.3
    confidence_threshold: float = 50.0
    dry_wet: float = 1.0
    key_note: Optional[str] = None
    key_octave: int = 4


@dataclass
class OfflineRenderConfig:
    chunk_size: int = 4096
    hop_size: int = 1024
    normalize_output: bool = True


@dataclass
class ProcessingStats:
    chunks_total: int = 0
    chunks_voiced: int = 0
    average_pitch: float = 0.0
