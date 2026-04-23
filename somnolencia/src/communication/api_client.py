import requests
import json
import time
import threading


class APIClient:
    def __init__(self, base_url="http://localhost:5000/api", timeout=10):
        self.base_url = base_url
        self.timeout = timeout
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'DrowsinessDetectionSystem/1.0'
        })
        
        self.connected = False
        self.last_response = None
        self.retry_count = 0
        self.max_retries = 3
        
        self.pending_alerts = []
        self.send_thread = None
        self.running = False

    def connect(self):
        try:
            response = self.session.get(f"{self.base_url}/health", timeout=self.timeout)
            self.connected = response.status_code == 200
            return self.connected
        except requests.exceptions.RequestException:
            self.connected = False
            return False

    def send_alert(self, alert_data):
        try:
            payload = {
                "timestamp": time.time(),
                "alert_type": alert_data.get("alert_type", "DROWSINESS"),
                "state": alert_data.get("state", "UNKNOWN"),
                "duration": alert_data.get("duration", 0),
                "location": alert_data.get("location", {}),
                "metrics": {
                    "ear": alert_data.get("ear", 0),
                    "mar": alert_data.get("mar", 0),
                    "pitch": alert_data.get("pitch", 0),
                    "yaw": alert_data.get("yaw", 0),
                    "roll": alert_data.get("roll", 0)
                }
            }
            
            response = self.session.post(
                f"{self.base_url}/alerts",
                json=payload,
                timeout=self.timeout
            )
            
            self.last_response = response.json() if response.status_code == 200 else None
            self.retry_count = 0
            return response.status_code == 200
            
        except requests.exceptions.RequestException as e:
            self.retry_count += 1
            if self.retry_count <= self.max_retries:
                self.pending_alerts.append(alert_data)
            return False

    def send_gps_data(self, gps_data):
        try:
            payload = {
                "timestamp": time.time(),
                "latitude": gps_data.get("latitude", 0),
                "longitude": gps_data.get("longitude", 0),
                "altitude": gps_data.get("altitude", 0),
                "speed": gps_data.get("speed", 0),
                "satellites": gps_data.get("satellites", 0),
                "valid": gps_data.get("valid", False)
            }
            
            response = self.session.post(
                f"{self.base_url}/gps",
                json=payload,
                timeout=self.timeout
            )
            
            return response.status_code == 200
            
        except requests.exceptions.RequestException:
            return False

    def send_drowsiness_event(self, event_data):
        try:
            payload = {
                "timestamp": time.time(),
                "state": event_data.get("state", "NORMAL"),
                "alerts": event_data.get("alerts", []),
                "eye_closed_frames": event_data.get("eye_closed_frames", 0),
                "yawn_count": event_data.get("yawn_count", 0),
                "location": event_data.get("location", {})
            }
            
            response = self.session.post(
                f"{self.base_url}/events",
                json=payload,
                timeout=self.timeout
            )
            
            return response.status_code == 200
            
        except requests.exceptions.RequestException:
            return False

    def start_background_send(self, interval=30):
        self.running = True
        self.send_thread = threading.Thread(target=self._background_sender, args=(interval,))
        self.send_thread.daemon = True
        self.send_thread.start()

    def stop_background_send(self):
        self.running = False
        if self.send_thread:
            self.send_thread.join(timeout=2)

    def _background_sender(self, interval):
        while self.running:
            time.sleep(interval)
            
            while self.pending_alerts and self.retry_count < self.max_retries:
                alert = self.pending_alerts.pop(0)
                self.send_alert(alert)
            
            if self.retry_count >= self.max_retries:
                self.pending_alerts.clear()
                self.retry_count = 0

    def get_connection_status(self):
        return {
            "connected": self.connected,
            "pending_alerts": len(self.pending_alerts),
            "retry_count": self.retry_count,
            "base_url": self.base_url
        }

    def close(self):
        self.stop_background_send()
        self.session.close()