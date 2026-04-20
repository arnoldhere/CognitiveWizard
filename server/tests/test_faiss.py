import numpy as np
from config.Faiss_index import faiss_service

vec = np.random.rand(512).astype("float32")
vec = vec / np.linalg.norm(vec)

# add
vid = faiss_service.add_vector(vec)

# search
results = faiss_service.search_top_k(vec, k=3)

print(results)
