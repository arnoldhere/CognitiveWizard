## Face Liveliness Detection Implementation Summary

### Functional requirements addressed

- Passive single-image liveness gating before face embedding and ChromaDB search.
- Detect spoof attempts by rejecting images that fail liveness scoring.
- Return a clear login rejection message when liveliness fails.
- Keep the existing face authentication pipeline intact while making liveness a mandatory gate.
### Architecture after implementation

```
Frontend camera
      ↓
Capture challenge flash + video frame
      ↓
FastAPI /auth/face/login
      ↓
Face detection + crop
      ↓
Liveness check (ONNX or heuristic fallback)
      ↓ PASS
InsightFace embedding
      ↓
ChromaDB similarity search
      ↓
JWT + login response
```