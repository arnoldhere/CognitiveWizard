import asyncio
import threading
import numpy as np
import cv2


class FaceEmbedder:
    """Lazy-initialized face embedder that reduces startup costs.

    The InsightFace model is only loaded when it is first needed. Heavy model
    initialization and image processing run in a thread to avoid blocking the
    FastAPI event loop.
    """

    def __init__(self, model_name="buffalo_s", det_size=(480, 480)):
        self.model_name = model_name
        self.det_size = det_size
        self.providers = ["CPUExecutionProvider"]
        self.allowed_modules = ["detection", "recognition", "landmark_2d_5"]
        self.model = None
        self._lock = threading.Lock()

    def _load_model(self):
        if self.model is not None:
            return

        with self._lock:
            if self.model is not None:
                return

            import insightface
            from insightface.app import FaceAnalysis

            self.model = FaceAnalysis(
                name=self.model_name,
                providers=self.providers,
                allowed_modules=self.allowed_modules,
            )
            self.model.prepare(ctx_id=-1, det_size=self.det_size)

    def _process_image_sync(self, image):
        if image is None:
            return None, None

        if self.model is None:
            self._load_model()

        image = np.asarray(image)

        if image.ndim == 2:  # grayscale
            image = cv2.cvtColor(image, cv2.COLOR_GRAY2BGR)
        elif image.shape[2] == 4:  # RGBA
            image = cv2.cvtColor(image, cv2.COLOR_RGBA2BGR)

        faces = self.model.get(image)
        if not faces:
            return None, None

        face = sorted(
            faces,
            key=lambda x: (x.bbox[2] - x.bbox[0]) * (x.bbox[3] - x.bbox[1]),
            reverse=True,
        )[0]

        return face.embedding, face.bbox

    async def process_image(self, image):
        return await asyncio.to_thread(self._process_image_sync, image)


embedder = FaceEmbedder()
