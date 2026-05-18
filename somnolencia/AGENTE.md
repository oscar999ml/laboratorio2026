# AGENTE.md — Sistema de Deteccion de Somnolencia

Guia de contexto para agentes de IA (OpenCode, Copilot, Cursor, etc.) que trabajen en este proyecto.

---

## Que es este proyecto

Sistema en tiempo real de deteccion de somnolencia en conductores. Captura video (camara, archivo o stream), analiza landmarks faciales con MediaPipe, calcula metricas como EAR/MAR/PERCLOS y pose de cabeza, y dispara alertas de audio/visuales cuando detecta fatiga.

Lenguaje: **Python 3.10+**. Todo el codigo y comentarios estan en **espanol**.

---

## Arquitectura actual

```
src/
├── main.py                        # Orquestador: DrowsinessSystem (loop principal)
├── calibrate.py                   # Herramienta offline de calibracion por conductor
├── vision/                        # Capa de percepcion (solo extrae datos, no decide)
│   ├── face_detector.py           # MediaPipe FaceMesh → landmarks
│   ├── eye_tracker.py             # EAR (Eye Aspect Ratio)
│   ├── mouth_tracker.py           # MAR (Mouth Aspect Ratio)
│   ├── head_pose.py               # Pitch / Yaw / Roll
│   ├── hands_tracker.py           # Landmarks de manos
│   └── pose_tracker.py            # Pose corporal
├── logic/
│   └── drowsiness_detector.py     # Maquina de estados: NORMAL→DROWSY→VERY_DROWSY→HIGH_RISK
├── alerts/
│   └── alarm.py                   # Audio (pygame) + banners visuales en pantalla
├── gps/
│   └── gps_reader.py              # Lectura serial GPS (COM3)
├── communication/
│   └── api_client.py              # Cliente REST (reporte background de eventos)
└── utils/
    └── logger.py                  # Logging estructurado a data/logs/
```

### Flujo por frame

```
Camera/Video/Stream
       ↓
  FaceDetector (MediaPipe FaceMesh)
       ↓
  EyeTracker → EAR
  MouthTracker → MAR        ← vision/ solo mide
  HeadPoseDetector → P/Y/R
  HandsTracker → oclusiones, eye_rub
       ↓
  DrowsinessDetector.detect()      ← logic/ decide el estado
       ↓
  AlarmSystem.trigger / draw_alert  ← alerts/ actua
       ↓
  Logger + APIClient               ← utils/ + communication/ reportan
```

---

## Arquitectura objetivo: escalable con IA

La arquitectura esta disenada con una **separacion clara entre percepcion (vision/), decision (logic/) y accion (alerts/)**.
Esta separacion es la clave para escalar a modelos de IA sin romper el resto del sistema.

### Patron de integracion de modelos IA

La capa `logic/` es el punto de extension. Se puede agregar un `ModeloIA` como nuevo detector que convive o reemplaza al detector heuristico:

```
logic/
├── drowsiness_detector.py         # Detector heuristico actual (EAR/MAR/PERCLOS)
├── ai_detector.py                 # NUEVO: detector basado en modelo de IA
├── fusion_detector.py             # NUEVO: fusiona heuristico + IA (ensemble)
└── base_detector.py               # NUEVO: interfaz comun AbstractDetector
```

#### Interfaz comun (base_detector.py)

```python
from abc import ABC, abstractmethod

class AbstractDetector(ABC):
    @abstractmethod
    def detect(self, **kwargs) -> dict:
        """
        Retorna siempre el mismo contrato:
        {
            "state": str,       # NORMAL | DROWSY | VERY_DROWSY | HIGH_RISK | YAWN
            "alerts": list,
            "alert_triggered": bool,
            "confidence": float,    # 0.0..1.0 (nuevo campo para modelos IA)
            ...
        }
        """
        pass

    @abstractmethod
    def reset(self):
        pass
```

Tanto `DrowsinessDetector` como `AIDetector` implementan esta interfaz.
`main.py` llama siempre a `detector.detect(...)` sin saber si es heuristico o IA.

---

## Roadmap de integracion con TensorFlow / PyTorch

### Fase 1 — Preparacion (actual → sin romper nada)

- [ ] Crear `logic/base_detector.py` con `AbstractDetector`
- [ ] Hacer que `DrowsinessDetector` extienda `AbstractDetector`
- [ ] Agregar campo `confidence` al dict de retorno del detector heuristico (valor fijo 1.0)
- [ ] Agregar carpeta `models/` para guardar pesos de modelos (.h5, .tflite, .pt, .onnx)
- [ ] Agregar al logger el campo `confidence` en los logs de estado

### Fase 2 — Detector IA paralelo

Implementar `logic/ai_detector.py`:

