import io
import logging
from typing import Tuple

import cv2
import numpy as np
from PIL import Image

from config.settings import settings

logger = logging.getLogger(__name__)


# ============================================================================
# Metadata
# ============================================================================


def has_exif_metadata(image_bytes: bytes) -> bool:
    try:
        with Image.open(io.BytesIO(image_bytes)) as img:
            exif = img.getexif()
            return bool(exif)
    except Exception:
        return False


# ============================================================================
# Face Crop
# ============================================================================


def _crop_face_region(
    image: np.ndarray,
    bbox: np.ndarray,
    margin: float = 0.15,
) -> np.ndarray:
    """
    Crop face region safely.
    """

    try:
        bbox = np.asarray(bbox, dtype=np.float32).reshape(-1)

        if bbox.size != 4:
            return np.empty((0, 0, 3), dtype=np.uint8)

        x1, y1, x2, y2 = bbox.astype(int)

        if x2 <= x1 or y2 <= y1:
            return np.empty((0, 0, 3), dtype=np.uint8)

        h, w = image.shape[:2]

        dx = int((x2 - x1) * margin)
        dy = int((y2 - y1) * margin)

        x1 = max(0, x1 - dx)
        y1 = max(0, y1 - dy)

        x2 = min(w, x2 + dx)
        y2 = min(h, y2 + dy)

        if x2 <= x1 or y2 <= y1:
            return np.empty((0, 0, 3), dtype=np.uint8)

        return image[y1:y2, x1:x2]

    except Exception:
        logger.exception("Face crop failed")
        return np.empty((0, 0, 3), dtype=np.uint8)


# ============================================================================
# Utility
# ============================================================================


def _safe_corner_count(gray: np.ndarray) -> int:
    """
    Safe wrapper around cv2.goodFeaturesToTrack.
    """

    try:
        corners = cv2.goodFeaturesToTrack(
            gray,
            maxCorners=80,
            qualityLevel=0.01,
            minDistance=8,
        )

        return 0 if corners is None else len(corners)

    except Exception:
        logger.exception("Corner extraction failed")
        return 0


def _compute_skin_ratio(face_crop: np.ndarray) -> float:
    ycrcb = cv2.cvtColor(face_crop, cv2.COLOR_BGR2YCrCb)

    cr = ycrcb[:, :, 1]
    cb = ycrcb[:, :, 2]

    skin_mask = (cr >= 135) & (cr <= 180) & (cb >= 85) & (cb <= 135)

    return float(np.count_nonzero(skin_mask)) / float(cr.size)


# ============================================================================
# Liveness Score
# ============================================================================


def compute_liveness_score(
    face_crop: np.ndarray,
    image_bytes: bytes,
) -> float:
    """
    Computes heuristic liveness score.

    Output:
        0.0 -> spoof likely
        1.0 -> live likely
    """

    if face_crop is None or face_crop.size == 0:
        return 0.0

    # ------------------------------------------------------------------
    # Normalize channels
    # ------------------------------------------------------------------

    if face_crop.ndim == 3 and face_crop.shape[2] == 4:
        face_crop = cv2.cvtColor(
            face_crop,
            cv2.COLOR_RGBA2BGR,
        )

    elif face_crop.ndim == 2:
        face_crop = cv2.cvtColor(
            face_crop,
            cv2.COLOR_GRAY2BGR,
        )

    gray = cv2.cvtColor(face_crop, cv2.COLOR_BGR2GRAY)

    if gray.size == 0:
        return 0.0

    # ------------------------------------------------------------------
    # Blur / Sharpness
    # ------------------------------------------------------------------

    lap_var = float(
        cv2.Laplacian(
            gray,
            cv2.CV_64F,
        ).var()
    )

    blur_score = np.clip(
        (lap_var - 40.0) / 260.0,
        0.0,
        1.0,
    )

    # ------------------------------------------------------------------
    # Contrast
    # ------------------------------------------------------------------

    contrast_score = np.clip(
        gray.std() / 55.0,
        0.0,
        1.0,
    )

    # ------------------------------------------------------------------
    # Texture
    # ------------------------------------------------------------------

    corner_count = _safe_corner_count(gray)

    texture_score = np.clip(
        corner_count / 40.0,
        0.0,
        1.0,
    )

    # ------------------------------------------------------------------
    # Skin consistency
    # ------------------------------------------------------------------

    skin_ratio = _compute_skin_ratio(face_crop)

    skin_score = np.clip(
        skin_ratio * 1.4,
        0.0,
        1.0,
    )

    # ------------------------------------------------------------------
    # Edge density
    # ------------------------------------------------------------------

    edges = cv2.Canny(
        gray,
        100,
        200,
    )

    edge_ratio = float(np.count_nonzero(edges)) / float(gray.size)

    edge_score = np.clip(
        (edge_ratio - 0.04) * 4.0,
        0.0,
        1.0,
    )

    # ------------------------------------------------------------------
    # Reflection analysis
    # ------------------------------------------------------------------

    hsv = cv2.cvtColor(
        face_crop,
        cv2.COLOR_BGR2HSV,
    )

    reflection_ratio = np.count_nonzero(hsv[:, :, 2] > 240) / float(hsv[:, :, 2].size)

    reflection_penalty = np.clip(
        reflection_ratio * 4.0,
        0.0,
        0.15,
    )

    # ------------------------------------------------------------------
    # Frequency analysis
    # Detect screen replay artifacts
    # ------------------------------------------------------------------

    try:
        fft = np.fft.fft2(gray)
        fft_shift = np.fft.fftshift(fft)

        magnitude = np.log(np.abs(fft_shift) + 1)

        h, w = gray.shape

        center_region = magnitude[
            h // 4 : 3 * h // 4,
            w // 4 : 3 * w // 4,
        ]

        freq_energy = float(np.mean(center_region))

        freq_penalty = np.clip(
            (freq_energy - 6.0) / 20.0,
            0.0,
            0.10,
        )

    except Exception:
        freq_penalty = 0.0

    # ------------------------------------------------------------------
    # Metadata
    # ------------------------------------------------------------------

    exif_bonus = 0.02 if has_exif_metadata(image_bytes) else 0.0

    # ------------------------------------------------------------------
    # Final score
    # ------------------------------------------------------------------

    score = (
        0.28 * blur_score
        + 0.22 * texture_score
        + 0.20 * contrast_score
        + 0.15 * skin_score
        + 0.15 * edge_score
        + exif_bonus
        # Note: reflection and frequency penalties are subtracted from the final score (can be added later(optional))
        # - reflection_penalty
        # - freq_penalty
    )

    return float(np.clip(score, 0.0, 1.0))


