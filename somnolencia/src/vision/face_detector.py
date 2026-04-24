import cv2
import mediapipe as mp
import numpy as np


class FaceDetector:
    def __init__(self, min_detection_confidence=0.5, min_tracking_confidence=0.5):
        self.mp_face_mesh = mp.solutions.face_mesh
        self.face_mesh = self.mp_face_mesh.FaceMesh(
            max_num_faces=1,
            refine_landmarks=True,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.drawing_spec = self.mp_drawing.DrawingSpec(thickness=1, circle_radius=1, color=(0, 255, 0))

    def detect(self, frame):
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = self.face_mesh.process(rgb_frame)
        
        if results.multi_face_landmarks:
            return results.multi_face_landmarks[0]
        return None

    def get_face_rect(self, frame, landmarks):
        h, w, _ = frame.shape
        points = []
        for landmark in landmarks.landmark:
            points.append((landmark.x * w, landmark.y * h))
        
        x_min = int(min(p[0] for p in points))
        x_max = int(max(p[0] for p in points))
        y_min = int(min(p[1] for p in points))
        y_max = int(max(p[1] for p in points))
        
        return x_min, y_min, x_max, y_max

    def draw_landmarks(self, frame, landmarks, connections=None):
        annotated_frame = frame.copy()
        if connections is None:
            connections = self.mp_face_mesh.FACEMESH_TESSELATION
        self.mp_drawing.draw_landmarks(
            image=annotated_frame,
            landmark_list=landmarks,
            connections=connections,
            landmark_drawing_spec=self.drawing_spec,
            connection_drawing_spec=self.drawing_spec
        )
        return annotated_frame