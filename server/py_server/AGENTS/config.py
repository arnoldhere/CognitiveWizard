import os
from dataclasses import dataclass
from dotenv import load_dotenv

# Load from server/.env (two directories up from py_server/config/settings.py)
env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.env"))
load_dotenv(dotenv_path=env_path)


@dataclass
class AgenticSettings:
    """
    Dedicated settings and configurations for the Agentic design and modules
    """

    SEARCH_PROVIDER: str = None
    SEARCH_TIMEOUT: int = None
    MAX_RESULTS: int = None
    CACHE_ENABLED: bool = None
    CACHE_TTL: int = None
    ALLOWED_DOMAINS: list = None
    BLOCKED_DOMAINS: list = None


AgenticSettings = AgenticSettings()
