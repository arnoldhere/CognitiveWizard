import cv2
import numpy as np


def decode_image(image_bytes):
    """
    decode images from the binary data
    """
    np_arr = np.frombuffer(image_bytes, np.uint8)
    return cv2.imdecode(np_arr, cv2.IMREAD_COLOR)


def normalize(vec):
    return vec / np.linalg.norm(vec)
