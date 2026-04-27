# Audio Capture System Pro

Sistema de captura y procesamiento de voz con correccion de pitch, arquitectura modular y base lista para escalar a SaaS.

## Arquitectura

```
audioCaptureSystem/
├── core/
│   ├── config.py           # Configuracion tipada (IO, pitch, render)
│   ├── notes.py            # Conversion Hz <-> nota musical
│   ├── PitchDetector.py    # Detectores de pitch (autocorrelation, YIN)
│   ├── PitchCorrector.py   # Correccion de pitch
│   └── pipeline.py         # Pipeline reutilizable para offline y realtime
├── processors/
│   ├── offline.py          # Procesamiento offline profesional (CLI)
│   ├── realtime.py         # Auto-Tune en vivo con opciones avanzadas
│   └── autotune.py         # Orquestador de comandos
├── audio_capture.py        # Captura CLI clasica
├── gui_audio.py            # Interfaz visual profesional para monitoreo y control
└── requirements.txt
```

## Instalacion

```bash
pip install -r requirements.txt
```

## Uso rapido

### 1) Interfaz grafica

```bash
python gui_audio.py
```

Incluye:
- Control de metodo de deteccion (`autocorrelation` / `yin`)
- Strength, dry/wet y smoothing en vivo
- Key lock (AUTO o nota fija)
- Visualizacion de waveform + nivel + pitch/nota

### 2) Procesamiento offline pro

```bash
python processors/offline.py entrada.wav --strength 0.85 --method yin --dry-wet 0.9 --normalize
```

Opciones importantes:
- `--method autocorrelation|yin`
- `--strength 0..1`
- `--smooth 0..0.95`
- `--dry-wet 0..1`
- `--key C` `--octave 4` (bloqueo tonal)
- `--chunk` y `--hop` (calidad/rendimiento)
- `--json-report`

### 3) Tiempo real pro

```bash
python processors/realtime.py --duration 60 --method autocorrelation --strength 0.8 --dry-wet 1.0
```

Opciones importantes:
- `--list-devices`
- `--input-device` y `--output-device`
- `--duration` (`<=0` para indefinido)
- `--bypass` (monitor sin correccion)
- `--key` y `--octave`

### 4) Orquestador unico

```bash
python processors/autotune.py devices
python processors/autotune.py realtime -- --duration 30 --strength 0.7
python processors/autotune.py offline -- entrada.wav --method yin --json-report
```

## Mejoras tecnicas clave

- Pipeline unico para realtime/offline (menos duplicacion, mas consistencia)
- Configuracion tipada con `dataclasses`
- Render offline con overlap-add y ventana Hann para menos artefactos
- Reportes de procesamiento (frames totales, frames con voz, pitch promedio)
- Interfaz con controles de DSP en vivo

## Preparado para SaaS

La base actual ya separa capas para evolucionar a API:
- **Dominio DSP**: `core/*`
- **Orquestacion/servicios**: `processors/*`
- **Presentacion**: `gui_audio.py` o CLI

Siguiente paso natural para SaaS:
1. Exponer `core.pipeline.PitchProcessingPipeline` en una API REST (ejemplo: FastAPI).
2. Crear cola de jobs offline (RQ/Celery) para procesamiento asincrono.
3. Guardar metadata de jobs y resultados en DB.
4. Autenticacion, cuotas y plan de suscripcion.
