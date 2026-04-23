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
from src.logic.drowsiness_detector import DrowsinessDetector
from src.alerts.alarm import AlarmSystem
from src.gps.gps_reader import GPSReader
from src.communication.api_client import APIClient
from src.utils.logger import Logger


class DrowsinessSystem:
    def __init__(self, camera_index=0, video_path=None, stream_url=None, loop_video=False,
                 gps_enabled=False, api_enabled=False,
                 ear_threshold=0.25, mar_threshold=0.6):
        self.camera_index = camera_index
        self.video_path = video_path
        self.stream_url = stream_url
        self.loop_video = loop_video
        self.gps_enabled = gps_enabled
        self.api_enabled = api_enabled
        self.source_type = "unknown"

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
            if current_time - prev_time >= 1.0:
                self.fps = self.frame_count
                self.frame_count = 0
                prev_time = current_time
            
            landmarks = self.face_detector.detect(frame)
            
            if landmarks:
                ear = self.eye_tracker.get_eye_ratio(landmarks, frame.shape)
                mar = self.mouth_tracker.get_mouth_ratio(landmarks, frame.shape)
                pitch, yaw, roll = self.head_pose_detector.get_head_pose(landmarks, frame.shape)
                
                detection_result = self.drowsiness_detector.detect(
                    ear=ear, mar=mar, pitch=pitch, yaw=yaw, roll=roll
                )
                
                self.logger.log_drowsiness_state(
                    detection_result["state"],
                    ear, mar, pitch, yaw, roll
                )
                
                if detection_result["alert_triggered"]:
                    self.alarm.trigger_alarm()
                
                annotated_frame = self.alarm.draw_alert(
                    frame, 
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
                cv2.putText(frame, "No se detecta rostro", (20, 50),
                           cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                annotated_frame = frame
            
            cv2.imshow("Deteccion de Somnolencia", annotated_frame)
            
            key = cv2.waitKey(1) & 0xFF
            if key == 27:
                break
            
            if key == ord('s'):
                self._take_snapshot(frame)
            
            if key == ord('r'):
                self.drowsiness_detector.reset()
                self.logger.info("Sistema reseteado")

        self.stop()

    def _draw_info(self, frame, ear, mar, pitch, yaw, roll, detection_result):
        h, w, _ = frame.shape
        
        info_y = h - 120
        cv2.putText(frame, f"EAR: {ear:.3f} (umbral: {self.eye_tracker.ear_threshold})", 
                   (10, info_y), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"MAR: {mar:.3f} (umbral: {self.mouth_tracker.mar_threshold})", 
                   (10, info_y + 20), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Pitch: {pitch:.1f}  Yaw: {yaw:.1f}  Roll: {roll:.1f}", 
                   (10, info_y + 40), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        cv2.putText(frame, f"Estado: {detection_result['state']}", 
                   (10, info_y + 60), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (0, 255, 0), 1)
        
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

    args = parser.parse_args()

    system = DrowsinessSystem(
        camera_index=args.camera,
        video_path=args.video,
        stream_url=args.stream,
        loop_video=args.loop,
        gps_enabled=args.gps,
        api_enabled=args.api,
        ear_threshold=args.ear,
        mar_threshold=args.mar
    )

    system.run()


if __name__ == "__main__":
    main()