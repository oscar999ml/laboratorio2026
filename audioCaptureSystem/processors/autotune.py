import os
import sys
import glob
import argparse

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import numpy as np
import soundfile as sf
import sounddevice as sd
from core.PitchDetector import PitchDetector
from core.PitchCorrector import PitchCorrector
from core.notes import find_nearest_note

def list_input_devices():
    print("\n=== Dispositivos de Entrada ===")
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            print(f"  [{i}] {dev['name'][:55]}")

def list_output_devices():
    print("\n=== Dispositivos de Salida ===")
    devices = sd.query_devices()
    for i, dev in enumerate(devices):
        if dev['max_output_channels'] > 0:
            print(f"  [{i}] {dev['name'][:55]}")

def find_wav_files():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    patterns = [
        os.path.join(base_dir, "*.wav"),
        os.path.join(base_dir, "..", "*.wav"),
        "*.wav"
    ]
    
    files = []
    for pattern in patterns:
        found = glob.glob(pattern)
        for f in found:
            if f not in files:
                files.append(f)
    
    return files

def show_menu():
    print("\n" + "="*50)
    print("      AUTO-TUNE SYSTEM v1.0")
    print("="*50)
    print("  [1] Tiempo Real - Procesar voz en vivo")
    print("  [2] Offline - Procesar archivo WAV")
    print("  [3] Listar dispositivos de audio")
    print("  [4] Salir")
    print("="*50)

def run_realtime(device_id, output_id, strength):
    print(f"\n--- Tiempo Real ---")
    print(f"Dispositivo entrada: {device_id or 'default'}")
    print(f"Dispositivo salida: {output_id or 'default'}")
    print(f"Fuerza: {strength}")
    print("\nHablando/cantando... (Ctrl+C para salir)\n")
    
    detector = PitchDetector(sample_rate=44100)
    corrector = PitchCorrector(sample_rate=44100)
    corrector.set_strength(strength)
    prev_pitch = 0
    
    def callback(indata, outdata, frames, time, status):
        nonlocal prev_pitch
        audio = indata[:, 0] if len(indata.shape) > 1 else indata
        
        pitch = detector.detect(audio, method='autocorrelation')
        
        if pitch > 50:
            if prev_pitch > 0:
                pitch = 0.6 * prev_pitch + 0.4 * pitch
            prev_pitch = pitch
            
            note, octave, cents = find_nearest_note(pitch)
            print(f"Pitch: {pitch:5.1f} Hz -> {note}{octave} ({cents:+.0f}c)", end='\r')
            
            corrected = corrector.auto_correct(audio, pitch, strength)
            outdata[:, 0] = corrected
            if outdata.shape[1] > 1:
                outdata[:, 1] = corrected
        else:
            outdata[:, 0] = audio
            if outdata.shape[1] > 1:
                outdata[:, 1] = audio
    
    try:
        with sd.Stream(device=(device_id, output_id), channels=2, 
                      samplerate=44100, blocksize=1024, callback=callback):
            sd.sleep(60000)
    except KeyboardInterrupt:
        print("\n\nDetenido.")
    except Exception as e:
        print(f"Error: {e}")

def run_offline(filepath, strength):
    print(f"\n--- Offline ---")
    print(f"Archivo: {filepath}")
    print(f"Fuerza: {strength}")
    
    detector = PitchDetector(sample_rate=44100)
    corrector = PitchCorrector(sample_rate=44100)
    
    print("Cargando audio...")
    audio, sr = sf.read(filepath)
    if len(audio.shape) > 1:
        audio = audio[:, 0]
    
    if sr != 44100:
        indices = np.linspace(0, len(audio)-1, int(len(audio) * 44100 / sr))
        audio = np.interp(indices, np.arange(len(audio)), audio).astype(np.float32)
    
    duration = len(audio) / 44100
    print(f"Duracion: {duration:.2f} seg")
    
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
    
    directory = os.path.dirname(filepath)
    filename = os.path.basename(filepath)
    name, ext = os.path.splitext(filename)
    output_path = os.path.join(directory, f"{name}_autotune{ext}")
    
    sf.write(output_path, output, 44100)
    print(f"\nGuardado: {output_path}")

def main():
    parser = argparse.ArgumentParser(prog='autotune', description='Auto-Tune System')
    parser.add_argument('mode', nargs='?', choices=['1','2','3','4'], default='menu',
                        help='1=Realtime, 2=Offline, 3=Devices, 4=Exit')
    parser.add_argument('-d', '--device', type=int, default=None, help='Input device ID')
    parser.add_argument('-o', '--output', type=int, default=None, help='Output device ID')
    parser.add_argument('-s', '--strength', type=float, default=0.8, help='Strength (0-1)')
    parser.add_argument('-f', '--file', type=str, help='File for offline')
    
    args = parser.parse_args()
    
    if args.mode == 'menu':
        while True:
            show_menu()
            choice = input("Selecciona: ").strip()
            
            if choice == '1':
                list_input_devices()
                list_output_devices()
                d = input("\nDevice ID (Enter=default): ").strip()
                o = input("Output ID (Enter=default): ").strip()
                s = input("Fuerza (0-1, Enter=0.8): ").strip()
                device = int(d) if d.isdigit() else None
                output = int(o) if o.isdigit() else None
                strength = float(s) if s else 0.8
                run_realtime(device, output, strength)
                
            elif choice == '2':
                files = find_wav_files()
                if not files:
                    print("No hay archivos WAV")
                    continue
                    
                print("\n=== Archivos WAV ===")
                for i, f in enumerate(files):
                    print(f"  [{i}] {os.path.basename(f)}")
                
                sel = input("\nSelecciona numero o ingresa ruta: ").strip()
                
                if sel.isdigit() and int(sel) < len(files):
                    filepath = files[int(sel)]
                else:
                    filepath = sel
                
                if not os.path.exists(filepath):
                    print(f"Archivo no encontrado: {filepath}")
                    continue
                
                s = input("Fuerza (0-1, Enter=0.8): ").strip()
                strength = float(s) if s else 0.8
                
                run_offline(filepath, strength)
                
            elif choice == '3':
                list_input_devices()
                list_output_devices()
                
            elif choice == '4':
                print("Adios!")
                break
            else:
                print("Opcion invalida")
    
    elif args.mode == '1':
        run_realtime(args.device, args.output, args.strength)
    elif args.mode == '2':
        if args.file:
            run_offline(args.file, args.strength)
        else:
            files = find_wav_files()
            if files:
                print(f"Archivos: {files}")
                run_offline(files[0], args.strength)
    elif args.mode == '3':
        list_input_devices()
        list_output_devices()

if __name__ == "__main__":
    main()