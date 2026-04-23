import insightface
import numpy as np


class FaceEmbedder:
    def __init__(self):
        # buffalo_l includes both detection and recognition models
        self.model = insightface.app.FaceAnalysis(
            name="buffalo_l",
            providers=["CUDAExecutionProvider", "CPUExecutionProvider"],
        )
        # ctx_id=0 uses the first GPU
        self.model.prepare(ctx_id=0, det_size=(720, 720))

    def process_image(self, image):
        # This one call does detection AND embedding
        faces = self.model.get(image)

        if not faces:
            return None, None

        # Sort by box size to get the largest/closest face
        face = sorted(
            faces,
            key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]),
            reverse=True,
        )[0]

        return face.embedding, face.bbox  # Returns embedding and coordinates


embedder = FaceEmbedder()
