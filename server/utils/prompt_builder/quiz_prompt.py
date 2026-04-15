def build_quiz_prompt(topic: str, difficulty: str, num_questions: int = 5):
    prompt = f"""
    You are an AI quiz generator.
      Generate {num_questions} {difficulty}-level multiple choice questions on the topic: "{topic}".
      STRICT FORMAT:

      {{
        "question": "string",
        "options": [
          "option text 1",
          "option text 2",
          "option text 3",
          "option text 4"
        ],
        "answer": "exact option text"
      }}
      Rules:
      - DO NOT prefix options with A, B, C, D
      - DO NOT return objects
      - DO NOT return labels
      - Options must be plain strings only
"""
    return prompt.strip()
