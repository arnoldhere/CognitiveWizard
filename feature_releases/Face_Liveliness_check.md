## Face Liveliness Detection Implementation Summary

### Functional requirements addressed

- Passive single-image liveness gating before face embedding and ChromaDB search.
- Detect spoof attempts by rejecting images that fail liveness scoring.
- Return a clear login rejection message when liveliness fails.
- Keep the existing face authentication pipeline intact while making liveness a mandatory gate.

### Backend implementation

- Added `server/services/facial_service/liveness.py` to validate incoming face images using passive anti-spoof heuristics.
- Integrated the liveness gate into `server/services/facial_service/facial_auth.py` for both `/auth/face/login` and `/auth/face/register`.
- Added content type validation and `FACE_LOGIN_MAX_BYTES` upload limits in `server/api/auth_api.py`.
- The liveness layer enforces image resolution, aspect ratio sanity, face crop texture, blur, edge, contrast, and skin consistency.

### Frontend / client hardening

- `client/src/pages/FaceLogin.jsx` uses `facingMode: 'user'` and a randomized flash capture challenge.
- `client/src/pages/FaceRegister.jsx` uses the same camera constraints and challenge overlay.

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
Liveness check
      ↓ PASS
InsightFace embedding
      ↓
ChromaDB similarity search
      ↓
JWT + login response
```
---

> ### Features/Params measured for passive liveness check

- Blur/Sharpness
- Contrast Analysis
- Texture Analysis
- Skin Consistency 
- Edge & Density Analysis
- Reflection Analysis
- Freq. domain analysis (includes subpixels, refresh motions, etc...)
- EXIF metadata check

### How well this can perform?
- works well for against the spoofing using mobile/tab attacks
- may be failed again printed photo or hard photocopy, deepfake 
- current strategy can prevent spoofing against beginner-mid level attacks
| Category                        | Rating |
| ------------------------------- | ------ |
| Resource usage                  | 9/10   |
| Simplicity                      | 9/10   |
| Speed                           | 10/10  |
| Print attack protection         | 6/10   |
| Screen replay protection        | 5/10   |
| Video replay protection         | 3/10   |
| Deepfake protection             | 1/10   |
| Overall authentication security | 5.5/10 |