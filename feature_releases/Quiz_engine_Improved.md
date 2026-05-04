# Quiz Features (updates) Quick Summary : 04-05-2026

## What Was Implemented

- Added dynamic quiz time limits based on question count in backend service logic:
  - 5 questions: 8 minutes
  - 10 questions: 15 minutes
  - 15 questions: 20 minutes
  - 20 questions: 30 minutes
  - Above 20: scales in +8 minute blocks per next 5 questions
- Added live countdown timer on the quiz window.
- Added "last 2 minutes" warning state with red timer UI.
- Added automatic quiz submission when timer reaches zero.

## Database And Storage Updates

- Extended `grades` table model with:
  - `time_limit_seconds`
  - `time_taken`
  - `started_at`
- Added startup-safe schema patching for existing databases in `config/db.py`.
- Persisted complete quiz attempts with:
  - question set
  - answer key
  - user answers
  - per-question correctness and feedback
  - pass/fail grade and score
  - time taken

## API Enhancements

- `POST /quiz/generate` now returns `time_limit_seconds`.
- `POST /quiz/submit` now accepts `is_auto_submitted` and supports timeout submissions with partial answers.
- `POST /quiz/submit` response now includes:
  - `time_limit_seconds`
  - `time_taken`
  - `is_auto_submitted`
- `GET /quiz/results` now includes `time_taken` and `time_limit_seconds`.
- Added `GET /quiz/results/{quiz_id}` for detailed past-attempt view.

## Profile / History Enhancements

- Added `Time Taken` column in quiz history table.
- Added `View` action for each historical quiz.
- Added quiz detail dialog in profile history showing:
  - question text
  - user answer
  - correct answer
  - correctness feedback
  - score and timing summary

## Reliability / Quality Notes

- Added defensive timing and auto-submit guards to prevent duplicate submissions.
- Maintained existing secure quiz-mode controls (copy/paste/context-menu protections).
- Preserved compatibility with existing code style and component structure.
