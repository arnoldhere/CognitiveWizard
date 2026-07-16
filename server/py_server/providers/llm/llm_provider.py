from typing import Optional
from langchain_huggingface import ChatHuggingFace, HuggingFaceEndpoint
from langchain_openai import ChatOpenAI
from langchain_anthropic import ChatAnthropic
from huggingface_hub import InferenceClient
from config.settings import settings
import os


class Provider:
    def __init__(
        self,
        provider: str = "huggingface",
        model_name: Optional[str] = None,
        temperature: float = 0.5,
        max_new_tokens: int = 512,
        hf_task: Optional[str] = None,
        top_p: Optional[float] = None,
        top_k: Optional[int] = None,
    ):
        self.provider = provider.lower()
        self.model_name = model_name or settings.HF_DEF_MODEL
        self.temperature = temperature
        self.max_new_tokens = max_new_tokens
        self.hf_task = hf_task
        self.top_p = top_p
        self.top_k = top_k

        # Explicitly set HF_TOKEN in the environment so that huggingface_hub's
        # internal HfApi() routing calls can have the authorization to inspect gated models.
        self.hf_token = settings.HF_API_KEY or settings.HUGGINGFACEHUB_API_TOKEN
        if self.hf_token:
            os.environ["HF_TOKEN"] = self.hf_token
            os.environ["HUGGINGFACEHUB_API_TOKEN"] = self.hf_token

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
                # Route conversational tasks directly through HF's chat endpoint
                # This ensures all chat-style tasks use a chat-compatible model client.
                if self.hf_task == "conversational" or use_chat:
                    model_id = self._clean_model(
                        self.model_name or settings.HF_DEF_MODEL
                    )
                    # Build optional sampling kwargs — only pass if set
                    sampling_kwargs = {}
                    if self.top_p is not None:
                        sampling_kwargs["top_p"] = self.top_p
                    if self.top_k is not None:
                        sampling_kwargs["top_k"] = self.top_k
                    endpoint = HuggingFaceEndpoint(
                        temperature=self.temperature,
                        repo_id=model_id,
                        max_new_tokens=self.max_new_tokens,
                        huggingfacehub_api_token=self.hf_token,
                        **sampling_kwargs,
                    )
                    return ChatHuggingFace(llm=endpoint)

                # Fallback for standard text-generation endpoints when chat is not required.
                endpoint = HuggingFaceEndpoint(
                    repo_id=self.model_name or settings.HF_DEF_MODEL,
                    temperature=self.temperature,
                    huggingfacehub_api_token=self.hf_token,
                    task=self.hf_task or "text-generation",
                    max_new_tokens=self.max_new_tokens,
                )
                return endpoint

            case "inference":
                model = self._clean_model(self.model_name or settings.HF_DEF_MODEL)
                token = self.hf_token
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
        return InferenceClient(token=self.hf_token)

    @staticmethod
    def _clean_model(name: str) -> str:
        cleaned = name.strip().strip('"').strip("'")
        if not cleaned:
            raise ValueError("Model name cannot be empty")
        return cleaned
