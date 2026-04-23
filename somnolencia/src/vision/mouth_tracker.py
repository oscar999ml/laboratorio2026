import cv2
import numpy as np


class MouthTracker:
    UPPER_LIP_INDICES = [13, 82, 81, 80, 191, 61, 146, 91, 62, 78, 311, 291, 375, 321, 405, 314, 87]
    LOWER_LIP_INDICES = [14, 178, 179, 180, 85, 316, 315, 11, 57, 287, 273, 402, 381, 380, 373, 390, 267, 269, 270]

    def __init__(self, mar_threshold=0.6, yawn_frames_threshold=3):
        self.mar_threshold = mar_threshold
        self.yawn_frames_threshold = yawn_frames_threshold
        self.yawn_count = 0
        self.yawn_start = False

    def _euclidean_distance(self, point1, point2):
        return np.linalg.norm(np.array(point1) - np.array(point2))

    def get_mouth_ratio(self, landmarks, image_shape):
        h, w, _ = image_shape
        
        upper_lip_points = []
        for idx in self.UPPER_LIP_INDICES:
            landmark = landmarks.landmark[idx]
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            upper_lip_points.append((x, y))

        lower_lip_points = []
        for idx in self.LOWER_LIP_INDICES:
            landmark = landmarks.landmark[idx]
            x = int(landmark.x * w)
            y = int(landmark.y * h)
            lower_lip_points.append((x, y))

        if len(upper_lip_points) < 2 or len(lower_lip_points) < 2:
            return 0.0

        A = self._euclidean_distance(upper_lip_points[0], lower_lip_points[0])
        
        mouth_width = self._euclidean_distance(upper_lip_points[4], lower_lip_points[4])
        
        mar = A / mouth_width if mouth_width != 0 else 0.0
        return mar

    def is_yawning(self, mar):
        if mar > self.mar_threshold:
            if not self.yawn_start:
                self.yawn_start = True
                self.yawn_count = 1
            else:
                self.yawn_count += 1
        else:
            self.yawn_start = False
            self.yawn_count = 0
        
        return self.yawn_count >= self.yawn_frames_threshold

    def draw_mouth(self, frame, landmarks):
        h, w, _ = frame.shape
        annotated = frame.copy()

        for idx in self.UPPER_LIP_INDICES:
            point = landmarks.landmark[idx]
            x = int(point.x * w)
            y = int(point.y * h)
            cv2.circle(annotated, (x, y), 2, (255, 0, 0), -1)

        for idx in self.LOWER_LIP_INDICES:
            point = landmarks.landmark[idx]
            x = int(point.x * w)
            y = int(point.y * h)
            cv2.circle(annotated, (x, y), 2, (0, 0, 255), -1)

        return annotated