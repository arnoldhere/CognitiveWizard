from langchain_community.chat_models.openai import ChatOpenAI


# class service for global handling of llm providers
class Provider:
    def __init__(self, temperature: float = 0.5):
        llm = ChatOpenAI(temperature=temperature)
        return llm


provider = Provider()
