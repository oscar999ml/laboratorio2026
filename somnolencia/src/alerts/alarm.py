import cv2
import numpy as np
import threading
import time
import pygame
import os


class AlarmSystem:
    def __init__(self, sound_enabled=True, visual_enabled=True, beep_frequency=1000, beep_duration=0.5):
        self.sound_enabled = sound_enabled
        self.visual_enabled = visual_enabled
        self.beep_frequency = beep_frequency
        self.beep_duration = beep_duration
        self.alarm_active = False
        self.alarm_thread = None
        self.beep_count = 0
        self.max_beeps = 10
        
        if self.sound_enabled:
            self._init_sound()

    def _init_sound(self):
        try:
            pygame.mixer.init()
            self.sound_system = "pygame"
        except Exception:
            try:
                import winsound
                self.sound_system = "winsound"
            except Exception:
                self.sound_system = None

    def _beep_worker(self):
        while self.alarm_active and self.beep_count < self.max_beeps:
            if self.sound_system == "pygame":
                frequency = 2000
                duration = int(self.beep_duration * 1000)
                try:
                    sound = pygame.mixer.Sound(np.sin(np.arange(duration) * frequency * 2 * np.pi / 44100))
                    sound.play()
                    time.sleep(self.beep_duration)
                except Exception:
                    pass
            elif self.sound_system == "winsound":
                try:
                    import winsound
                    winsound.Beep(self.beep_frequency, int(self.beep_duration * 1000))
                except Exception:
                    pass
            self.beep_count += 1
            time.sleep(0.2)
        
        if self.beep_count >= self.max_beeps:
            self.beep_count = 0

    def trigger_alarm(self, alert_type="DROWSINESS", duration=5):
        if self.alarm_active:
            return
        
        self.alarm_active = True
        self.beep_count = 0
        
        if self.sound_enabled and self.sound_system:
            self.alarm_thread = threading.Thread(target=self._beep_worker)
            self.alarm_thread.daemon = True
            self.alarm_thread.start()

    def stop_alarm(self):
        self.alarm_active = False
        if self.alarm_thread:
            self.alarm_thread.join(timeout=1)
            self.alarm_thread = None

    def draw_alert(self, frame, alert_type, state):
        if not self.visual_enabled:
            return frame
        
        annotated = frame.copy()
        h, w, _ = annotated.shape
        
        if state in ("DROWSY", "VERY_DROWSY", "HIGH_RISK"):
            color = (0, 0, 255)
            text = f"ALERTA: {state}"
        elif state == "YAWN":
            color = (0, 255, 255)
            text = f"ALERTA: {state}"
        else:
            return frame
        
        cv2.rectangle(annotated, (0, 0), (w, 80), (0, 0, 0), -1)
        cv2.putText(annotated, text, (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, color, 2, cv2.LINE_AA)
        
        if state in ("DROWSY", "VERY_DROWSY", "HIGH_RISK"):
            cv2.putText(annotated, "ABRA LOS OJOS!", (w//2 - 150, h//2), 
                        cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 3, cv2.LINE_AA)
        
        return annotated

    def get_alarm_status(self):
        return {
            "active": self.alarm_active,
            "beep_count": self.beep_count,
            "sound_enabled": self.sound_enabled,
            "visual_enabled": self.visual_enabled
        }