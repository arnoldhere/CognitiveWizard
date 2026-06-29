"""
generator module to generate the output based on provided context using generation model
"""

from providers.llm.factory import get_llm_for_task
from providers.llm.tasks import TaskType
from utils.prompt_builder.prompt_rag_gen import prompt_rag_gen
import logging
from langchain_core.messages import HumanMessage, SystemMessage

logger = logging.getLogger(__name__)


from utils.json_extractor import extract_model_response
class Generator:
    def __init__(self, mode: str = "api"):
        if mode not in ["api", "local"]:
            raise ValueError(f"Invalid mode : {mode}")

        self.mode = mode
        if self.mode == "api":
            self.client = get_llm_for_task(TaskType.RAG, provider="huggingface")
        else:
            from config.hf_inference import HFClientManager

            self.client = HFClientManager().get_client(mode="local")

    def generate_response(self, query, context_docs=None):
        if context_docs:
            context_docs = "\n".join(context_docs)
            prompt = prompt_rag_gen(context_docs, query)
        else:
            prompt = f"Answer the following question:\n{query}"

        try:
            if self.mode == "api":
                messages = [
                    SystemMessage(
                        content=(
                            "You are a reliable retrieval-augmented assistant. "
                            "Answer based on provided context when available."
                        )
                    ),
                    HumanMessage(content=prompt),
                ]

                if hasattr(self.client, "invoke"):
                    response = self.client.invoke(messages)
                elif hasattr(self.client, "generate"):
                    response = self.client.generate([messages])
                else:
                    raise AttributeError(
                        "RAG model client does not support chat-style invocation"
                    )

                answer = extract_model_response(response).strip()
                token_usage = None
                if hasattr(response, "usage"):
                    token_usage = {
                        "input_tokens": getattr(response.usage, "prompt_tokens", 0),
                        "output_tokens": getattr(
                            response.usage, "completion_tokens", 0
                        ),
                        "total_tokens": getattr(response.usage, "total_tokens", 0),
                    }
                return answer, token_usage

            elif self.mode == "local":
                response = self.client(
                    prompt, max_new_tokens=512, temperature=0.5, do_sample=True
                )
                if isinstance(response, list) and response:
                    answer = response[0].get("generated_text", str(response[0])).strip()
                else:
                    answer = str(response).strip()

                from transformers import AutoTokenizer

                tokenizer = AutoTokenizer.from_pretrained("microsoft/DialoGPT-medium")
                input_tokens = len(tokenizer.encode(prompt))
                output_tokens = len(tokenizer.encode(answer))
                token_usage = {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                }
                return answer, token_usage

            return {"error": "Unspecified model mode to generate"}
        except Exception as e:
            logger.error(
                f"Error generating response with {self.mode} client: {str(e)}",
                exc_info=True,
            )
            raise
