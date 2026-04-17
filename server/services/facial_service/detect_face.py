from retinaface import RetinaFace


"""
detect faces and return the nearest/largest one as a cropped image for embedding generation
use when init unless using buffalo_l which does detection and embedding in one step
"""


async def detect_face(image):
    # detect faces using retinaface
    faces = RetinaFace.detect_faces(image)

    if not faces:
        return {"error": "No face detected at backend"}
    # take the nearest/largest face
    face = max(faces.values(), key=lambda x: x["facial_area"][2])

    x1, y1, x2, y2 = face["facial_area"]
    return image[y1:y2, x1:x2]
