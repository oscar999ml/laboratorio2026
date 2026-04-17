import numpy as np
from scipy import signal

class PitchCorrector:
    def __init__(self, sample_rate=44100):
        self.sample_rate = sample_rate
        self.strength = 1.0
        
    def set_strength(self, strength):
        self.strength = max(0, min(1, strength))
    
    def shift_pitch_simple(self, audio, pitch_shift_ratio):
        if abs(pitch_shift_ratio - 1.0) < 0.001:
            return audio
        
        if pitch_shift_ratio <= 0:
            return audio
        
        num_samples = int(len(audio) / pitch_shift_ratio)
        
        indices = np.linspace(0, len(audio) - 1, num_samples)
        shifted = np.interp(indices, np.arange(len(audio)), audio)
        
        if len(shifted) < len(audio):
            shifted = np.pad(shifted, (0, len(audio) - len(shifted)), mode='constant')
        else:
            shifted = shifted[:len(audio)]
        
        return shifted.astype(audio.dtype)
    
    def shift_pitch_resample(self, audio, semitones):
        if abs(semitones) < 0.01:
            return audio
        
        ratio = 2 ** (semitones / 12.0)
        
        num_samples = int(len(audio) / ratio)
        indices = np.linspace(0, len(audio) - 1, num_samples)
        
        resampled = np.interp(indices, np.arange(len(audio)), audio)
        
        if len(resampled) < len(audio):
            resampled = np.pad(resampled, (0, len(audio) - len(resampled)), mode='constant')
        else:
            resampled = resampled[:len(audio)]
        
        window = signal.windows.hann(len(resampled))
        resampled = resampled * window
        
        if len(resampled) < len(audio):
            resampled = np.pad(resampled, (0, len(audio) - len(resampled)))
        
        return resampled.astype(audio.dtype)
    
    def correct_to_note(self, detected_freq, target_freq, strength=None):
        if strength is None:
            strength = self.strength
            
        if detected_freq <= 0 or target_freq <= 0:
            return 1.0
            
        ratio = target_freq / detected_freq
        
        semitones = 12 * np.log2(ratio)
        
        correction = semitones * strength
        
        return correction
    
    def auto_correct(self, audio, detected_freq, strength=None):
        if strength is None:
            strength = self.strength
            
        if detected_freq <= 0 or len(audio) < 512:
            return audio
            
        from core.notes import find_nearest_note, note_to_hz
        
        note, octave, cents = find_nearest_note(detected_freq)
        
        if note is None:
            return audio
        
        target_freq = note_to_hz(note, octave)
        
        if target_freq <= 0:
            return audio
        
        semitones_diff = 12 * np.log2(target_freq / detected_freq)
        
        corrected_semitones = semitones_diff * strength
        
        return self.shift_pitch_resample(audio, corrected_semitones)
    
    def process_segment(self, audio, detected_freq, target_freq, strength=None):
        if detected_freq <= 0 or target_freq <= 0:
            return audio
            
        if strength is None:
            strength = self.strength
            
        semitones_diff = 12 * np.log2(target_freq / detected_freq)
        corrected_semitones = semitones_diff * strength
        
        return self.shift_pitch_resample(audio, corrected_semitones)