```python
# Opciones de framework
import tensorflow as tf          # TensorFlow / Keras
# import torch                   # PyTorch
# import onnxruntime as ort      # ONNX (framework-agnostico, recomendado para produccion)

class AIDetector(AbstractDetector):
    def __init__(self, model_path: str, threshold: float = 0.5):
        self.model = tf.keras.models.load_model(model_path)
        self.threshold = threshold

    def detect(self, landmarks_array=None, frame=None, **kwargs) -> dict:
        # El modelo puede recibir:
        # a) Vector de landmarks normalizados (ligero, rapido)
        # b) Recorte de cara (frame crop) como imagen
        # c) Secuencia temporal de landmarks (LSTM/Transformer)
        ...
```

**Tipos de modelo recomendados segun precision/velocidad:**

| Modelo | Entrada | Precision | Velocidad | Libreria |
|--------|---------|-----------|-----------|---------|
| MLP sobre landmarks | 468 puntos (x,y,z) | Media | Muy rapida | TF/Keras |
| CNN sobre recorte facial | Imagen 64x64 | Alta | Rapida | TF/Keras |
| LSTM sobre secuencia temporal | N frames de landmarks | Muy alta | Media | TF/Keras |
| Transformer temporal | N frames de landmarks | Maxima | Lenta | PyTorch |
| ONNX exportado | Cualquiera | Alta | Muy rapida | ONNX Runtime |

**Recomendacion inicial:** LSTM sobre vectores de landmarks normalizados.
- No requiere imagen cruda (privacidad)
- Captura el patron temporal de somnolencia (no solo un frame)
- Exportable a ONNX para inferencia en edge/embebido

### Fase 3 — Fusion heuristico + IA

```python
# logic/fusion_detector.py
class FusionDetector(AbstractDetector):
    def __init__(self, heuristic: AbstractDetector, ai: AbstractDetector, ai_weight=0.6):
        self.heuristic = heuristic
        self.ai = ai
        self.ai_weight = ai_weight

    def detect(self, **kwargs) -> dict:
        h = self.heuristic.detect(**kwargs)
        a = self.ai.detect(**kwargs)
        # Combinar scores ponderados
        # Si IA tiene alta confianza, prioriza IA
        # Si IA tiene baja confianza (cara oculta), prioriza heuristico
        ...
```

### Fase 4 — Entrenamiento con datos propios

Los logs generados en `data/logs/calibration/<conductor>/<tag>/` son la base del dataset.

Tags de calibracion definidos:
- `bueno` → conductor alerta (label: NORMAL)
- `bostezo` → bostezando activamente (label: YAWN)
- Se pueden agregar: `microsleep`, `cabeceo`, `parpadeo_lento`

Pipeline de entrenamiento sugerido:
```
data/logs/calibration/ → scripts/prepare_dataset.py → data/dataset/
data/dataset/ → scripts/train_model.py → models/drowsiness_lstm_v1.h5
models/*.h5 → scripts/export_onnx.py → models/*.onnx
models/*.onnx → logic/ai_detector.py (inferencia en produccion)
```

---

## Convenciones del proyecto

- Todo el codigo en **espanol** (variables, comentarios, prints)
- Logs estructurados como JSON en `data/logs/`
- Perfiles de calibracion en `data/logs/profiles/<conductor>.json`
- Pesos de modelos en `models/` (no versionar archivos grandes, usar .gitignore)
- Umbrales siempre configurables via CLI o perfil JSON (nunca hardcoded fijos)
- Cada modulo de `vision/` solo mide, nunca decide el estado
- Solo `logic/` decide el estado del conductor
- Solo `alerts/` actua sobre el estado

---

## Dependencias actuales

```
opencv-python >= 4.8
mediapipe >= 0.10
numpy >= 1.24
pygame >= 2.5
pyserial >= 3.5
requests >= 2.31
```

### Dependencias futuras (IA)

```
# Anadir segun fase elegida:
tensorflow >= 2.13          # o tensorflow-lite para edge
torch >= 2.0                # alternativa PyTorch
onnxruntime >= 1.16         # recomendado para produccion/edge
scikit-learn >= 1.3         # preprocesamiento y metricas
pandas >= 2.0               # manipulacion de dataset de logs
```

---

## Archivos clave para entender el sistema rapidamente

| Archivo | Por que leerlo primero |
|---------|----------------------|
| `src/main.py` | Loop principal y orquestacion de todos los modulos |
| `src/logic/drowsiness_detector.py` | Toda la logica de decision de somnolencia |
| `src/vision/eye_tracker.py` | Como se calcula EAR |
| `src/utils/logger.py` | Formato de los logs (input para entrenamiento futuro) |
| `data/logs/` | Datos reales generados en sesiones |

---

## Estado del proyecto

- [x] Deteccion heuristica completa (EAR, MAR, PERCLOS, head pose, eye rub)
- [x] Calibracion por conductor con perfiles JSON
- [x] Logging estructurado para dataset futuro
- [x] GPS + API REST opcionales
- [ ] Interfaz AbstractDetector
- [ ] Detector IA (TensorFlow/ONNX)
- [ ] Pipeline de entrenamiento con datos propios
- [ ] Fusion heuristico + IA
- [ ] Exportacion a TFLite/ONNX para edge computing
