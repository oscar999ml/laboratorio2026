import sounddevice as sd
import numpy as np
import soundfile as sf
from pydub import AudioSegment
import os
import time

def list_microphones():
    devices = sd.query_devices()
    print("\n" + "="*50)
    print("DISPOSITIVOS DE AUDIO DISPONIBLES")
    print("="*50)
    input_devices = []
    for i, dev in enumerate(devices):
        if dev['max_input_channels'] > 0:
            input_devices.append(i)
            print(f"\n  [{i}] {dev['name']}")
            print(f"      Canales: {dev['max_input_channels']}")
            print(f"      Sample rate: {dev['default_samplerate']} Hz")
    return input_devices

def select_device(input_devices):
    print("\n" + "="*50)
    print("SELECCIONAR MICRÓFONO")
    print("="*50)
    print("Ingresa el número del micrófono que deseas usar:")
    print("(Presiona Enter para usar el predeterminado del sistema)")
    
    while True:
        try:
            choice = input("\n> ").strip()
            if choice == "":
                default = sd.query_devices(kind='input')
                print(f"Usando dispositivo predeterminado: [{default['name']}]")
                return None
            device_idx = int(choice)
            if device_idx in input_devices:
                dev = sd.query_devices(device_idx)
                print(f"Seleccionado: [{device_idx}] {dev['name']}")
                return device_idx
            else:
                print(f"Error: No existe dispositivo [{device_idx}]. Intenta de nuevo.")
        except ValueError:
            print("Error: Ingresa un número válido.")

def start_recording(device_index=None, duration=None):
    print("\n" + "="*50)
    print("GRABACIÓN DE AUDIO")
    print("="*50)
    print("Presiona ENTER para iniciar la grabación")
    print("Presiona ENTER nuevamente para detener")
    print("(O especifica duración en segundos)")
    
    duration_input = input("\nDuración en segundos (Enter para manual): ").strip()
    
    recording = []
    
    def callback(indata_val, frames, time_val, status):
        if status:
            print(f"Status: {status}")
        recording.append(indata_val.copy())
    
    print("\nGrabando... (Presiona Enter para detener)")
    
    try:
        with sd.InputStream(
            device=device_index,
            channels=2,
            samplerate=44100,
            blocksize=4096,
            callback=callback
        ) as stream:
            if duration_input:
                duration_sec = int(duration_input)
                print(f"Grabando por {duration_sec} segundos...")
                sd.sleep(duration_sec * 1000)
            else:
                input()
        
        print("\n¡Grabación completada!")
        
        audio_data = np.concatenate(recording)
        
        filename = f"grabacion_{int(time.time())}"
        
        wav_path = f"{filename}.wav"
        sf.write(wav_path, audio_data, 44100)
        print(f"✓ Guardado: {wav_path}")
        
        export_mp3(wav_path)
        
    except KeyboardInterrupt:
        print("\nGrabación cancelada.")
    except Exception as e:
        print(f"Error: {e}")

def export_mp3(wav_path):
    print("\n" + "="*50)
    print("EXPORTAR A MP3")
    print("="*50)
    
    try:
        sound = AudioSegment.from_wav(wav_path)
        mp3_path = wav_path.replace(".wav", ".mp3")
        sound.export(mp3_path, format="mp3", bitrate="192k")
        print(f"✓ Exportado: {mp3_path}")
        
        print(f"\nArchivos generados:")
        print(f"  - {wav_path}")
        print(f"  - {mp3_path}")
    except Exception as e:
        print(f"Error al exportar MP3: {e}")
        print("(Puedes usar el archivo WAV)")

def main_menu():
    while True:
        print("\n" + "="*50)
        print("  SISTEMA DE CAPTURA DE AUDIO")
        print("="*50)
        print("  [1] Ver dispositivos de audio")
        print("  [2] Grabar audio")
        print("  [3] Salir")
        print("="*50)
        
        choice = input("\nSelecciona una opción: ").strip()
        
        if choice == "1":
            list_microphones()
        elif choice == "2":
            input_devices = list_microphones()
            device_idx = select_device(input_devices)
            start_recording(device_idx)
        elif choice == "3":
            print("¡Hasta luego!")
            break
        else:
            print("Opción inválida")

if __name__ == "__main__":
    main_menu()