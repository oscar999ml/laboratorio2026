import logging
import os
from datetime import datetime


class Logger:
    def __init__(
        self,
        log_dir="data/logs",
        log_level=logging.INFO,
        category="history",
        driver=None,
        tag=None,
    ):
        self.base_log_dir = log_dir
        self.category = category or "history"
        self.driver = driver
        self.tag = tag

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        # Folder structure:
        # - data/logs/history/
        # - data/logs/calibration/<driver>/<tag>/
        self.log_dir = self._build_log_dir()
        self.ensure_log_dir()

        prefix = self._build_prefix()
        self.log_file = os.path.join(self.log_dir, f"{prefix}_{timestamp}.log")

        # Use a unique logger name per run to avoid handler reuse across runs.
        self.logger = logging.getLogger(f"DrowsinessDetection.{prefix}.{timestamp}")
        self.logger.setLevel(log_level)
        self.logger.propagate = False

        file_handler = logging.FileHandler(self.log_file, encoding="utf-8")
        file_handler.setLevel(log_level)

        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.WARNING)

        formatter = logging.Formatter(
            "%(asctime)s - %(name)s - %(levelname)s - %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S",
        )
        file_handler.setFormatter(formatter)
        console_handler.setFormatter(formatter)

        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def _slug(self, value):
        if value is None:
            return None
        text = str(value).strip()
        if not text:
            return None
        allowed = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-"
        cleaned = "".join(ch if ch in allowed else "_" for ch in text)
        while "__" in cleaned:
            cleaned = cleaned.replace("__", "_")
        return cleaned.strip("_") or None

    def _build_log_dir(self):
        category = self._slug(self.category) or "history"
        if category == "calibration":
            driver = self._slug(self.driver) or "driver"
            tag = self._slug(self.tag) or "session"
            return os.path.join(self.base_log_dir, category, driver, tag)
        return os.path.join(self.base_log_dir, category)

    def _build_prefix(self):
        category = self._slug(self.category) or "history"
        parts = ["drowsiness", category]
        if category == "calibration":
            driver = self._slug(self.driver)
            tag = self._slug(self.tag)
            if driver:
                parts.append(driver)
            if tag:
                parts.append(tag)
        return "_".join(parts)

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

    def exception(self, message):
        self.logger.exception(message)

    def log_event(self, event_type, data):
        self.logger.info(f"EVENT: {event_type} - {data}")

    def log_alert(self, alert_type, state, location=None):
        message = f"ALERT: {alert_type} - State: {state}"
        if location:
            message += f" - Location: {location}"
        self.logger.warning(message)

    def log_interval_summary(self, window_s, alert_counts, risk_score=None, risk_level=None):
        parts = [f"SUMMARY({window_s:.0f}s)"]
        if risk_level is not None:
            parts.append(f"risk={risk_level}")
        if risk_score is not None:
            parts.append(f"score={risk_score}")
        if alert_counts:
            counts_txt = ", ".join(f"{k}:{v}" for k, v in sorted(alert_counts.items()))
            parts.append(f"counts={{ {counts_txt} }}")
        self.logger.info(" | ".join(parts))

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