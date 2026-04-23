import cv2
import numpy as np


class HeadPoseDetector:
    NOSE_TIP = 1
    LEFT_EYE_LEFT = 33
    RIGHT_EYE_RIGHT = 263
    LEFT_EAR = 234
    RIGHT_EAR = 454
    CHIN = 152

    def __init__(self, pitch_threshold=20, yaw_threshold=20, roll_threshold=20):
        self.pitch_threshold = pitch_threshold
        self.yaw_threshold = yaw_threshold
        self.roll_threshold = roll_threshold
        self.face_3d_model = np.array([
            [0.0, 0.0, 0.0],
            [-0.5, -0.5, -1.0],
            [0.5, -0.5, -1.0],
            [-0.5, 0.5, -1.0],
            [0.5, 0.5, -1.0],
            [0.0, 1.5, -2.0],
        ], dtype=np.float32)

    def get_head_pose(self, landmarks, image_shape):
        h, w, _ = image_shape
        
        nose_tip = np.array([landmarks.landmark[self.NOSE_TIP].x * w, landmarks.landmark[self.NOSE_TIP].y * h])
        left_eye_left = np.array([landmarks.landmark[self.LEFT_EYE_LEFT].x * w, landmarks.landmark[self.LEFT_EYE_LEFT].y * h])
        right_eye_right = np.array([landmarks.landmark[self.RIGHT_EYE_RIGHT].x * w, landmarks.landmark[self.RIGHT_EYE_RIGHT].y * h])
        left_ear = np.array([landmarks.landmark[self.LEFT_EAR].x * w, landmarks.landmark[self.LEFT_EAR].y * h])
        right_ear = np.array([landmarks.landmark[self.RIGHT_EAR].x * w, landmarks.landmark[self.RIGHT_EAR].y * h])
        chin = np.array([landmarks.landmark[self.CHIN].x * w, landmarks.landmark[self.CHIN].y * h])

        face_2d_model = np.array([
            nose_tip,
            left_eye_left,
            right_eye_right,
            left_ear,
            right_ear,
            chin,
        ], dtype=np.float32)

        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float32)

        dist_coeffs = np.zeros((4, 1), dtype=np.float32)
        
        success, rotation_vec, translation_vec = cv2.solvePnP(
            self.face_3d_model, 
            face_2d_model, 
            camera_matrix, 
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if not success:
            return 0.0, 0.0, 0.0

        rotation_matrix, _ = cv2.Rodrigues(rotation_vec)
        pose_matrix = np.hstack((rotation_matrix, translation_vec))
        _, _, _, _, _, _, euler_angles = cv2.decomposeProjectionMatrix(pose_matrix)
        
        pitch = abs(euler_angles[0, 0])
        yaw = abs(euler_angles[1, 0])
        roll = abs(euler_angles[2, 0])

        return pitch, yaw, roll

    def is_head_tilted(self, pitch, yaw, roll):
        return (pitch > self.pitch_threshold or 
                yaw > self.yaw_threshold or 
                roll > self.roll_threshold)

    def draw_axes(self, frame, landmarks, image_shape):
        h, w, _ = image_shape
        
        nose_tip = (int(landmarks.landmark[self.NOSE_TIP].x * w), int(landmarks.landmark[self.NOSE_TIP].y * h))
        left_eye_left = (int(landmarks.landmark[self.LEFT_EYE_LEFT].x * w), int(landmarks.landmark[self.LEFT_EYE_LEFT].y * h))
        right_eye_right = (int(landmarks.landmark[self.RIGHT_EYE_RIGHT].x * w), int(landmarks.landmark[self.RIGHT_EYE_RIGHT].y * h))
        
        focal_length = w
        center = (w / 2, h / 2)
        camera_matrix = np.array([
            [focal_length, 0, center[0]],
            [0, focal_length, center[1]],
            [0, 0, 1]
        ], dtype=np.float64)

        face_3d_points = np.array([
            [0, 0, 0],
            [-0.5, -0.5, -1.0],
            [0.5, -0.5, -1.0],
            [0.0, 1.5, -2.0],
        ], dtype=np.float64)

        face_2d_points = np.array([
            nose_tip,
            left_eye_left,
            right_eye_right,
            (int(landmarks[self.CHIN].x * w), int(landmarks[self.CHIN].y * h)),
        ], dtype=np.float64)

        dist_coeffs = np.zeros((4, 1), dtype=np.float64)
        success, rotation_vec, translation_vec = cv2.solvePnP(
            face_3d_points,
            face_2d_points,
            camera_matrix,
            dist_coeffs,
            flags=cv2.SOLVEPNP_ITERATIVE
        )

        if success:
            points, _ = cv2.projectPoints(
                np.array([[0, 0, 0], [0.3, 0, 0], [0, -0.3, 0], [0, 0, 0.3]]),
                rotation_vec,
                translation_vec,
                camera_matrix,
                dist_coeffs
            )
            frame = cv2.line(frame, nose_tip, tuple(map(int, points[1].flatten())), (0, 0, 255), 3)
            frame = cv2.line(frame, nose_tip, tuple(map(int, points[2].flatten())), (0, 255, 0), 3)
            frame = cv2.line(frame, nose_tip, tuple(map(int, points[3].flatten())), (255, 0, 0), 3)

        return frame