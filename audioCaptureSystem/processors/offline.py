import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import soundfile as sf
from core.PitchDetector import PitchDetector
from core.PitchCorrector import PitchCorrector
from core.notes import find_nearest_note, hz_to_note

class OfflineProcessor:
    def __init__(self, sample_rate=44100):
        self.sample_rate = sample_rate
        self.detector = PitchDetector(sample_rate=sample_rate)
        self.corrector = PitchCorrector(sample_rate=sample_rate)
        
    def load_audio(self, filepath):
        audio, sr = sf.read(filepath)
        if len(audio.shape) > 1:
            audio = audio[:, 0]
        if sr != self.sample_rate:
            audio = self._resample(audio, sr, self.sample_rate)
        return audio
    
    def _resample(self, audio, orig_sr, target_sr):
        duration = len(audio) / orig_sr
        samples = int(duration * target_sr)
        indices = np.linspace(0, len(audio) - 1, samples)
        return np.interp(indices, np.arange(len(audio)), audio).astype(audio.dtype)
    
    def process(self, audio, strength=0.8, smooth=True):
        chunk_size = 4096
        hop_size = 2048
        
        output = np.zeros_like(audio)
        num_chunks = (len(audio) - chunk_size) // hop_size + 1
        
        prev_pitch = 0
        pitch_history = []
        
        for i in range(num_chunks):
            start = i * hop_size
            end = min(start + chunk_size, len(audio))
            chunk = audio[start:end]
            
            if len(chunk) < 1024:
                output[start:end] = chunk
                continue
            
            pitch = self.detector.detect(chunk, method='autocorrelation')
            
            if smooth and pitch > 0 and prev_pitch > 0:
                pitch = 0.7 * prev_pitch + 0.3 * pitch
            
            if pitch > 0:
                corrected = self.corrector.auto_correct(chunk, pitch, strength)
                output[start:end] = corrected[:end-start]
                prev_pitch = pitch
                pitch_history.append(pitch)
            else:
                output[start:end] = chunk
            
            progress = (i + 1) / num_chunks * 100
            if i % 10 == 0:
                print(f"Procesando: {progress:.1f}%", end='\r')
        
        print(f"Procesando: 100.0% OK")
        return output
    
    def process_with_key(self, audio, key_note, key_octave, strength=0.8):
        from core.notes import note_to_hz
        target_freq = note_to_hz(key_note, key_octave)
        
        chunk_size = 4096
        hop_size = 2048
        
        output = np.zeros_like(audio)
        num_chunks = (len(audio) - chunk_size) // hop_size + 1
        
        for i in range(num_chunks):
            start = i * hop_size
            end = min(start + chunk_size, len(audio))
            chunk = audio[start:end]
            
            if len(chunk) < 1024:
                output[start:end] = chunk
                continue
            
            pitch = self.detector.detect(chunk, method='autocorrelation')
            
            if pitch > 0:
                ratio = self.corrector.correct_to_note(pitch, target_freq, strength)
                corrected = self.corrector.shift_pitch(chunk, ratio)
                output[start:end] = corrected[:end-start]
            else:
                output[start:end] = chunk
            
            progress = (i + 1) / num_chunks * 100
            if i % 10 == 0:
                print(f"Procesando: {progress:.1f}%", end='\r')
        
        print(f"Procesando: 100.0% OK")
        return output
    
    def save_audio(self, audio, filepath):
        sf.write(filepath, audio, self.sample_rate)
        print(f"Guardado: {filepath}")
    
    def analyze_audio(self, audio):
        print("\n--- Análisis de Audio ---")
        chunk_size = 4096
        hop_size = 2048
        
        pitches = []
        notes = []
        
        num_chunks = (len(audio) - chunk_size) // hop_size + 1
        
        for i in range(0, len(audio) - chunk_size, hop_size):
            chunk = audio[i:i + chunk_size]
            pitch = self.detector.detect(chunk, method='autocorrelation')
            
            if pitch > 50:
                pitches.append(pitch)
                note, octave, cents = find_nearest_note(pitch)
                if note:
                    notes.append(f"{note}{octave}")
        
        if pitches:
            avg_pitch = np.mean(pitches)
            print(f"Frecuencia promedio: {avg_pitch:.1f} Hz")
            
            note, octave, cents = find_nearest_note(avg_pitch)
            if note:
                print(f"Nota detectada: {note}{octave} ({cents:+.1f} cents)")
        
        if notes:
            from collections import Counter
            note_counts = Counter(notes)
            most_common = note_counts.most_common(5)
            print(f"Notas más frecuentes: {', '.join([f'{n}({c})' for n,c in most_common])}")
        
        print("------------------------\n")
        return pitches, notes

def process_file(input_path, output_path=None, strength=0.8):
    if output_path is None:
        import time
        output_path = input_path.replace('.wav', f'_autotune_{int(time.time())}.wav')
    
    processor = OfflineProcessor()
    
    print(f"Cargando: {input_path}")
    audio = processor.load_audio(input_path)
    
    print(f"Duración: {len(audio)/processor.sample_rate:.2f} segundos")
    
    processor.analyze_audio(audio)
    
    print("\nAplicando corrección de pitch...")
    corrected = processor.process(audio, strength=strength)
    
    processor.save_audio(corrected, output_path)
    
    return output_path

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Uso: python offline.py <archivo.wav> [fuerza]")
        print("Ejemplo: python offline.py grabacion.wav 0.8")
    else:
        input_file = sys.argv[1]
        
        if not os.path.isabs(input_file):
            base_dir = os.path.dirname(os.path.abspath(__file__))
            test_paths = [
                os.path.join(base_dir, input_file),
                os.path.join(base_dir, '..', input_file),
                os.path.join(base_dir, '..', '..', input_file),
            ]
            found = False
            for path in test_paths:
                if os.path.exists(path):
                    input_file = path
                    found = True
                    break
            if not found:
                print(f"Error: Archivo no encontrado: {input_file}")
        
        strength = float(sys.argv[2]) if len(sys.argv) > 2 else 0.8
        process_file(input_file, strength=strength)