# ============================================================================
# Verification
# ============================================================================


def verify_liveness(
    image_bytes: bytes,
    image: np.ndarray,
    bbox: np.ndarray,
) -> Tuple[bool, float, str]:

    try:

        if not image_bytes:
            return (
                False,
                0.0,
                "Invalid image bytes",
            )

        if image is None:
            return (
                False,
                0.0,
                "Image is missing",
            )

        image = np.asarray(image)

        if image.ndim < 2:
            return (
                False,
                0.0,
                "Invalid image dimensions",
            )

        height, width = image.shape[:2]

        if len(image_bytes) > settings.FACE_LOGIN_MAX_BYTES:
            return (
                False,
                0.0,
                "Image exceeds allowed size",
            )

        if min(height, width) < 320:
            return (
                False,
                0.0,
                "Image resolution too low",
            )

        if max(height, width) > 3000:
            return (
                False,
                0.0,
                "Image resolution too high",
            )

        aspect_ratio = width / float(height)

        if aspect_ratio > 4.0 or aspect_ratio < 0.25:
            return (
                False,
                0.0,
                "Invalid image aspect ratio",
            )

        bbox = np.asarray(bbox).reshape(-1)

        if bbox.size != 4:
            return (
                False,
                0.0,
                "Invalid face bounding box",
            )

        face_crop = _crop_face_region(
            image,
            bbox,
        )

        if face_crop.size == 0 or face_crop.shape[0] < 32 or face_crop.shape[1] < 32:
            return (
                False,
                0.0,
                "Detected face too small",
            )

        gray = cv2.cvtColor(
            face_crop,
            cv2.COLOR_BGR2GRAY,
        )

        score = compute_liveness_score(
            face_crop,
            image_bytes,
        )

        if score < settings.LIVENESS_THRESHOLD:

            lap_var = float(
                cv2.Laplacian(
                    gray,
                    cv2.CV_64F,
                ).var()
            )

            corner_count = _safe_corner_count(gray)

            skin_ratio = _compute_skin_ratio(face_crop)

            logger.warning(
                (
                    "Liveness failed "
                    "score=%.4f "
                    "lap_var=%.2f "
                    "corners=%d "
                    "contrast=%.2f "
                    "skin_ratio=%.4f "
                    "threshold=%.2f"
                ),
                score,
                lap_var,
                corner_count,
                float(np.std(gray)),
                skin_ratio,
                settings.LIVENESS_THRESHOLD,
            )

            return (
                False,
                score,
                "Liveness check failed",
            )

        logger.info(
            "Liveness passed score=%.4f",
            score,
        )

        return (
            True,
            score,
            "Liveness check passed",
        )

    except Exception:
        logger.exception("Unexpected liveness verification error")

        return (
            False,
            0.0,
            "Liveness verification failed",
        )
