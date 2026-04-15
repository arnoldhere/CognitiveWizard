from huggingface_hub import InferenceClient
from config.settings import settings
from transformers import pipeline, AutoModelForCausalLM, AutoTokenizer
import torch


class HFClientManager:
    _clients = {}
    _pipelines = {}

    @classmethod
    def get_client(cls, mode: str = "api"):
        """
        Returns either:
        - HF InferenceClient (API mode)
        - Transformers pipeline (local mode)
        """

        if mode == "api":
            return cls._get_api_client()

        elif mode == "local":
            return cls._get_local_pipeline()

        else:
            raise ValueError("Invalid QUIZ_MODEL_MODE")

    # =========================
    # API CLIENT
    # =========================
    @classmethod
    def _get_api_client(cls, model_name: str = settings.QUIZ_GENERATOR_MODEL):
        if model_name not in cls._clients:
            cls._clients[model_name] = InferenceClient(
                model=model_name, token=settings.HF_API_KEY
            )
        return cls._clients[model_name]

    # =========================
    #  LOCAL PIPELINE
    # =========================
    @classmethod
    def _get_local_pipeline(cls, model_name: str = settings.QUIZ_GENERATOR_MODEL_LOCAL):
        if model_name not in cls._pipelines:
            # device = 0 if torch.cuda.is_available() else -1
            tokenizer = AutoTokenizer.from_pretrained(model_name)
            model = AutoModelForCausalLM.from_pretrained(
                model_name,
                torch_dtype=torch.float16,  # reduces memory
                # max_memory={0: "3GiB", "cpu": "6GiB"},  # GPU limit & RAM limit
            )
            cls._pipelines[model_name] = pipeline(
                "text-generation",
                model=model_name,
                # tokenizer=tokenizer,
                token=settings.HF_API_KEY or None,
                # max_new_tokens=512,
                # temperature=0.95,
                # do_sample=True,
            )

        return cls._pipelines[model_name]
