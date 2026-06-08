from typing import Optional
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from huggingface_hub import InferenceClient
from config.settings import settings


class Provider:
    def __init__(
        self,
        provider: str = "huggingface",
        model_name: Optional[str] = None,
        temperature: float = 0.5,
        max_new_tokens: int = 512,
        hf_task: Optional[str] = None,
    ):
        self.provider = provider.lower()
        self.model_name = model_name
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        self.hf_task = hf_task

    def get_llm(self, use_chat: bool = True):
        match self.provider:

            case "openai":
                return ChatOpenAI(
                    model=self.model_name or settings.OPENAI_DEF_MODEL,
                    temperature=self.temperature,
                    api_key=settings.OPENAI_API_KEY,
                    max_tokens=self.max_new_tokens,  # NOTE: OpenAI uses max_tokens
                )

            case "anthropic":
                return ChatAnthropic(
                    model=self.model_name or settings.ANTHROPIC_DEF_MODEL,
                    temperature=self.temperature,
                    api_key=settings.ANTHROPIC_API_KEY,
                    max_tokens=self.max_new_tokens,
                )

            case "huggingface":
                model = self._clean_model(self.model_name or settings.HF_DEF_MODEL)
                token = settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN
                endpoint = HuggingFaceEndpoint(
                    repo_id=model,
                    temperature=self.temperature,
                    huggingfacehub_api_token=token,
                    task=self.hf_task or "text-generation",
                    max_new_tokens=self.max_new_tokens,
                )
                return ChatHuggingFace(llm=endpoint) if use_chat else endpoint

            case "inference":
                model = self._clean_model(self.model_name or settings.HF_DEF_MODEL)
                token = settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN
                endpoint = HuggingFaceEndpoint(
                    repo_id=model,
                    temperature=self.temperature,
                    huggingfacehub_api_token=token,
                    task=self.hf_task or "text-generation",
                    max_new_tokens=self.max_new_tokens,
                )
                return ChatHuggingFace(llm=endpoint) if use_chat else endpoint

            case _:
                raise ValueError(f"Unsupported provider: {self.provider}")

    def get_raw_inference_client(self) -> InferenceClient:
        """Direct HF InferenceClient — use ONLY for non-LangChain pipelines
        e.g. sentiment classification, embeddings, ASR"""
        return InferenceClient(
            token=settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN
        )

    @staticmethod
    def _clean_model(name: str) -> str:
        cleaned = name.strip().strip('"').strip("'")
        if not cleaned:
            raise ValueError("Model name cannot be empty")
        return cleaned
