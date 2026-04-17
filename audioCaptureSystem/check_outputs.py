import sounddevice as sd
devices = sd.query_devices()
print("Dispositivos de salida:")
for i, dev in enumerate(devices):
    if dev['max_output_channels'] > 0:
        print(f"  [{i}] {dev['name']}")