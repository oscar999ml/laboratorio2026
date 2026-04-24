import cv2
import mediapipe as mp


class HandsTracker:
    def __init__(
        self,
        max_num_hands=2,
        min_detection_confidence=0.5,
        min_tracking_confidence=0.5,
    ):
        self.mp_hands = mp.solutions.hands
        self.hands = self.mp_hands.Hands(
            static_image_mode=False,
            max_num_hands=max_num_hands,
            model_complexity=1,
            min_detection_confidence=min_detection_confidence,
            min_tracking_confidence=min_tracking_confidence,
        )
        self.mp_drawing = mp.solutions.drawing_utils
        self.mp_drawing_styles = mp.solutions.drawing_styles

    def detect(self, frame_bgr):
        rgb = cv2.cvtColor(frame_bgr, cv2.COLOR_BGR2RGB)
        results = self.hands.process(rgb)
        return results.multi_hand_landmarks or []

    def draw_hands(self, frame_bgr, hands_landmarks):
        annotated = frame_bgr.copy()
        for hand_landmarks in hands_landmarks:
            self.mp_drawing.draw_landmarks(
                annotated,
                hand_landmarks,
                self.mp_hands.HAND_CONNECTIONS,
                self.mp_drawing_styles.get_default_hand_landmarks_style(),
                self.mp_drawing_styles.get_default_hand_connections_style(),
            )
        return annotated

    @staticmethod
    def get_keypoints_pixels(hand_landmarks, image_shape, landmark_ids):
        """Return list of (x,y) pixels for selected hand landmark indices."""
        h, w, _ = image_shape
        points = []
        for idx in landmark_ids:
            lm = hand_landmarks.landmark[idx]
            points.append((int(lm.x * w), int(lm.y * h)))
        return points
