def build_quiz_prompt(topic: str, difficulty: str, num_questions: int = 5):
    prompt = f"""You are a quiz generator. Generate EXACTLY {num_questions} {difficulty}-level multiple choice questions on: "{topic}".
          Return ONLY a valid JSON array of exactly {num_questions} items — no markdown, no explanations, no extra text.

          FORMAT:
          [
            {{
              "question": "Question text?",
              "options": ["Option A", "Option B", "Option C", "Option D"],
              "answer": "Exact text matching one option"
            }}
          ]

          STRICT RULES:
          1. UNIQUENESS — No two questions may test the same concept, fact, or sub-topic. Vary angle and depth across all {num_questions} questions.
          2. EXACT COUNT — You MUST generate exactly {num_questions} questions. Do not generate {num_questions - 1} or {num_questions + 1}.
          3. ONE CORRECT ANSWER — Exactly 1 option is unambiguously correct. The other 3 must be plausible but clearly wrong to someone who truly knows the topic.
          4. DISTRACTORS — Wrong options must be:
            - Believable (not obviously absurd)
            - From the same category/type as the correct answer
            - Subtly different (vary numbers, swap terms, use common misconceptions)
          5. TWIST QUESTIONS — At least {max(1, num_questions // 3)} questions must use one of:
            - Negation framing: "Which of these is NOT..."
            - Exception framing: "Which is the ONLY..."
            - Scenario-based: brief real-world context before the question
            - Common misconception bait: one distractor = a widely believed wrong answer
          6. NO OPTION LABELS — Do NOT prefix with A, B, C, D or 1, 2, 3, 4
          7. ANSWER MATCH — "answer" value must be a character-perfect copy of one option string
          8. JSON ONLY — Output starts with '[' and ends with ']', nothing else
      """
    return prompt.strip()
