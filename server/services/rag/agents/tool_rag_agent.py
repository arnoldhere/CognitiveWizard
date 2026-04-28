from langchain_classic.agents import Tool, initialize_agent
from langchain_classic.chat_models.openai import ChatOpenAI
from providers.llm_openai import provider as llm_openai


def build_agent(retriever_tool):
    # Agent with tool usage
    tools = [
        Tool(
            name="Document search",
            func=retriever_tool,
            description="Search relvant documents",
        )
    ]
    agent = initialize_agent(
        tools, llm_openai, agent="zero-shot-react-description", verbose=True
    )
    return agent
