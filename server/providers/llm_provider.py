from typing import Optional
from config.settings import settings

# LangChain integrations
from langchain_huggingface import ChatHuggingFace
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_huggingface import HuggingFaceEndpoint


class Provider:
    def __init__(
        self,
        provider: str = "huggingface",
        model_name: Optional[str] = None,
        temperature: float = 0.5,
        max_new_tokens: Optional[int] = 512,
        mode: Optional[str] = "inference",
    ):
        self.provider = provider.lower()
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        self.model_name = model_name
        self.mode = mode
        self.llm = self._initialize_provider()

    def _initialize_provider(self):
        if self.provider == "openai":
            return ChatOpenAI(
                model=self.model_name or settings.OPENAI_DEF_MODEL,
                temperature=self.temperature,
                api_key=settings.OPENAI_API_KEY,
                max_new_tokens=self.max_new_tokens,
            )

        elif self.provider == "anthropic":
            return ChatAnthropic(
                model=self.model_name or settings.ANTHROPIC_DEF_MODEL,
                temperature=self.temperature,
                api_key=settings.ANTHROPIC_API_KEY,
                max_new_tokens=self.max_new_tokens,
            )

        elif self.provider == "huggingface":
            if self.mode == "chat":
                # -------------------------
                # CHAT MODE
                # -------------------------
                # OpenAI-compatible HF Router
                return ChatOpenAI(
                    model=self.model_name or settings.HF_DEF_MODEL,
                    temperature=self.temperature,
                    api_key=settings.HF_API_KEY,
                    base_url="https://router.huggingface.co/v1",
                    max_tokens=self.max_new_tokens,
                )
            elif self.mode == "inference":
                # -------------------------
                # INFERENCE MODE
                # -------------------------
                endpoint = HuggingFaceEndpoint(
                    repo_id=self.model_name or settings.HF_DEF_MODEL,
                    temperature=self.temperature,
                    huggingfacehub_api_token=settings.HF_API_KEY,
                    max_new_tokens=self.max_new_tokens,
                    task="text-generation",
                )

                return ChatHuggingFace(llm=endpoint)
            else:
                raise ValueError(f"Unsupported HF mode: {self.mode}")

        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def get_llm(self):
        return self.llm


# Default instance (backward compatible)
_provider = Provider(provider=settings.DEF_LLM_PROVIDER)
llm = _provider.get_llm()  # by default Hugging face provider
