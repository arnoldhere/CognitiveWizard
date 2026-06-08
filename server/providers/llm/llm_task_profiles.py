from config.settings import settings

# Per-task model/param overrides — tune as needed
TASK_PROFILES = {
    "chat": {
        "temperature": 0.5,
        "max_new_tokens": 512,
        "model_override": None,  # use provider default
        "use_chat": True,
    },
    "summarize": {
        "temperature": 0.3,  # more deterministic
        "max_new_tokens": 1024,
        "model_override": None,
        "use_chat": True,
    },
    "quiz": {
        "temperature": 0.8,
        "max_new_tokens": 2048,  # quiz JSON is long
        "model_override": settings.QUIZ_GENERATOR_MODEL,
        "use_chat": False,
        "hf_task": "text-generation",
    },
    "sentiment": {
        "temperature": 0.1,
        "max_new_tokens": 128,
        "model_override": None,
        "use_chat": False,
        "hf_task": "text-generation",
    },
    "rag": {
        "temperature": 0.3,  # factual, grounded — lower than chat
        "max_new_tokens": 768,
        "model_override": None,
        "use_chat": True,
    },
}
