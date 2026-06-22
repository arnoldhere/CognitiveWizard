import numpy as np

from config.settings import settings
from services.facial_service.liveness import compute_liveness_score, verify_liveness


def test_verify_liveness_rejects_invalid_image():
    image = np.zeros((480, 640, 3), dtype=np.uint8)

    is_live, score, message = verify_liveness(b"", image, np.array([0, 0, 100, 100]))

    assert not is_live
    assert score == 0.0
    assert "invalid" in message.lower()


def test_verify_liveness_rejects_large_upload():
    image = np.zeros((480, 640, 3), dtype=np.uint8)
    image_bytes = b"\xff\xd8" + b"\x00" * (settings.FACE_LOGIN_MAX_BYTES + 1)

    is_live, score, message = verify_liveness(image_bytes, image, np.array([0, 0, 320, 320]))

    assert not is_live
    assert "too large" in message.lower()


def test_verify_liveness_rejects_low_resolution():
    image = np.zeros((200, 200, 3), dtype=np.uint8)
    image_bytes = b"\xff\xd8" + b"\x00" * 1000

    is_live, score, message = verify_liveness(image_bytes, image, np.array([0, 0, 100, 100]))

    assert not is_live
    assert "resolution" in message.lower()


def test_compute_liveness_score_is_bounded():
    face = np.random.randint(0, 255, (128, 128, 3), dtype=np.uint8)
    score = compute_liveness_score(face, b"")

    assert 0.0 <= score <= 1.0
