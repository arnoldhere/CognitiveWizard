"""
generator module to generate the output based on provided context using generation model
"""

from config.hf_inference import HFClientManager
from utils.prompt_builder.prompt_rag_gen import prompt_rag_gen
import logging

logger = logging.getLogger(__name__)


class Generator:
    def __init__(self, mode: str = "api"):
        if mode not in ["api", "local"]:
            return False, f"Invalid model mode '{mode}'. Must be 'api' or 'local'"

        self.client = HFClientManager().get_client()
        self.mode = mode

    def generate_response(self, query, context_docs=None):
        if context_docs:
            context_docs = "\n".join(context_docs)
            prompt = prompt_rag_gen(context_docs, query)
        else:
            prompt = f"Answer the following question:\n{query}"

        try:
            # ===========
            # inference model mode
            # ===========
            if self.mode == "api":
                response = self.client.chat_completion(
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=1024,  # Reduced for efficiency
                    temperature=0.5,  # Lower temperature for more consistent outcome
                )
                answer = response.choices[0].message["content"].strip()

                # Extract token usage
                token_usage = {
                    "input_tokens": response.usage.prompt_tokens,
                    "output_tokens": response.usage.completion_tokens,
                    "total_tokens": response.usage.total_tokens,
                }

                return answer, token_usage

            # ===========
            # Local model mode
            # ===========
            elif self.mode == "local":
                # For local models, we need to handle the response format properly
                response = self.client(
                    prompt, max_new_tokens=512, temperature=0.5, do_sample=True
                )
                if isinstance(response, list) and response:
                    answer = response[0]["generated_text"].strip()
                else:
                    answer = str(response).strip()

                # Manual token counting for local mode
                from transformers import AutoTokenizer

                tokenizer = AutoTokenizer.from_pretrained(
                    "microsoft/DialoGPT-medium"
                )  # Using a common tokenizer

                input_tokens = len(tokenizer.encode(prompt))
                output_tokens = len(tokenizer.encode(answer))

                token_usage = {
                    "input_tokens": input_tokens,
                    "output_tokens": output_tokens,
                    "total_tokens": input_tokens + output_tokens,
                }

                return answer, token_usage
            else:
                return {"error": "Unspecified model mode to generate"}
        except Exception as e:
            logger.error(f"Error generating summary with {self.mode} client: {str(e)}")
        raise
