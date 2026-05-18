# SKILLS.md — Habilidades y Capacidades del Agente

Skills especificas para trabajar en el sistema de deteccion de somnolencia.

---

## skill: agregar-nuevo-detector

**Cuando usar:** El usuario quiere agregar un nuevo metodo de deteccion (IA, heuristico nuevo, sensor externo).

**Pasos:**
1. Crear `src/logic/base_detector.py` si no existe con `AbstractDetector`
2. Crear el nuevo detector en `src/logic/<nombre>_detector.py` extendiendo `AbstractDetector`
3. El metodo `detect()` debe retornar siempre el mismo contrato de dict
4. Registrar el nuevo detector en `main.py` con un flag CLI `--detector <nombre>`
5. Verificar que `logic/` nunca importe de `vision/` directamente — pasar los datos como parametros

**Contrato del dict de retorno:**
```python
{
    "state": str,           # NORMAL | DROWSY | VERY_DROWSY | HIGH_RISK | YAWN
    "alerts": list[str],
    "alert_triggered": bool,
    "eye_closed_frames": int,
    "yawn_count": int,
    "perclos": float,
    "eye_closed_duration_s": float,
    "confidence": float,    # 0.0..1.0 (para modelos IA)
}
```

---

## skill: integrar-modelo-tensorflow

**Cuando usar:** El usuario quiere reemplazar o complementar el detector heuristico con un modelo de TensorFlow/Keras.

**Pasos:**
1. Verificar que existe `src/logic/base_detector.py`
2. Crear `src/logic/ai_detector.py`
3. El modelo recibe como entrada landmarks normalizados (vector de 468*3=1404 floats) o recorte facial
4. Guardar pesos en `models/` con nombre versionado: `drowsiness_<tipo>_v<N>.h5`
5. Agregar `tensorflow>=2.13` a `requirements.txt`
6. En `main.py` agregar: `--detector ai` y `--model-path <ruta>`
7. Probar con video de prueba antes de camara en vivo

**Entrada recomendada al modelo:**
```python
# Vector de landmarks normalizados (x,y,z) de MediaPipe FaceMesh
landmarks_array = np.array([[lm.x, lm.y, lm.z] for lm in face_landmarks.landmark])
landmarks_flat = landmarks_array.flatten()  # shape: (1404,)
```

**Para LSTM (secuencia temporal):**
```python
# Acumular N frames antes de inferir
self._landmark_buffer.append(landmarks_flat)
if len(self._landmark_buffer) >= self.sequence_len:
    sequence = np.array(list(self._landmark_buffer))  # shape: (N, 1404)
    pred = self.model.predict(sequence[np.newaxis, ...])  # batch dim
```

---

## skill: agregar-nueva-alerta

**Cuando usar:** El usuario quiere agregar un nuevo tipo de alerta (nueva senal de somnolencia).

**Pasos:**
1. Si requiere nuevos datos visuales → agregar extraccion en el modulo correspondiente de `src/vision/`
2. Agregar logica de deteccion en `src/logic/drowsiness_detector.py` (metodo `detect()`)
3. Agregar el nombre de la alerta a `_alert_weights` en `main.py` con peso adecuado (1-3)
4. Si necesita banner visual → actualizar `src/alerts/alarm.py` metodo `draw_alert()`
5. Documentar la nueva alerta en este archivo

**Alertas existentes y sus pesos:**
| Alerta | Peso | Descripcion |
|--------|------|-------------|
| EYES_CLOSED | 3 | Ojos cerrados por duracion minima |
| LONG_BLINK | 2 | Parpadeo largo (> 0.5s) |
| YAWNING | 2 | Bostezo completo detectado |
| PERCLOS_HIGH | 2 | % tiempo ojos cerrados alto en 30s |
| HEAD_NOD | 2 | Cabeceo (microsleep) |
| EYE_RUB | 1 | Frotarse los ojos |
| HEAD_TILTED | 1 | Cabeza inclinada por tiempo minimo |
| MOUTH_COVERED | 1 | Mano cubriendo la boca |
| EYES_OCCLUDED | 1 | Mano cubriendo los ojos |
| FACE_LOST | 1 | Cara no detectada por > 0.8s |

