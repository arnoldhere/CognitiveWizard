from config.settings import settings

# Per-task model/param overrides — tune as needed
TASK_PROFILES = {
    "chat": {
        "temperature": 0.5,
        "max_new_tokens": 512,
        "top_p": None,
        "top_k": None,
        "model_override": None,  # use provider default
        "use_chat": True,
    },
    "summarize": {
        "temperature": 0.3,  # more deterministic
        "max_new_tokens": 1024,
        "top_p": None,
        "top_k": None,
        "model_override": None,
        "use_chat": True,
    },
    "quiz": {
        "temperature": 0.8,
        "top_p": 0.9,  # more creative, but still somewhat focused
        "top_k": 50,  # limit to top 50 tokens to reduce randomness while allowing creativity
        "max_new_tokens": 2500,  # quiz JSON is long
        "model_override": settings.QUIZ_GENERATOR_MODEL,
        "use_chat": True,
        "hf_task": "conversational",
    },
    "rag": {
        "top_p": None,
        "top_k": None,
        "temperature": 0.3,  # factual, grounded — lower than chat
        "max_new_tokens": 768,
        "model_override": None,
        "use_chat": True,
    },
    "wizard": {
        "temperature": 0.6,
        "top_p": 0.9,
        "top_k": 50,
        "max_new_tokens": 3000,
        "model_override": None,
        "use_chat": True,
    },
}
