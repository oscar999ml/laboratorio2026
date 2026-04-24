import cv2
import mediapipe as mp


class PoseTracker:
    def __init__(
        self,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ):
        self.mp_pose = mp.solutions.pose
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=1,
            enable_segmentation=False,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

    def detect(self, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.pose.process(rgb)
        return results.pose_landmarks

    def draw_pose(self, frame_bgr, pose_landmarks):
        if not pose_landmarks:
            return frame_bgr
        annotated = frame_bgr.copy()
        self.mp_drawing.draw_landmarks(
            annotated,
            pose_landmarks,
            self.mp_pose.POSE_CONNECTIONS,
            self.mp_drawing_styles.get_default_pose_landmarks_style(),
        )
        return annotated
