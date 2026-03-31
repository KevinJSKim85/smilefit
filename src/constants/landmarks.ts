// MediaPipe Face Mesh landmark indices
// Reference: https://github.com/google-ai-edge/mediapipe/blob/master/mediapipe/modules/face_geometry/data/canonical_face_model_uv_visualization.png

// Mouth corners (inner lips) for width measurement
export const MOUTH_LEFT = 61;
export const MOUTH_RIGHT = 291;

// Mouth vertical (inner lips) for height measurement
export const MOUTH_TOP = 13;
export const MOUTH_BOTTOM = 14;

// Eye point sets for centroid computation (inter-ocular distance normalization)
export const LEFT_EYE_POINTS = [33, 7, 163, 144, 145, 153, 154, 155, 133, 173, 157, 158, 159, 160, 161, 246];
export const RIGHT_EYE_POINTS = [362, 382, 381, 380, 374, 373, 390, 249, 263, 466, 388, 387, 386, 385, 384, 398];
