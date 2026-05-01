## Facial-Login Module

> Facial login is a biometric authentication feature that enhances security by verifying a user’s identity using facial recognition instead of (or alongside) traditional credentials.

---

### High-Level Flow

#### 1. Face Registration

```
User → Capture Face → Detect → Align → Generate Embedding → Store Vector
```

#### 2. Face Recognition (Login)

```
User → Capture Face → Detect → Align → Generate Embedding → Compare → Authenticate
```
#### Overall flow
```
React (Camera Capture)
        ↓
Send Image (Base64 / Multipart)
        ↓
FastAPI Backend
        ↓
Face Detection + Alignment 
        ↓
Embedding 
        ↓
Store in ChromaDB + MySQL
```
---

### Core Components

#### 1. Detection & Alignment

* Detect face from image/video stream
* Align face (normalize orientation, remove noise)
* Recommended: **RetinaFace**
* Why:

  * Better accuracy in real-world conditions (lighting, angles)
  * More robust than older models like MTCNN

---

#### 2. Face Embedding Model

* Convert face → numerical vector (embedding)
* Recommended: **ArcFace (InsightFace)**
* Why:

  * High discriminative power
  * Industry-grade performance
  * Works well with cosine similarity

---

#### 3. Storage (Vector DB)

* Store embeddings instead of raw images

**Recommended Approach:**

* ChromaDB (for similarity search)
* SQL (for user metadata)

**Why this setup:**

* ChromaDB -> persistent vector similarity search
* SQL → structured user management
* Avoids early dependency on paid vector DBs (like Pinecone)

---

#### 4. Face Matching

* Compare input embedding with stored embeddings

**Method:**

* Cosine similarity

    ```
    similarity = cosine(embedding_input, embedding_db)
    ```

* Use threshold (e.g., 0.4–0.6) to decide match

**Key Insight:**

* Lower threshold → security risk (false positives)
* Higher threshold → UX issues (false rejections)
* Must be tuned empirically

---

#### 5. Liveness Detection (Security Layer)

* Prevent spoofing using:

  * Photos
  * Videos
  * Deepfakes

**Implementation Levels:**

* Basic:

  * Blink detection
  * Head movement

* Advanced:

  * Anti-spoofing models
  * Depth estimation

**Recommendation:**

* Start with basic → upgrade later

---

###  API Design

#### Register Face

```
POST /auth/face/register
```

* Input: user_id, image
* Process:

  * Detect face
  * Generate embedding
  * Store in ChromaDB + DB

---

#### Login via Face

```
POST /auth/face/login
```

* Input: image
* Process:

  * Detect face
  * Generate embedding
  * Compare with stored vectors
  * Return authenticated user

---

### Data Design

**MySQL**

* users
* face_embeddings (user_id, embedding_id, metadata)

**ChromaDB Collection**

```
[embedding_vector] → user_id
```

---

###  Key Decisions

* Use embeddings instead of images → reduces storage + improves privacy
* Use cosine similarity → best suited for face embeddings
* Use hybrid storage (ChromaDB + SQL) -> balance performance & structure
* Avoid LLM usage → this is a computer vision problem
---
