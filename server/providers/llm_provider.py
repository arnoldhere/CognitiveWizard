from typing import Optional
from config.settings import settings

# LangChain integrations
from langchain_huggingface import ChatHuggingFace
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from langchain_huggingface import HuggingFaceEndpoint
from config.hf_inference import HFClientManager


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

        elif self.provider == "inference":
            client = HFClientManager.get_client()
            res = client.text_generation(
                model=self.model_name or settings.HF_DEF_MODEL,
                temperature=self.temperature,
                max_new_tokens=self.max_new_tokens,
                hf_token=settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN,
            )
            return res

        elif self.provider == "anthropic":
            return ChatAnthropic(
                model=self.model_name or settings.ANTHROPIC_DEF_MODEL,
                temperature=self.temperature,
                api_key=settings.ANTHROPIC_API_KEY,
                max_new_tokens=self.max_new_tokens,
            )

        elif self.provider == "huggingface":
            hf_model = (
                (self.model_name or settings.HF_DEF_MODEL or "")
                .strip()
                .strip('"')
                .strip("'")
            )
            if not hf_model:
                raise ValueError(
                    "HuggingFace model must be configured for huggingface provider"
                )
            hf_token = settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN
            endpoint = HuggingFaceEndpoint(
                repo_id=hf_model,
                temperature=self.temperature,
                huggingfacehub_api_token=hf_token,
                task="conversational",
                max_new_tokens=self.max_new_tokens,
            )
            return ChatHuggingFace(llm=endpoint)

        else:
            raise ValueError(f"Unsupported provider: {self.provider}")

    def get_llm(self):
        return self.llm


# Default instance (backward compatible)
_provider = Provider(provider=settings.DEF_LLM_PROVIDER)
llm = _provider.get_llm()  # by default Hugging face provider
