class DrowsinessDetector:
    def __init__(
        self,
        ear_threshold=0.25,
        mar_threshold=0.6,
        ear_frames_threshold=15,
        yawn_frames_threshold=3,
        head_pitch_threshold=20,
        head_yaw_threshold=20,
        head_roll_threshold=20,
        # Time-based tuning (helps reduce false positives)
        eye_closed_min_duration_s=0.6,
        very_drowsy_min_duration_s=1.5,
        long_blink_min_duration_s=0.5,
        yawn_min_duration_s=1.0,
        perclos_window_s=30.0,
        perclos_threshold=0.4,
        head_nod_angle_threshold=25.0,
        head_nod_return_threshold=15.0,
        head_nod_max_duration_s=1.5,
        head_tilt_min_duration_s=0.7,
        head_tilt_smooth_alpha=0.35,
        eye_rub_min_duration_s=0.5,
    ):
        self.ear_threshold = ear_threshold
        self.mar_threshold = mar_threshold
        self.ear_frames_threshold = ear_frames_threshold
        self.yawn_frames_threshold = yawn_frames_threshold
        self.head_pitch_threshold = head_pitch_threshold
        self.head_yaw_threshold = head_yaw_threshold
        self.head_roll_threshold = head_roll_threshold

        self.eye_closed_min_duration_s = eye_closed_min_duration_s
        self.very_drowsy_min_duration_s = very_drowsy_min_duration_s
        self.long_blink_min_duration_s = long_blink_min_duration_s
        self.yawn_min_duration_s = yawn_min_duration_s

        self.perclos_window_s = perclos_window_s
        self.perclos_threshold = perclos_threshold

        self.head_nod_angle_threshold = head_nod_angle_threshold
        self.head_nod_return_threshold = head_nod_return_threshold
        self.head_nod_max_duration_s = head_nod_max_duration_s

        self.head_tilt_min_duration_s = head_tilt_min_duration_s
        self.head_tilt_smooth_alpha = head_tilt_smooth_alpha

        self.eye_rub_min_duration_s = eye_rub_min_duration_s
        
        self.eye_closed_frames = 0
        self.yawn_frames = 0
        self.yawn_count = 0

        self.eye_closed_duration_s = 0.0
        self.last_eye_closed_duration_s = 0.0

        self.yawn_active = False
        self.yawn_active_duration_s = 0.0

        self.eye_rub_duration_s = 0.0

        self._perclos_samples = []  # list of (dt, closed_bool)
        self._perclos_total_s = 0.0
        self._perclos_closed_s = 0.0

        self._head_nod_active = False
        self._head_nod_active_s = 0.0

        self._head_tilt_active_s = 0.0
        self._pitch_f = None
        self._yaw_f = None
        self._roll_f = None
        
        self.state = "NORMAL"
        self.alert_triggered = False

    def _update_perclos(self, dt, is_closed):
        if dt is None or dt <= 0:
            return

        self._perclos_samples.append((dt, is_closed))
        self._perclos_total_s += dt
        if is_closed:
            self._perclos_closed_s += dt

        # Trim window
        while self._perclos_total_s > self.perclos_window_s and self._perclos_samples:
            old_dt, old_closed = self._perclos_samples.pop(0)
            self._perclos_total_s -= old_dt
            if old_closed:
                self._perclos_closed_s -= old_dt

    def _get_perclos(self):
        if self._perclos_total_s <= 0:
            return 0.0
        return max(0.0, min(1.0, self._perclos_closed_s / self._perclos_total_s))

    def check_eye_closed(self, ear, dt=None):
        if ear < self.ear_threshold:
            self.eye_closed_frames += 1
            if dt is not None and dt > 0:
                self.eye_closed_duration_s += dt
            return (
                self.eye_closed_frames >= self.ear_frames_threshold
                or self.eye_closed_duration_s >= self.eye_closed_min_duration_s
            )
        else:
            self.last_eye_closed_duration_s = self.eye_closed_duration_s
            self.eye_closed_frames = 0
            self.eye_closed_duration_s = 0.0
            return False

    def check_yawning(self, mar, dt=None):
        """Return True only when a yawn event completes (mouth returns below threshold) and lasted long enough."""
        if mar is None:
            self.yawn_frames = 0
            self.yawn_active = False
            self.yawn_active_duration_s = 0.0
            return False

        if mar > self.mar_threshold:
            self.yawn_frames += 1
            self.yawn_active = True
            if dt is not None and dt > 0:
                self.yawn_active_duration_s += dt
            return False

        # mar <= threshold: if we were in an active yawn, decide if it's a real yawn
        yawn_event = False
        if self.yawn_active:
            duration_ok = self.yawn_active_duration_s >= self.yawn_min_duration_s
            frames_ok = self.yawn_frames >= self.yawn_frames_threshold
            if duration_ok and frames_ok:
                self.yawn_count += 1
                yawn_event = True

        self.yawn_frames = 0
        self.yawn_active = False
        self.yawn_active_duration_s = 0.0
        return yawn_event

    def check_head_tilted(self, pitch, yaw, roll):
        return (
            abs(pitch) > self.head_pitch_threshold
            or abs(yaw) > self.head_yaw_threshold
            or abs(roll) > self.head_roll_threshold
        )

    def _smooth_angle(self, prev, new):
        if new is None:
            return prev
        if prev is None:
            return float(new)
        a = float(self.head_tilt_smooth_alpha)
        a = max(0.0, min(1.0, a))
        return (1.0 - a) * float(prev) + a * float(new)

    def check_head_nod(self, pitch, dt=None):
        """Detect a simple nod-like event: pitch exceeds a threshold then returns below another threshold quickly."""
        if pitch is None:
            self._head_nod_active = False
            self._head_nod_active_s = 0.0
            return False

        pitch_abs = abs(pitch)
        if not self._head_nod_active:
            if pitch_abs >= self.head_nod_angle_threshold:
                self._head_nod_active = True
                self._head_nod_active_s = 0.0
            return False

        if dt is not None and dt > 0:
            self._head_nod_active_s += dt

        # Return condition
        if pitch_abs <= self.head_nod_return_threshold and self._head_nod_active_s <= self.head_nod_max_duration_s:
            self._head_nod_active = False
            self._head_nod_active_s = 0.0
            return True

        # Timeout
        if self._head_nod_active_s > self.head_nod_max_duration_s:
            self._head_nod_active = False
            self._head_nod_active_s = 0.0
        return False

    def detect(self, ear=None, mar=None, pitch=None, yaw=None, roll=None, dt=None, eye_rub=False):
        self.state = "NORMAL"
        alerts = []

        # Update PERCLOS window
        if ear is not None:
            self._update_perclos(dt, ear < self.ear_threshold)

        # Eyes
        eyes_closed_now = False
        if ear is not None and self.check_eye_closed(ear, dt=dt):
            eyes_closed_now = True
            # Escalate based on duration if available
            if self.eye_closed_duration_s >= self.very_drowsy_min_duration_s:
                self.state = "VERY_DROWSY"
            else:
                self.state = "DROWSY"
            alerts.append("EYES_CLOSED")
            if self.eye_closed_duration_s >= self.long_blink_min_duration_s:
                alerts.append("LONG_BLINK")
            if not self.alert_triggered:
                self.alert_triggered = True

        # Yawn (event fires when it ends and lasted long enough)
        if mar is not None and self.check_yawning(mar, dt=dt):
            if self.state in ("DROWSY", "VERY_DROWSY"):
                self.state = "VERY_DROWSY"
            else:
                self.state = "YAWN"
            alerts.append("YAWNING")

        if pitch is not None and yaw is not None and roll is not None:
            self._pitch_f = self._smooth_angle(self._pitch_f, pitch)
            self._yaw_f = self._smooth_angle(self._yaw_f, yaw)
            self._roll_f = self._smooth_angle(self._roll_f, roll)

            tilted_now = self.check_head_tilted(self._pitch_f, self._yaw_f, self._roll_f)
            if tilted_now and dt is not None and dt > 0:
                self._head_tilt_active_s += dt
            elif not tilted_now:
                self._head_tilt_active_s = 0.0

            if tilted_now and self._head_tilt_active_s >= self.head_tilt_min_duration_s:
                alerts.append("HEAD_TILTED")

        # Head nod
        if pitch is not None and self.check_head_nod(pitch, dt=dt):
            alerts.append("HEAD_NOD")

        # Eye rubbing (early warning)
        if eye_rub and dt is not None and dt > 0:
            self.eye_rub_duration_s += dt
        else:
            self.eye_rub_duration_s = 0.0

        if self.eye_rub_duration_s >= self.eye_rub_min_duration_s:
            alerts.append("EYE_RUB")

        # PERCLOS high (early warning)
        perclos = self._get_perclos()
        if perclos >= self.perclos_threshold and self._perclos_total_s >= min(5.0, self.perclos_window_s):
            alerts.append("PERCLOS_HIGH")

        if self.state == "NORMAL":
            self.alert_triggered = False

        return {
            "state": self.state,
            "alerts": alerts,
            "alert_triggered": self.alert_triggered,
            "eye_closed_frames": self.eye_closed_frames,
            "yawn_count": self.yawn_count,
            "perclos": perclos,
            "eye_closed_duration_s": self.eye_closed_duration_s,
        }

    def reset(self):
        self.eye_closed_frames = 0
        self.yawn_frames = 0
        self.yawn_count = 0
        self.eye_closed_duration_s = 0.0
        self.last_eye_closed_duration_s = 0.0
        self.yawn_active = False
        self.yawn_active_duration_s = 0.0
        self.eye_rub_duration_s = 0.0
        self._perclos_samples = []
        self._perclos_total_s = 0.0
        self._perclos_closed_s = 0.0
        self._head_nod_active = False
        self._head_nod_active_s = 0.0
        self._head_tilt_active_s = 0.0
        self._pitch_f = None
        self._yaw_f = None
        self._roll_f = None
        self.state = "NORMAL"
        self.alert_triggered = False