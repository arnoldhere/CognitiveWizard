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
    ):
        self.provider = provider.lower()
        self.temperature = temperature
        self.model_name = model_name

        self.llm = self._initialize_provider()

    def _initialize_provider(self):
        if self.provider == "openai":
            return ChatOpenAI(
                model=self.model_name or settings.OPENAI_DEF_MODEL,
                temperature=self.temperature,
                api_key=settings.OPENAI_API_KEY,
            )

        elif self.provider == "anthropic":
            return ChatAnthropic(
                model=self.model_name or settings.ANTHROPIC_DEF_MODEL,
                temperature=self.temperature,
                api_key=settings.ANTHROPIC_API_KEY,
            )

        elif self.provider == "huggingface":
            endpoint = HuggingFaceEndpoint(
                repo_id=self.model_name or settings.HF_DEF_MODEL,
                temperature=self.temperature,
                huggingfacehub_api_token=settings.HF_API_KEY,
                task="conversational",
            )
            return ChatHuggingFace(llm=endpoint)
        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def get_llm(self):
        return self.llm


# Default instance (backward compatible)
_provider = Provider(provider=settings.DEF_LLM_PROVIDER)
llm = _provider.get_llm()  # by default Hugging face provider
