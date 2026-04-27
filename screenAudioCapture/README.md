# Screen Audio Capture (Production Ready)

Grabador profesional de pantalla + audio en tiempo real para Windows, usando FFmpeg (backend en C para mejor rendimiento y acceso al sistema operativo).

## Objetivos tecnicos

- Captura de video en tiempo real.
- Mejor sincronizacion audio/video con timestamps del sistema.
- Arquitectura limpia con CLI, configuracion y logging.
- Cierre seguro para evitar archivos corruptos.

## Requisitos

- Windows 10/11
- FFmpeg instalado y disponible en PATH

Verifica:

```powershell
ffmpeg -version
```

## Uso rapido

### 1) Grabar (default)

```powershell
python main.py
```

### 2) Grabar con parametros

```powershell
python main.py record --fps 60 --video-preset veryfast --video-crf 20
```

### 3) Grabar por tiempo fijo

```powershell
python main.py record --duration 120
```

### 4) Listar dispositivos de audio (dshow)

```powershell
python main.py list-devices
```

### 5) Elegir backend y dispositivo

WASAPI (recomendado como inicio):

```powershell
python main.py record --audio-backend wasapi --audio-device default
```

DirectShow (si necesitas un dispositivo concreto):

```powershell
python main.py record --audio-backend dshow --audio-device "Stereo Mix (Realtek(R) Audio)"
```

## Flags importantes

- `--fps`: tasa de captura de video.
- `--duration`: segundos de grabacion.
- `--audio-backend`: `wasapi` o `dshow`.
- `--audio-device`: nombre de dispositivo.
- `--no-audio`: desactiva audio.
- `--hide-mouse`: oculta puntero.

## Notas de rendimiento y sincronizacion

- FFmpeg trabaja en C, con manejo eficiente de memoria y buffers del sistema.
- Se usan colas internas (`thread_queue_size`) para reducir perdidas de frames.
- Se aplican timestamps de reloj del sistema (`use_wallclock_as_timestamps`) y resample async para evitar drift de audio.
- Codec de salida: H.264 (`libx264`) + AAC, con preset rapido para tiempo real.

## Consejos para entorno profesional

- Cierra apps pesadas (juegos, renders) para minimizar drop frames.
- Usa SSD para salida de video.
- Si notas retraso, baja `--fps` a 30 o sube preset a `superfast`.
- Para latencia minima, mantente en resolucion nativa de escritorio y evita escalados adicionales.
