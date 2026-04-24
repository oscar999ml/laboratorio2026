import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import cv2
import time
from datetime import datetime

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
                 mesh_style="tesselation"):
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

        self.logger = Logger()
        self._log_source()
        self.logger.log_system_start(camera_index, gps_enabled)
        
        self.face_detector = FaceDetector()
        self.eye_tracker = EyeTracker(ear_threshold=ear_threshold)
        self.mouth_tracker = MouthTracker(mar_threshold=mar_threshold)
        self.head_pose_detector = HeadPoseDetector()
        self.drowsiness_detector = DrowsinessDetector(
            ear_threshold=ear_threshold,
            mar_threshold=mar_threshold
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

    def run(self):
        if not self._init_capture():
            return

        self.start_time = time.time()
        prev_time = time.time()

        try:
            while True:
                ret, frame = self.cap.read()
                if not ret:
                    if self.loop_video and self.source_type == "video":
                        self.cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, frame = self.cap.read()
                        if not ret:
                            break
                    else:
                        self.logger.error("Error al leer frame o video terminado")
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

                if landmarks:
                    ear = self.eye_tracker.get_eye_ratio(landmarks, frame.shape)
                    mar = self.mouth_tracker.get_mouth_ratio(landmarks, frame.shape)
                    pitch, yaw, roll = self.head_pose_detector.get_head_pose(landmarks, frame.shape)

                    eye_rub = self._is_eye_rub(hands_landmarks, landmarks, frame.shape) if self.hands_tracker else False

                    detection_result = self.drowsiness_detector.detect(
                        ear=ear, mar=mar, pitch=pitch, yaw=yaw, roll=roll, dt=dt, eye_rub=eye_rub
                    )

                    self.logger.log_drowsiness_state(
                        detection_result["state"],
                        ear, mar, pitch, yaw, roll
                    )

                    if detection_result["alert_triggered"]:
                        self.alarm.trigger_alarm()

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
                        detection_result["state"]
                    )

                    annotated_frame = self._draw_info(annotated_frame, ear, mar, pitch, yaw, roll, detection_result)

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
                    if self.pose_tracker and pose_landmarks:
                        annotated_frame = self.pose_tracker.draw_pose(annotated_frame, pose_landmarks)
                    if self.hands_tracker and hands_landmarks:
                        annotated_frame = self.hands_tracker.draw_hands(annotated_frame, hands_landmarks)
                    cv2.putText(annotated_frame, "No se detecta rostro", (20, 50),
                                cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

                cv2.imshow("Deteccion de Somnolencia", annotated_frame)

                # If user closes the window via the X button
                if cv2.getWindowProperty("Deteccion de Somnolencia", cv2.WND_PROP_VISIBLE) < 1:
                    break

                key = cv2.waitKey(1) & 0xFF
                if key == 27:
                    break

                if key == ord('s'):
                    self._take_snapshot(frame)

                if key == ord('r'):
                    self.drowsiness_detector.reset()
                    self.logger.info("Sistema reseteado")

        finally:
            self.stop()

    def _draw_info(self, frame, ear, mar, pitch, yaw, roll, detection_result):
        h, w, _ = frame.shape
        
        info_y = h - 140
        cv2.putText(frame, f"EAR: {ear:.3f} (umbral: {self.eye_tracker.ear_threshold})", 
                   (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"MAR: {mar:.3f} (umbral: {self.mouth_tracker.mar_threshold})", 
                   (10, info_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Pitch: {abs(pitch):.1f}  Yaw: {abs(yaw):.1f}  Roll: {abs(roll):.1f}", 
                   (10, info_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Estado: {detection_result['state']}", 
                   (10, info_y + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)

        alerts = detection_result.get("alerts") or []
        perclos = detection_result.get("perclos", 0.0)
        alerts_text = "Alertas: " + (", ".join(alerts) if alerts else "-" )
        cv2.putText(frame, f"{alerts_text}",
                    (10, info_y + 80), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        cv2.putText(frame, f"PERCLOS(30s): {perclos:.2f}",
                    (10, info_y + 100), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
        
        if self.gps and self.gps.is_valid():
            gps_text = f"GPS: {self.gps.get_coordinates_string()}"
        else:
            gps_text = "GPS: No disponible"
        cv2.putText(frame, gps_text, (w - 300, h - 20),
                   cv2.FONT_HERSHEY_SIMPLEX, 0.4, (255, 255, 255), 1)
        
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


def main():
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

    args = parser.parse_args()

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
    )

    system.run()


if __name__ == "__main__":
    main()