import sys
import os

# Only patch sys.path when running as a script (not as a module).
if not __package__:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import time
from datetime import datetime
from collections import deque, Counter
import json

from src.vision.face_detector import FaceDetector
from src.vision.eye_tracker import EyeTracker
from src.vision.mouth_tracker import MouthTracker
from src.vision.head_pose import HeadPoseDetector
from src.vision.hands_tracker import HandsTracker
from src.vision.pose_tracker import PoseTracker
from src.logic.drowsiness_detector import DrowsinessDetector
from src.alerts.alarm import AlarmSystem
from src.gps.gps_reader import GPSReader
from src.communication.api_client import APIClient
from src.utils.logger import Logger


class DrowsinessSystem:
    def __init__(self, camera_index=0, video_path=None, stream_url=None, loop_video=False,
                 gps_enabled=False, api_enabled=False,
                 ear_threshold=0.25, mar_threshold=0.6,
                 hands_enabled=False, pose_enabled=False,
                 mesh_style="tesselation",
                 log_category="history",
                 driver=None,
                 log_tag=None,
                 alert_window_s=60.0,
                 high_risk_score_threshold=6,
                 head_pitch_threshold=20.0,
                 head_yaw_threshold=20.0,
                 head_roll_threshold=20.0,
                 head_tilt_min_duration_s=0.7,
                 perclos_threshold=0.4):
        self.camera_index = camera_index
        self.video_path = video_path
        self.stream_url = stream_url
        self.loop_video = loop_video
        self.gps_enabled = gps_enabled
        self.api_enabled = api_enabled
        self.source_type = "unknown"
        self.hands_enabled = hands_enabled
        self.pose_enabled = pose_enabled
        self.mesh_style = mesh_style

        self.logger = Logger(category=log_category, driver=driver, tag=log_tag)
        self._log_source()
        self.logger.log_system_start(camera_index, gps_enabled)
        
        self.face_detector = FaceDetector()
        self.eye_tracker = EyeTracker(ear_threshold=ear_threshold)
        self.mouth_tracker = MouthTracker(mar_threshold=mar_threshold)
        self.head_pose_detector = HeadPoseDetector()
        self.drowsiness_detector = DrowsinessDetector(
            ear_threshold=ear_threshold,
            mar_threshold=mar_threshold,
            head_pitch_threshold=head_pitch_threshold,
            head_yaw_threshold=head_yaw_threshold,
            head_roll_threshold=head_roll_threshold,
            head_tilt_min_duration_s=head_tilt_min_duration_s,
            perclos_threshold=perclos_threshold,
        )
        self.alarm = AlarmSystem(sound_enabled=True, visual_enabled=True)

        self.hands_tracker = HandsTracker() if self.hands_enabled else None
        self.pose_tracker = PoseTracker() if self.pose_enabled else None
        
        self.gps = None
        if self.gps_enabled:
            self.gps = GPSReader(port="COM3", baudrate=9600)
            if self.gps.connect():
                self.logger.info("GPS conectado exitosamente")
            else:
                self.logger.warning("No se pudo conectar al GPS")
        
        self.api = None
        if self.api_enabled:
            self.api = APIClient(base_url="http://localhost:5000/api")
            if self.api.connect():
                self.logger.info("API conectada exitosamente")
                self.api.start_background_send()
            else:
                self.logger.warning("No se pudo conectar a la API")
        
        self.start_time = None
        self.frame_count = 0
        self.fps = 0
        self._last_frame_time = None
        self.cap = None

        # Face/occlusion robustness
        self._last_face_landmarks = None
        self._last_face_seen_time = None
        self._face_lost_s = 0.0
        self._face_hold_s = 0.8

        # Alert aggregation window
        self._alert_events = deque()
        self._alert_window_s = float(alert_window_s)
        self._high_risk_score_threshold = int(high_risk_score_threshold)
        self._last_summary_log_time = None

        self._alert_weights = {
            "EYES_CLOSED": 3,
            "LONG_BLINK": 2,
            "YAWNING": 2,
            "PERCLOS_HIGH": 2,
            "HEAD_NOD": 2,
            "EYE_RUB": 1,
            "HEAD_TILTED": 1,
            "MOUTH_COVERED": 1,
            "EYES_OCCLUDED": 1,
            "FACE_LOST": 1,
        }

        # Track how long the current alert/state has been active (seconds)
        self._active_keys_since = {}

    def _update_active_durations(self, now_s: float, active_keys) -> dict:
        active_set = set(active_keys or [])

        # Start timers for newly active keys
        for key in active_set:
            if key not in self._active_keys_since:
                self._active_keys_since[key] = now_s

        # Clear timers for keys that are no longer active
        for key in list(self._active_keys_since.keys()):
            if key not in active_set:
                del self._active_keys_since[key]

        return {key: now_s - since for key, since in self._active_keys_since.items()}

    def _get_eye_centers_px(self, face_landmarks, image_shape):
        h, w, _ = image_shape

        def _center(indices):
            xs = []
            ys = []
            for idx in indices:
                lm = face_landmarks.landmark[idx]
                xs.append(lm.x * w)
                ys.append(lm.y * h)
            if not xs:
                return None
            return (int(sum(xs) / len(xs)), int(sum(ys) / len(ys)))

        left_center = _center(self.eye_tracker.LEFT_EYE_INDICES)
        right_center = _center(self.eye_tracker.RIGHT_EYE_INDICES)
        return left_center, right_center

    def _get_mouth_center_px(self, face_landmarks, image_shape):
        h, w, _ = image_shape
        # Minimal, stable mouth landmarks: upper(13), lower(14), corners(61,291)
        indices = [13, 14, 61, 291]
        xs = []
        ys = []
        for idx in indices:
            lm = face_landmarks.landmark[idx]
            xs.append(lm.x * w)
            ys.append(lm.y * h)
        if not xs:
            return None
        return (int(sum(xs) / len(xs)), int(sum(ys) / len(ys)))

    def _near_any(self, point, points, threshold_px_sq):
        if point is None:
            return False
        px, py = point
        for (x, y) in points:
            dx = x - px
            dy = y - py
            if dx * dx + dy * dy <= threshold_px_sq:
                return True
        return False

    def _hand_points(self, hand_landmarks, image_shape):
        # Fingertips + index MCP (more robust than only index tip)
        ids = [4, 5, 8, 12, 16, 20]
        return HandsTracker.get_keypoints_pixels(hand_landmarks, image_shape, landmark_ids=ids)

    def _detect_occlusions(self, hands_landmarks, face_landmarks, image_shape):
        if not hands_landmarks or not face_landmarks:
            return []

        left_eye, right_eye = self._get_eye_centers_px(face_landmarks, image_shape)
        mouth_center = self._get_mouth_center_px(face_landmarks, image_shape)
        if left_eye is None or right_eye is None or mouth_center is None:
            return []

        threshold_px = max(25, int(min(image_shape[0], image_shape[1]) * 0.05))
        threshold_px_sq = threshold_px * threshold_px

        eyes_occluded = False
        mouth_covered = False

        for hand in hands_landmarks:
            pts = self._hand_points(hand, image_shape)
            if not pts:
                continue
            if self._near_any(left_eye, pts, threshold_px_sq) or self._near_any(right_eye, pts, threshold_px_sq):
                eyes_occluded = True
            if self._near_any(mouth_center, pts, threshold_px_sq):
                mouth_covered = True

        alerts = []
        if eyes_occluded:
            alerts.append("EYES_OCCLUDED")
        if mouth_covered:
            alerts.append("MOUTH_COVERED")
        return alerts

    def _update_alert_window(self, now_s, alerts):
        if not alerts:
            return 0, 0, {}
        if self._alert_window_s <= 0:
            return 0, 0, {}

        for a in set(alerts):
            self._alert_events.append((now_s, a))

        cutoff = now_s - self._alert_window_s
        while self._alert_events and self._alert_events[0][0] < cutoff:
            self._alert_events.popleft()

        counts = Counter(a for _, a in self._alert_events)
        score = sum(int(counts[a]) * int(self._alert_weights.get(a, 1)) for a in counts)
        return len(self._alert_events), score, dict(counts)

    def _is_eye_rub(self, hands_landmarks, face_landmarks, image_shape):
        """Heuristic: index fingertip close to either eye center."""
        if not hands_landmarks or not face_landmarks:
            return False

        left_eye, right_eye = self._get_eye_centers_px(face_landmarks, image_shape)
        if left_eye is None or right_eye is None:
            return False

        threshold_px = max(25, int(min(image_shape[0], image_shape[1]) * 0.04))
        threshold_px_sq = threshold_px * threshold_px

        # MediaPipe Hands index fingertip id = 8
        for hand in hands_landmarks:
            pts = HandsTracker.get_keypoints_pixels(hand, image_shape, landmark_ids=[8])
            if not pts:
                continue
            x, y = pts[0]
            for (ex, ey) in (left_eye, right_eye):
                dx = x - ex
                dy = y - ey
                if dx * dx + dy * dy <= threshold_px_sq:
                    return True
        return False

    def _log_source(self):
        if self.video_path:
            self.source_type = "video"
            if os.path.exists(self.video_path):
                print(f"Fuente: Video ({self.video_path})")
            else:
                print(f"ERROR: Video no encontrado: {self.video_path}")
        elif self.stream_url:
            self.source_type = "stream"
            print(f"Fuente: Stream ({self.stream_url})")
        else:
            self.source_type = "camera"
            print(f"Fuente: Camara ({self.camera_index})")

    def _init_capture(self):
        if self.video_path and os.path.exists(self.video_path):
            self.cap = cv2.VideoCapture(self.video_path)
        elif self.stream_url:
            self.cap = cv2.VideoCapture(self.stream_url)
        else:
            self.cap = cv2.VideoCapture(self.camera_index)

        if not self.cap.isOpened():
            self.logger.error(f"No se pudo abrir la fuente de entrada: {self.source_type}")
            return False
        return True

    def run(self) -> int:
        """Run the live/video drowsiness detection loop.

        Returns:
            int: 0 on a normal/expected stop (ESC, window closed, Ctrl+C), 1 on errors.
        """

        if not self._init_capture():
            msg = f"No se pudo abrir la fuente de entrada: {self.source_type}"
            print(f"ERROR: {msg}")
            self.logger.error(msg)
            return 1

        self.start_time = time.time()
        prev_time = time.time()

        stop_reason: str | None = None
        exit_code = 0

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    if self.loop_video and self.source_type == "video":
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = self.cap.read()
                        if not ret:
                            stop_reason = "Video terminado (loop)"
                            break
                    else:
                        self.logger.error("Error al leer frame o video terminado")
                        stop_reason = "Error al leer frame o video terminado"
                        exit_code = 1
                        break

                self.frame_count += 1
                current_time = time.time()
                if self._last_frame_time is None:
                    self._last_frame_time = current_time
                dt = current_time - self._last_frame_time
                self._last_frame_time = current_time
                if current_time - prev_time >= 1.0:
                    self.fps = self.frame_count
                    self.frame_count = 0
                    prev_time = current_time

                # Optional body/hands detection (for early signals + visualization)
                pose_landmarks = self.pose_tracker.detect(frame) if self.pose_tracker else None
                hands_landmarks = self.hands_tracker.detect(frame) if self.hands_tracker else []

                landmarks = self.face_detector.detect(frame)

                annotated_frame = frame

                now_s = time.time()

                if landmarks:
                    self._last_face_landmarks = landmarks
                    self._last_face_seen_time = now_s
                    self._face_lost_s = 0.0
                else:
                    if dt is not None and dt > 0:
                        self._face_lost_s += dt

                if landmarks:
                    ear = self.eye_tracker.get_eye_ratio(landmarks, frame.shape)
                    mar = self.mouth_tracker.get_mouth_ratio(landmarks, frame.shape)
                    pitch, yaw, roll = self.head_pose_detector.get_head_pose(landmarks, frame.shape)

                    eye_rub = self._is_eye_rub(hands_landmarks, landmarks, frame.shape) if self.hands_tracker else False

                    occlusion_alerts = self._detect_occlusions(hands_landmarks, landmarks, frame.shape) if self.hands_tracker else []

                    # If mouth/eyes are covered, suppress MAR/EAR-based signals to avoid false events.
                    ear_for_detector = None if "EYES_OCCLUDED" in occlusion_alerts else ear
                    mar_for_detector = None if "MOUTH_COVERED" in occlusion_alerts else mar

                    detection_result = self.drowsiness_detector.detect(
                        ear=ear_for_detector,
                        mar=mar_for_detector,
                        pitch=pitch,
                        yaw=yaw,
                        roll=roll,
                        dt=dt,
                        eye_rub=eye_rub,
                    )

                    if occlusion_alerts:
                        detection_result["alerts"].extend(occlusion_alerts)

                    self.logger.log_drowsiness_state(
                        detection_result["state"],
                        ear, mar, pitch, yaw, roll
                    )

                    # Aggregate alerts in a rolling window to escalate risk
                    _, window_score, window_counts = self._update_alert_window(now_s, detection_result.get("alerts"))
                    high_risk = window_score >= self._high_risk_score_threshold

                    if high_risk:
                        detection_result["state"] = "HIGH_RISK"
                        if "HIGH_RISK" not in detection_result["alerts"]:
                            detection_result["alerts"].append("HIGH_RISK")

                    # Duration counters for banner: alerts + current state
                    active_keys = list(detection_result.get("alerts") or []) + [f"STATE:{detection_result['state']}"]
                    active_durations_s = self._update_active_durations(now_s, active_keys)

                    if detection_result["alert_triggered"] or high_risk:
                        self.alarm.trigger_alarm(alert_type=detection_result["state"])

                    # Periodic summary into logs (helps calibration analysis)
                    if self._last_summary_log_time is None:
                        self._last_summary_log_time = now_s
                    if now_s - self._last_summary_log_time >= 5.0:
                        self.logger.log_interval_summary(
                            self._alert_window_s,
                            window_counts,
                            risk_score=window_score,
                            risk_level=("HIGH" if high_risk else "OK"),
                        )
                        self._last_summary_log_time = now_s

                    if self.mesh_style != "none":
                        if self.mesh_style == "contours" and hasattr(self.face_detector.mp_face_mesh, "FACEMESH_CONTOURS"):
                            annotated_frame = self.face_detector.draw_landmarks(
                                annotated_frame,
                                landmarks,
                                connections=self.face_detector.mp_face_mesh.FACEMESH_CONTOURS,
                            )
                        else:
                            annotated_frame = self.face_detector.draw_landmarks(annotated_frame, landmarks)

                    annotated_frame = self.eye_tracker.draw_eyes(annotated_frame, landmarks)
                    annotated_frame = self.mouth_tracker.draw_mouth(annotated_frame, landmarks)

                    if self.pose_tracker and pose_landmarks:
                        annotated_frame = self.pose_tracker.draw_pose(annotated_frame, pose_landmarks)
                    if self.hands_tracker and hands_landmarks:
                        annotated_frame = self.hands_tracker.draw_hands(annotated_frame, hands_landmarks)

                    annotated_frame = self.alarm.draw_alert(
                        annotated_frame,
                        detection_result["alerts"],
                        detection_result["state"],
                        risk_score=window_score,
                        risk_score_threshold=self._high_risk_score_threshold,
                        active_durations_s=active_durations_s,
                    )

                    annotated_frame = self._draw_info(
                        annotated_frame,
                        ear=ear,
                        mar=mar,
                        pitch=pitch,
                        yaw=yaw,
                        roll=roll,
                        detection_result=detection_result,
                        ear_used=ear_for_detector,
                        mar_used=mar_for_detector,
                        occlusion_alerts=occlusion_alerts,
                        window_score=window_score,
                    )

                    if self.gps and self.gps.is_valid():
                        self.logger.log_gps_data(
                            self.gps.latitude,
                            self.gps.longitude,
                            self.gps.speed,
                            self.gps.valid
                        )

                    if self.api and detection_result["alerts"]:
                        gps_data = self.gps.get_location() if self.gps else {}
                        self.api.send_drowsiness_event({
                            "state": detection_result["state"],
                            "alerts": detection_result["alerts"],
                            "eye_closed_frames": detection_result["eye_closed_frames"],
                            "yawn_count": detection_result["yawn_count"],
                            "location": gps_data
                        })
                else:
                    # If FaceMesh is lost but we saw a face very recently, attempt occlusion inference
                    occlusion_alerts = []
                    if (
                        self.hands_tracker
                        and self._last_face_landmarks is not None
                        and self._last_face_seen_time is not None
                        and (now_s - self._last_face_seen_time) <= self._face_hold_s
                    ):
                        occlusion_alerts = self._detect_occlusions(hands_landmarks, self._last_face_landmarks, frame.shape)

                    face_lost_alerts = []
                    if self._face_lost_s >= 0.8:
                        face_lost_alerts.append("FACE_LOST")

                    combined = occlusion_alerts + face_lost_alerts
                    _, window_score, window_counts = self._update_alert_window(now_s, combined)
                    high_risk = window_score >= self._high_risk_score_threshold

                    if combined:
                        # Log alerts even when face is missing
                        self.logger.log_event("FACE_MISSING", {"alerts": combined, "face_lost_s": round(self._face_lost_s, 2)})
                    if high_risk:
                        self.alarm.trigger_alarm(alert_type="HIGH_RISK")

                    if self.pose_tracker and pose_landmarks:
                        annotated_frame = self.pose_tracker.draw_pose(annotated_frame, pose_landmarks)
                    if self.hands_tracker and hands_landmarks:
                        annotated_frame = self.hands_tracker.draw_hands(annotated_frame, hands_landmarks)
                    cv2.putText(annotated_frame, "No se detecta rostro", (20, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

                    # Show occlusion hints on-screen
                    if occlusion_alerts:
                        cv2.putText(
                            annotated_frame,
                            f"Oclusion: {', '.join(occlusion_alerts)}",
                            (20, 90),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,
                            (0, 255, 255),
                            2,
                        )
                    if face_lost_alerts:
                        cv2.putText(
                            annotated_frame,
                            f"FACE_LOST: {self._face_lost_s:.1f}s",
                            (20, 125),
                            cv2.FONT_HERSHEY_SIMPLEX,
                            0.7,
                            (0, 0, 255),
                            2,
                        )

                cv2.imshow("Deteccion de Somnolencia", annotated_frame)

                # Process window events (required for X button to be detected reliably on Windows)
                key = cv2.waitKey(1) & 0xFF
                if key in (27, ord('q')):
                    stop_reason = "Salida por ESC" if key == 27 else "Salida por q"
                    break

                # If user closes the window via the X button
                try:
                    visible = cv2.getWindowProperty("Deteccion de Somnolencia", cv2.WND_PROP_VISIBLE)
                except cv2.error:
                    visible = 0
                if visible < 1:
                    stop_reason = "Ventana cerrada (X)"
                    break

                if key == ord('s'):
                    self._take_snapshot(frame)

                if key == ord('r'):
                    self.drowsiness_detector.reset()
                    self.logger.info("Sistema reseteado")

        except KeyboardInterrupt:
            self.logger.info("Ejecucion interrumpida por el usuario (Ctrl+C)")
            stop_reason = "Interrumpido por Ctrl+C"
            exit_code = 0
        except Exception as e:
            self.logger.exception(f"Fallo inesperado en el loop principal: {e}")
            stop_reason = f"Fallo inesperado: {e}"
            exit_code = 1

        finally:
            self.stop()

        if stop_reason:
            print(f"Salida: {stop_reason}")

        return exit_code

    def _draw_info(
        self,
        frame,
        ear,
        mar,
        pitch,
        yaw,
        roll,
        detection_result,
        ear_used=None,
        mar_used=None,
        occlusion_alerts=None,
        window_score=None,
    ):
        h, w, _ = frame.shape
        
        info_y = h - 140
        occlusion_alerts = occlusion_alerts or []

        if ear_used is None:
            ear_txt = f"EAR: -- (ocluido)  thr:{self.eye_tracker.ear_threshold:.3f}"
        else:
            ear_txt = f"EAR: {ear_used:.3f}  thr:{self.eye_tracker.ear_threshold:.3f}"
        if mar_used is None:
            mar_txt = f"MAR: -- (ocluido)  thr:{self.mouth_tracker.mar_threshold:.3f}"
        else:
            mar_txt = f"MAR: {mar_used:.3f}  thr:{self.mouth_tracker.mar_threshold:.3f}"

        cv2.putText(frame, ear_txt, (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, mar_txt, (10, info_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

        cv2.putText(
            frame,
            f"Head abs P/Y/R: {abs(pitch):.1f}/{abs(yaw):.1f}/{abs(roll):.1f}  thr:{self.drowsiness_detector.head_pitch_threshold:.1f}/{self.drowsiness_detector.head_yaw_threshold:.1f}/{self.drowsiness_detector.head_roll_threshold:.1f}",
            (10, info_y + 40),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
        )

        cv2.putText(frame, f"Estado: {detection_result['state']}", 
                   (10, info_y + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

        alerts = detection_result.get("alerts") or []
        perclos = detection_result.get("perclos", 0.0)
        alerts_text = "Alertas: " + (", ".join(alerts) if alerts else "-")
        if window_score is not None:
            alerts_text += f"  | score:{int(window_score)}/{int(self._high_risk_score_threshold)}"
        if occlusion_alerts:
            alerts_text += f"  | oclusion:{','.join(occlusion_alerts)}"

        cv2.putText(frame, alerts_text, (10, info_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(
            frame,
            f"PERCLOS(30s): {perclos:.2f}  thr:{self.drowsiness_detector.perclos_threshold:.2f}",
            (10, info_y + 100),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.45,
            (255, 255, 255),
            1,
        )
        
        return frame

    def _take_snapshot(self, frame):
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"snapshot_{timestamp}.jpg"
        cv2.imwrite(filename, frame)
        self.logger.info(f"Snapshot guardada: {filename}")

    def stop(self):
        if self.start_time:
            runtime = time.time() - self.start_time
            self.logger.log_system_stop(runtime)
        
        self.alarm.stop_alarm()
        
        if self.cap:
            self.cap.release()
        
        if self.gps:
            self.gps.disconnect()
        
        if self.api:
            self.api.close()
        
        cv2.destroyAllWindows()
        self.logger.info("Sistema detenido correctamente")


def main() -> int:
    import argparse

    parser = argparse.ArgumentParser(description="Sistema de Deteccion de Somnolencia")
    parser.add_argument("-c", "--camera", type=int, default=0, help="Indice de la camara (default: 0)")
    parser.add_argument("-v", "--video", type=str, help="Ruta a archivo de video de prueba")
    parser.add_argument("-s", "--stream", type=str, help="URL de stream (rtsp://, http://, etc)")
    parser.add_argument("--loop", action="store_true", help="Repetir video en loop")
    parser.add_argument("--gps", action="store_true", help="Habilitar GPS")
    parser.add_argument("--api", action="store_true", help="Habilitar conexion a API")
    parser.add_argument("--ear", type=float, default=0.25, help="Umbral EAR (default: 0.25)")
    parser.add_argument("--mar", type=float, default=0.6, help="Umbral MAR (default: 0.6)")
    parser.add_argument("--hands", action="store_true", help="Habilitar deteccion de manos (para frotarse ojos)")
    parser.add_argument("--pose", action="store_true", help="Habilitar deteccion de cuerpo (pose)")
    parser.add_argument(
        "--mesh",
        type=str,
        default="tesselation",
        choices=["tesselation", "contours", "none"],
        help="Overlay de malla facial: tesselation|contours|none (default: tesselation)",
    )

    parser.add_argument(
        "--profile",
        type=str,
        default=None,
        help="Ruta a perfil JSON (calibracion por conductor) para cargar umbrales",
    )

    parser.add_argument("--head-pitch", type=float, default=20.0, help="Umbral pitch (grados)")
    parser.add_argument("--head-yaw", type=float, default=20.0, help="Umbral yaw (grados)")
    parser.add_argument("--head-roll", type=float, default=20.0, help="Umbral roll (grados)")
    parser.add_argument(
        "--head-tilt-min-s",
        type=float,
        default=0.7,
        help="Tiempo minimo para HEAD_TILTED (segundos)",
    )
    parser.add_argument(
        "--perclos-th",
        type=float,
        default=0.4,
        help="Umbral de PERCLOS_HIGH (0..1)",
    )
    parser.add_argument(
        "--risk-window-s",
        type=float,
        default=60.0,
        help="Ventana (segundos) para agregacion de alertas",
    )
    parser.add_argument(
        "--risk-score-th",
        type=int,
        default=6,
        help="Score minimo en ventana para HIGH_RISK",
    )

    parser.add_argument(
        "--log-category",
        type=str,
        default="history",
        choices=["history", "calibration"],
        help="Carpeta de logs: history|calibration (default: history)",
    )
    parser.add_argument(
        "--driver",
        type=str,
        default=None,
        help="Nombre/ID del conductor (solo para calibration)",
    )
    parser.add_argument(
        "--log-tag",
        type=str,
        default=None,
        help="Etiqueta de sesion (ej: bueno, yawn, longblink) (solo para calibration)",
    )

    args = parser.parse_args()

    # Load profile (optional) and override args defaults.
    if args.profile:
        with open(args.profile, "r", encoding="utf-8") as f:
            payload = json.load(f)
        prof = payload.get("profile", payload)
        if "ear_threshold" in prof:
            args.ear = float(prof["ear_threshold"])
        if "mar_threshold" in prof:
            args.mar = float(prof["mar_threshold"])
        if "head_pitch_threshold" in prof:
            args.head_pitch = float(prof["head_pitch_threshold"])
        if "head_yaw_threshold" in prof:
            args.head_yaw = float(prof["head_yaw_threshold"])
        if "head_roll_threshold" in prof:
            args.head_roll = float(prof["head_roll_threshold"])
        if "head_tilt_min_duration_s" in prof:
            args.head_tilt_min_s = float(prof["head_tilt_min_duration_s"])
        if "perclos_threshold" in prof:
            args.perclos_th = float(prof["perclos_threshold"])
        if "alert_window_s" in prof:
            args.risk_window_s = float(prof["alert_window_s"])
        if "high_risk_score_threshold" in prof:
            args.risk_score_th = int(prof["high_risk_score_threshold"])

        print(
            "Perfil cargado -> "
            f"EAR:{args.ear:.3f} MAR:{args.mar:.3f} "
            f"Head(P/Y/R):{args.head_pitch:.1f}/{args.head_yaw:.1f}/{args.head_roll:.1f} "
            f"TiltMin:{args.head_tilt_min_s:.2f}s PERCLOS:{args.perclos_th:.2f} "
            f"RiesgoVent:{args.risk_window_s:.0f}s Score:{args.risk_score_th}"
        )

    system = DrowsinessSystem(
        camera_index=args.camera,
        video_path=args.video,
        stream_url=args.stream,
        loop_video=args.loop,
        gps_enabled=args.gps,
        api_enabled=args.api,
        ear_threshold=args.ear,
        mar_threshold=args.mar,
        hands_enabled=args.hands,
        pose_enabled=args.pose,
        mesh_style=args.mesh,
        log_category=args.log_category,
        driver=args.driver,
        log_tag=args.log_tag,
        alert_window_s=args.risk_window_s,
        high_risk_score_threshold=args.risk_score_th,
        head_pitch_threshold=args.head_pitch,
        head_yaw_threshold=args.head_yaw,
        head_roll_threshold=args.head_roll,
        head_tilt_min_duration_s=args.head_tilt_min_s,
        perclos_threshold=args.perclos_th,
    )

    return system.run()


if __name__ == "__main__":
    raise SystemExit(main())