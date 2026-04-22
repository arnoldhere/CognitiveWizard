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
                return response.choices[0].message["content"].strip()
            # ===========
            # Local model mode
            # ===========
            elif self.mode == "local":
                # For local models, we need to handle the response format properly
                response = self.client(
                    prompt, max_new_tokens=512, temperature=0.5, do_sample=True
                )
                if isinstance(response, list) and response:
                    return response[0]["generated_text"].strip()
                else:
                    return str(response).strip()
            else:
                return {"error": "Unspecified model mode to generate"}
        except Exception as e:
            logger.error(f"Error generating summary with {self.mode} client: {str(e)}")
        raise
