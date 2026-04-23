import cv2
import numpy as np


class EyeTracker:
    LEFT_EYE_INDICES = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398]
    RIGHT_EYE_INDICES = [33, 7, 163, 144, 145, 153, 154, 155, 133, 246, 161, 160, 159, 158, 157, 173]

    def __init__(self, ear_threshold=0.25, ear_frames_threshold=15):
        self.ear_threshold = ear_threshold
        self.ear_frames_threshold = ear_frames_threshold
        self.closed_frames = 0

    def _euclidean_distance(self, point1, point2):
        return np.linalg.norm(np.array(point1) - np.array(point2))

    def _calculate_ear(self, eye_landmarks, landmarks):
        h, w, _ = landmarks.shape if len(landmarks.shape) == 3 else (1, 1, 1)
        
        points = []
        for idx in eye_landmarks:
            point = landmarks[idx]
            if len(point) >= 2:
                x = int(point[0] * w) if w > 1 else int(point[0])
                y = int(point[1] * h) if h > 1 else int(point[1])
                points.append((x, y))
        
        if len(points) < 6:
            return 0.0

        A = self._euclidean_distance(points[1], points[5])
        B = self._euclidean_distance(points[2], points[4])
        C = self._euclidean_distance(points[0], points[3])

        ear = (A + B) / (2.0 * C) if C != 0 else 0.0
        return ear

    def get_eye_ratio(self, landmarks, image_shape):
        h, w, _ = image_shape
        
        left_eye_points = []
        for idx in self.LEFT_EYE_INDICES:
            landmark = landmarks[idx]
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            left_eye_points.append((x, y))

        right_eye_points = []
        for idx in self.RIGHT_EYE_INDICES:
            landmark = landmarks[idx]
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            right_eye_points.append((x, y))

        left_ear = self._calculate_ear_from_points(left_eye_points)
        right_ear = self._calculate_ear_from_points(right_eye_points)

        avg_ear = (left_ear + right_ear) / 2.0
        return avg_ear

    def _calculate_ear_from_points(self, points):
        if len(points) < 6:
            return 0.0

        A = self._euclidean_distance(points[1], points[5])
        B = self._euclidean_distance(points[2], points[4])
        C = self._euclidean_distance(points[0], points[3])

        ear = (A + B) / (2.0 * C) if C != 0 else 0.0
        return ear

    def is_eye_closed(self, ear):
        return ear < self.ear_threshold

    def update_closed_frames(self, ear):
        if self.is_eye_closed(ear):
            self.closed_frames += 1
        else:
            self.closed_frames = 0
        return self.closed_frames >= self.ear_frames_threshold

    def get_eye_aspect_ratio(self, landmarks):
        if landmarks is None:
            return 0.0
        return 0.0

    def draw_eyes(self, frame, landmarks):
        h, w, _ = frame.shape
        annotated = frame.copy()

        for idx in self.LEFT_EYE_INDICES:
            point = landmarks[idx]
            x = int(point.x * w)
            y = int(point.y * h)
            cv2.circle(annotated, (x, y), 2, (0, 255, 0), -1)

        for idx in self.RIGHT_EYE_INDICES:
            point = landmarks[idx]
            x = int(point.x * w)
            y = int(point.y * h)
            cv2.circle(annotated, (x, y), 2, (0, 255, 0), -1)

        return annotated