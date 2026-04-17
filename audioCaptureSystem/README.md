# Audio Capture System

Sistema de captura y procesamiento de audio con detección y corrección de pitch (Auto-Tune).

## Estructura

```
audioCaptureSystem/
├── core/
│   ├── notes.py              # Conversión Hz ↔ Notas musicales
│   ├── PitchDetector.py      # Detección de pitch (autocorrelation, YIN)
│   └── PitchCorrector.py     # Corrección de pitch
├── processors/
│   ├── offline.py            # Procesar archivos WAV
│   └── realtime.py            # Auto-Tune en tiempo real
├── audio_capture.py           # Captura y grabación de audio
└── requirements.txt          # Dependencias
```

## Instalación

```bash
pip install -r requirements.txt
```

## Módulos

### 1. Captura de Audio
```bash
python audio_capture.py
```
- Lista micrófonos disponibles
- Graba audio en formato WAV

### 2. Procesamiento Offline
```bash
python processors/offline.py <archivo.wav> [fuerza]
```
- Carga un archivo WAV
- Aplica corrección de pitch
- Guarda resultado

### 3. Auto-Tune Tiempo Real
```bash
python processors/realtime.py [device_id] [fuerza]
```
- Captura audio del micrófono
- Procesa en tiempo real
- Salida por altavoces/auriculares

## Dependencias

- sounddevice
- numpy
- soundfile
- scipy

## Algoritmos

- **Detección de pitch**: Autocorrelation + YIN
- **Corrección de pitch**: Time-stretching con interpolación
- **Notas**: Sistema temperado equal (A4 = 440Hz)