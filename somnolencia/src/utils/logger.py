import logging
import os
from datetime import datetime


class Logger:
    def __init__(self, log_dir="data/logs", log_level=logging.INFO):
        self.log_dir = log_dir
        self.ensure_log_dir()
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        self.log_file = os.path.join(self.log_dir, f"drowsiness_{timestamp}.log")
        
        self.logger = logging.getLogger("DrowsinessDetection")
        self.logger.setLevel(log_level)
        
        if not self.logger.handlers:
            file_handler = logging.FileHandler(self.log_file, encoding='utf-8')
            file_handler.setLevel(log_level)
            
            console_handler = logging.StreamHandler()
            console_handler.setLevel(logging.WARNING)
            
            formatter = logging.Formatter(
                '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                datefmt='%Y-%m-%d %H:%M:%S'
            )
            file_handler.setFormatter(formatter)
            console_handler.setFormatter(formatter)
            
            self.logger.addHandler(file_handler)
            self.logger.addHandler(console_handler)

    def ensure_log_dir(self):
        if not os.path.exists(self.log_dir):
            os.makedirs(self.log_dir, exist_ok=True)

    def info(self, message):
        self.logger.info(message)

    def warning(self, message):
        self.logger.warning(message)

    def error(self, message):
        self.logger.error(message)

    def debug(self, message):
        self.logger.debug(message)

    def log_event(self, event_type, data):
        self.logger.info(f"EVENT: {event_type} - {data}")

    def log_alert(self, alert_type, state, location=None):
        message = f"ALERT: {alert_type} - State: {state}"
        if location:
            message += f" - Location: {location}"
        self.logger.warning(message)

    def log_drowsiness_state(self, state, ear, mar, pitch, yaw, roll):
        self.logger.info(
            f"State: {state} | "
            f"EAR: {ear:.3f} | MAR: {mar:.3f} | "
            f"Pitch: {pitch:.1f} | Yaw: {yaw:.1f} | Roll: {roll:.1f}"
        )

    def log_gps_data(self, latitude, longitude, speed, valid):
        status = "VALID" if valid else "INVALID"
        self.logger.info(f"GPS [{status}]: Lat={latitude:.6f}, Lon={longitude:.6f}, Speed={speed:.1f} km/h")

    def log_system_start(self, camera_index=0, gps_enabled=False):
        self.logger.info("=" * 50)
        self.logger.info("Sistema de deteccion de somnolencia iniciado")
        self.logger.info(f"Camara: {camera_index}")
        self.logger.info(f"GPS habilitado: {gps_enabled}")
        self.logger.info("=" * 50)

    def log_system_stop(self, runtime):
        self.logger.info("=" * 50)
        self.logger.info(f"Sistema detenido - Tiempo de ejecucion: {runtime}")
        self.logger.info("=" * 50)

    def log_error(self, component, error_message):
        self.logger.error(f"ERROR en {component}: {error_message}")

    def get_log_file(self):
        return self.log_file