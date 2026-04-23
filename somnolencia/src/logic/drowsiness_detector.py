class DrowsinessDetector:
    def __init__(self, ear_threshold=0.25, mar_threshold=0.6, 
                 ear_frames_threshold=15, yawn_frames_threshold=3,
                 head_pitch_threshold=20, head_yaw_threshold=20, head_roll_threshold=20):
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold
        self.ear_frames_threshold = ear_frames_threshold
        self.yawn_frames_threshold = yawn_frames_threshold
        self.head_pitch_threshold = head_pitch_threshold
        self.head_yaw_threshold = head_yaw_threshold
        self.head_roll_threshold = head_roll_threshold
        
        self.eye_closed_frames = 0
        self.yawn_frames = 0
        self.yawn_count = 0
        
        self.state = "NORMAL"
        self.alert_triggered = False

    def check_eye_closed(self, ear):
        if ear < self.ear_threshold:
            self.eye_closed_frames += 1
            return self.eye_closed_frames >= self.ear_frames_threshold
        else:
            self.eye_closed_frames = 0
            return False

    def check_yawning(self, mar):
        if mar > self.mar_threshold:
            self.yawn_frames += 1
            if self.yawn_frames >= self.yawn_frames_threshold:
                self.yawn_count += 1
                return True
        else:
            self.yawn_frames = 0
        return False

    def check_head_tilted(self, pitch, yaw, roll):
        return (pitch > self.head_pitch_threshold or 
                yaw > self.head_yaw_threshold or 
                roll > self.head_roll_threshold)

    def detect(self, ear=None, mar=None, pitch=None, yaw=None, roll=None):
        self.state = "NORMAL"
        alerts = []

        if ear is not None and self.check_eye_closed(ear):
            self.state = "DROWSY"
            alerts.append("EYES_CLOSED")
            if not self.alert_triggered:
                self.alert_triggered = True

        if mar is not None and self.check_yawning(mar):
            if self.state == "DROWSY":
                self.state = "VERY_DROWSY"
                alerts.append("YAWNING")
            else:
                self.state = "YAWN"
                alerts.append("YAWNING")

        if pitch is not None and yaw is not None and roll is not None:
            if self.check_head_tilted(pitch, yaw, roll):
                alerts.append("HEAD_TILTED")

        if self.state == "NORMAL":
            self.alert_triggered = False

        return {
            "state": self.state,
            "alerts": alerts,
            "alert_triggered": self.alert_triggered,
            "eye_closed_frames": self.eye_closed_frames,
            "yawn_count": self.yawn_count
        }

    def reset(self):
        self.eye_closed_frames = 0
        self.yawn_frames = 0
        self.yawn_count = 0
        self.state = "NORMAL"
        self.alert_triggered = False