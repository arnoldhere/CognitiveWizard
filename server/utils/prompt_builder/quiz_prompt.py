def build_quiz_prompt(topic: str, difficulty: str, num_questions: int = 5):
    prompt = f"""You are an AI quiz generator. Generate {num_questions} {difficulty}-level multiple choice questions on the topic: "{topic}".

CRITICAL: Return ONLY a valid JSON array. No markdown, no explanations, no comments.

Return format (a JSON array of {num_questions} objects):
[
  {{
    "question": "Question text here?",
    "options": [
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4"
    ],
    "answer": "Exact option text that matches one in options"
  }},
  {{
    "question": "Another question?",
    "options": [
      "Option 1",
      "Option 2",
      "Option 3",
      "Option 4"
    ],
    "answer": "Exact option text that matches one in options"
  }}
]

RULES:
- Return ONLY valid JSON array (no wrapping text)
- Each object must have "question", "options" (4 strings), and "answer" fields
- Answer must exactly match one of the options
- Do NOT prefix options with A, B, C, D or numbers
- Do NOT escape quotes incorrectly
- Ensure valid JSON syntax
"""
    return prompt.strip()
