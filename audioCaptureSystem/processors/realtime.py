import os
import sys
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import sounddevice as sd
from core.PitchDetector import PitchDetector
from core.PitchCorrector import PitchCorrector
from core.notes import find_nearest_note, note_to_hz, NOTES
import argparse

class AutoTuneApp:
    def __init__(self, strength=0.8, key=None, octave=4):
        self.sample_rate = 44100
        self.blocksize = 2048
        
        self.detector = PitchDetector(sample_rate=self.sample_rate)
        self.corrector = PitchCorrector(sample_rate=self.sample_rate)
        
        self.strength = strength
        self.key = key.upper() if key else None
        self.octave = octave
        self.enabled = True
        self.prev_pitch = 0
        self.pitch_history = []
        
    def toggle(self):
        self.enabled = not self.enabled
        
    def process(self, indata):
        if not self.enabled:
            return indata[:, 0] if len(indata.shape) > 1 else indata
            
        audio = indata[:, 0] if len(indata.shape) > 1 else indata
        pitch = self.detector.detect(audio, method='autocorrelation')
        
        if pitch > 50:
            if self.prev_pitch > 0:
                pitch = 0.7 * self.prev_pitch + 0.3 * pitch
            self.prev_pitch = pitch
            self.pitch_history.append(pitch)
            
            note, octave, cents = find_nearest_note(pitch)
            
            if self.key:
                target_freq = note_to_hz(self.key, self.octave)
            else:
                target_freq = note_to_hz(note, octave) if note else pitch
            
            target_note = self.key if self.key else note
            print(f"Pitch: {pitch:5.0f}Hz -> {note}{octave} ({cents:+5.1f}c) | Meta: {target_note} | Fuerza: {int(self.strength*100)}%", end='\r')
            
            if target_freq and abs(target_freq - pitch) > 1:
                corrected = self.corrector.process_segment(audio, pitch, target_freq, self.strength)
                return corrected
            
            return audio
        else:
            self.prev_pitch = 0
            return audio

def show_menu():
    print("\n" + "="*50)
    print("      AUTO-TUNE SYSTEM")
    print("="*50)
    print("  [1] Tiempo Real (60 seg)")
    print("  [2] Tiempo Real (30 seg)")
    print("  [3] Offline - Procesar archivo")
    print("  [4] Ver dispositivos")
    print("  [5] Salir")
    print("="*50)

def run_realtime(duration=60, strength=0.8, key=None, octave=4):
    app = AutoTuneApp(strength=strength, key=key, octave=octave)
    
    print(f"\nIniciando Auto-Tune...")
    print(f"Fuerza: {int(strength*100)}% | Nota: {key if key else 'Auto'}")
    print(f"Duracion: {duration} segundos")
    print("Presiona Ctrl+C para detener\n")
    
    def callback(indata, outdata, frames, time, status):
        processed = app.process(indata)
        outdata[:, 0] = processed
        if outdata.shape[1] > 1:
            outdata[:, 1] = processed
    
    try:
        with sd.Stream(channels=2, samplerate=44100, blocksize=2048, callback=callback):
            print("Grabando... (Ctrl+C para detener)")
            sd.sleep(duration * 1000)
    except KeyboardInterrupt:
        if app.pitch_history:
            avg = sum(app.pitch_history) / len(app.pitch_history)
            print(f"\n\nPitch promedio: {avg:.1f} Hz")
        print("\nDetenido.")
    except Exception as e:
        print(f"Error: {e}")

def run_offline():
    print("\n--- Offline ---")
    print("Archivos WAV disponibles:")
    
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    import glob
    
    wav_files = glob.glob(os.path.join(base_dir, "*.wav"))
    if not wav_files:
        print("No hay archivos WAV")
        return
    
    for i, f in enumerate(wav_files):
        print(f"  [{i+1}] {os.path.basename(f)}")
    
    sel = input("\nSelecciona numero: ").strip()
    if not sel.isdigit() or int(sel) < 1 or int(sel) > len(wav_files):
        print("Cancelado")
        return
    
    filepath = wav_files[int(sel)-1]
    strength = input("Fuerza (0-1, Enter=0.8): ").strip()
    strength = float(strength) if strength else 0.8
    
    import soundfile as sf
    
    print(f"\nProcesando: {os.path.basename(filepath)}")
    audio, sr = sf.read(filepath)
    if len(audio.shape) > 1:
        audio = audio[:, 0]
    
    detector = PitchDetector(sample_rate=44100)
    corrector = PitchCorrector(sample_rate=44100)
    
    chunk_size = 2048
    hop_size = 1024
    output = np.zeros_like(audio)
    num_chunks = max(1, (len(audio) - chunk_size) // hop_size + 1)
    
    print("Procesando...")
    for i in range(num_chunks):
        start = i * hop_size
        end = min(start + chunk_size, len(audio))
        chunk = audio[start:end]
        
        if len(chunk) < 512:
            output[start:end] = chunk
            continue
        
        pitch = detector.detect(chunk, method='autocorrelation')
        
        if pitch > 50:
            corrected = corrector.auto_correct(chunk, pitch, strength)
            output[start:end] = corrected[:end-start]
        
        if i % 20 == 0:
            print(f"Progreso: {min(100, i/num_chunks*100):.0f}%", end='\r')
    
    print("Progreso: 100%")
    
    output_path = filepath.replace('.wav', '_autotune.wav')
    sf.write(output_path, output, 44100)
    print(f"\nGuardado: {output_path}")

def list_devices():
    print("\n=== Microfonos ===")
    for i, d in enumerate(sd.query_devices()):
        if d['max_input_channels'] > 0:
            print(f"  [{i}] {d['name'][:50]}")
    
    print("\n=== Altavoces ===")
    for i, d in enumerate(sd.query_devices()):
        if d['max_output_channels'] > 0:
            print(f"  [{i}] {d['name'][:50]}")

def main():
    while True:
        show_menu()
        choice = input("Selecciona: ").strip()
        
        if choice == "1":
            run_realtime(60)
        elif choice == "2":
            run_realtime(30)
        elif choice == "3":
            run_offline()
        elif choice == "4":
            list_devices()
        elif choice == "5":
            print("Adios!")
            break
        else:
            print("Opcion invalida")

if __name__ == "__main__":
    main()