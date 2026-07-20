import time
from providers.llm.llm_provider import Provider
from providers.llm.tasks import TaskType
from config.settings import settings
import requests
import logging
from functools import lru_cache

logger = logging.getLogger(__name__)

# Cache for task profiles to avoid DB hit every time (cache for 60 seconds)
_profile_cache = {}
_cache_timestamp = {}

def get_task_profile(task_name: str):
    now = time.time()
    if task_name in _profile_cache and (now - _cache_timestamp.get(task_name, 0) < 60):
        return _profile_cache[task_name]

    try:
        url = f"{settings.JS_SERVER_URL.rstrip('/')}/internal/llm-configs/{task_name}"
        response = requests.get(url, timeout=5)
        
        if response.status_code == 200:
            config = response.json()
            profile = {
                "temperature": config.get("temperature", 0.5),
                "max_new_tokens": config.get("max_new_tokens", 512),
                "top_p": config.get("top_p"),
                "top_k": config.get("top_k"),
                "model_override": config.get("model_override"),
                "use_chat": config.get("use_chat", True),
            }
        else:
            logger.warning(f"No LLM config found in JS server for {task_name}, using fallback defaults. Status: {response.status_code}")
            profile = {
                "temperature": 0.5,
                "max_new_tokens": 512,
                "top_p": None,
                "top_k": None,
                "model_override": None,
                "use_chat": True,
            }
        
        _profile_cache[task_name] = profile
        _cache_timestamp[task_name] = now
        return profile
    except Exception as e:
        logger.error(f"Error fetching LLM config for {task_name} from JS Server: {e}")
        return _profile_cache.get(task_name, {
            "temperature": 0.5,
            "max_new_tokens": 512,
            "top_p": None,
            "top_k": None,
            "model_override": None,
            "use_chat": True,
        })


def get_llm_for_task(task: TaskType, provider: str = None):
    """
    Returns a LangChain-compatible LLM configured for the given task.
    """
    profile = get_task_profile(task.value)
    hf_task = "conversational" if task.value == "quiz" else None

    p = Provider(
        provider=provider or settings.DEF_LLM_PROVIDER,
        model_name=profile["model_override"],
        temperature=profile["temperature"],
        max_new_tokens=profile["max_new_tokens"],
        hf_task=hf_task,
        top_p=profile.get("top_p"),
        top_k=profile.get("top_k"),
    )
    return p.get_llm(use_chat=profile.get("use_chat", True))

@lru_cache(maxsize=8)
def get_cached_llm(task_value: str, provider: str):
    return get_llm_for_task(TaskType(task_value), provider)