---

## skill: calibrar-conductor

**Cuando usar:** El usuario quiere crear o actualizar un perfil de calibracion para un conductor especifico.

**Pasos:**
1. Grabar sesion de referencia (conductor alerta):
   ```
   python -m src.main --driver <nombre> --log-category calibration --log-tag bueno
   ```
2. Grabar sesion de bostezo:
   ```
   python -m src.main --driver <nombre> --log-category calibration --log-tag bostezo
   ```
3. Generar perfil:
   ```
   python -m src.calibrate --driver <nombre>
   ```
4. Usar el perfil generado:
   ```
   python -m src.main --profile data/logs/profiles/<nombre>.json
   ```

**Ubicacion de archivos:**
- Logs de calibracion: `data/logs/calibration/<conductor>/<tag>/`
- Perfiles JSON: `data/logs/profiles/<conductor>.json`

---

## skill: preparar-dataset-entrenamiento

**Cuando usar:** El usuario quiere preparar los logs existentes como dataset para entrenar un modelo IA.

**Datos disponibles:**
- `data/logs/calibration/<conductor>/<tag>/` — logs etiquetados por tipo de conducta
- Formato: JSON por linea con campos `ear`, `mar`, `pitch`, `yaw`, `roll`, `state`, `alerts`, `perclos`

**Tags y labels sugeridos:**
| Tag de calibracion | Label de entrenamiento |
|-------------------|----------------------|
| `bueno` | 0 (NORMAL) |
| `bostezo` | 1 (YAWN) |
| `microsleep` | 2 (VERY_DROWSY) |
| `cabeceo` | 2 (VERY_DROWSY) |

**Script a crear:** `scripts/prepare_dataset.py`
```python
# Lee logs de data/logs/calibration/
# Normaliza landmarks por cara (bounding box)
# Genera ventanas temporales de N frames
# Exporta a data/dataset/X_train.npy, y_train.npy
```

---

## skill: ejecutar-sistema

**Cuando usar:** El usuario quiere saber como arrancar el sistema en distintos modos.

```bash
# Modo basico con camara
python -m src.main

# Con video de prueba
python -m src.main --video ruta/video.mp4

# Con deteccion de manos (eye rub) y sin malla facial
python -m src.main --hands --mesh none

# Con perfil calibrado de conductor
python -m src.main --profile data/logs/profiles/conductor1.json

# Modo calibracion
python -m src.main --driver juan --log-category calibration --log-tag bueno

# Con GPS y API
python -m src.main --gps --api

# Con stream IP
python -m src.main --stream rtsp://192.168.1.100:554/stream
```

**Controles en vivo:**
| Tecla | Accion |
|-------|--------|
| ESC / q | Salir |
| s | Guardar snapshot |
| r | Resetear detector |

---

## skill: depurar-falsos-positivos

**Cuando usar:** El sistema genera demasiadas alertas falsas.

**Checklist:**
1. Ajustar `--ear` hacia abajo (ej: 0.20) si ojos pequenos o con gafas
2. Ajustar `--mar` hacia arriba (ej: 0.75) si muchos bostezos falsos
3. Aumentar `--head-tilt-min-s` (ej: 1.5) si HEAD_TILTED muy sensible
4. Aumentar `--risk-score-th` (ej: 10) si HIGH_RISK muy frecuente
5. Usar perfil calibrado: ejecutar calibracion con `--log-tag bueno` y generar perfil
6. Revisar iluminacion: MediaPipe pierde precision con contraluz o baja luz

**Flags de ajuste fino:**
```
--ear 0.20          # Umbral EAR mas bajo para caras pequenas
--mar 0.75          # Umbral MAR mas alto
--head-pitch 30     # Mas tolerancia en pitch
--perclos-th 0.5    # PERCLOS menos sensible
--risk-score-th 10  # Score mas alto para HIGH_RISK
--risk-window-s 90  # Ventana mas larga
```
