# CognitiveWizard — Quiz Studio Improvement & Implementation Specification

## 1. Purpose

Upgrade the existing Tutor Quiz Studio from an AI quiz generator into a production-oriented **AI Assessment Authoring Studio**.

The implementation must build on the current CognitiveWizard codebase and existing architecture rather than creating a disconnected subsystem.

Primary outcome:

> Tutors can create evidence-grounded, pedagogically structured assessments with AI assistance, review/edit generated questions, publish immutable versions, assign assessments to learners, and later use assessment results for learning analytics and personalization.

---

# 2. Current Implementation Baseline

Latest reviewed Quiz Studio implementation is `quiz studio v1.1`.

Current frontend flow:

```text
Tutor
  ↓
Tutor Dashboard
  ↓
Quiz Studio
  ├── Configure
  ├── Generate
  ├── Review
  └── Publish
```

Current backend flow:

```text
React
  ↓ SSE
Express Quiz Studio Controller
  ↓
FastAPI
  ↓
LangGraph Quiz Graph
  ├── Analyzer
  ├── Retriever
  ├── Planner
  ├── Generator
  └── Evaluator
```

Existing quiz persistence foundation:

```text
Quiz
  └── QuizVersion
        └── QuizQuestion
```

Existing invitation foundation:

```text
Quiz
  └── QuizInvitation
```

Existing question fields include:

```text
type
question_text
options
correct_answers
explanation
difficulty
bloom_level
order_index
validation_flags
```

Do not discard these foundations. Extend them where appropriate.

---

# 3. Product Direction

Do NOT position the feature merely as:

> AI quiz generator

Target product:

> **AI Assessment Studio**

Target workflow:

```text
SOURCE
  ↓
AI UNDERSTANDS
  ↓
ASSESSMENT BLUEPRINT
  ↓
GENERATE
  ↓
VALIDATE + GROUND
  ↓
TUTOR REVIEW
  ↓
PREVIEW
  ↓
PUBLISH
  ↓
DELIVER
  ↓
ANALYZE
  ↓
PERSONALIZE LEARNING
```

The system should eventually connect:

```text
Quiz Studio
    ↓
Reference Retriever
    ↓
RAG / Knowledge Sources
    ↓
Assessment
    ↓
Learner Attempts
    ↓
Analytics
    ↓
Skill / Knowledge Gaps
    ↓
Personalized Learning
```

---

# 4. Core Product Requirements

## 4.1 Assessment Sources

Support a source abstraction instead of only topic-based generation.

Required source types:

```text
topic
text
pdf
url
youtube
course
rag
existing_quiz
question_bank
```

Example request:

```json
{
  "source": {
    "type": "pdf",
    "document_id": "doc_123"
  },
  "assessment": {
    "topic": "Transformer Architecture",
    "question_count": 20
  }
}
```

Source selection must actually propagate from frontend → API → LangGraph.

Do not expose source options that are not implemented.

---

# 5. Assessment Blueprint

Before generating questions, create an explicit assessment blueprint.

Blueprint should support:

```text
purpose
audience
subject
topic
learning_objectives
question_count
question_types
difficulty_distribution
bloom_distribution
time_limit
pass_percentage
```

Assessment purposes:

```text
practice
formative
summative
exam
certification
revision
diagnostic
```

Question mix example:

```text
MCQ              10
Multiple Answer   3
True/False        2
Short Answer      3
Scenario          2
```

Cognitive distribution example:

```text
Remember      10%
Understand    30%
Apply         40%
Analyze       20%
```

Difficulty:

```text
Easy      20%
Medium    60%
Hard      20%
```

The planner must guarantee requested totals.

---

# 6. Learning Objectives

Allow tutors to define learning objectives.

Example:

```text
Topic: Python OOP

Objective:
Explain inheritance and distinguish it from composition.

Skill:
Object-oriented design

Bloom:
Understand

Difficulty:
Medium
```

Question generation should target objectives instead of generating unrelated questions about a topic.

Question model should eventually support:

```text
learning_objective
skill
concept
competency
standard
```

---

# 7. Teaching / Assessment Goal

Add:

```text
What should this assessment accomplish?

Practice
Formative Assessment
Exam
Certification
Revision
Diagnostic Assessment
```

Generation strategy must adapt to selected purpose.

Examples:

```text
Diagnostic
→ identify misconceptions

Practice
→ feedback + explanations

Exam
→ balanced difficulty + stricter validation

Certification
→ strict validation + controlled delivery
```

---

# 8. Reference Retriever Integration

The current Quiz graph contains a simulated context retriever.

Remove simulation.

Use the actual CognitiveWizard Reference Retriever architecture where appropriate.

Context routing:

```text
                    Quiz Request
                         ↓
                   Context Router
                         │
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
   User Document       RAG          Topic-only request
        ↓                ↓                ↓
 Document Retriever  RAG Retriever  Reference Retriever
```

Additional source-specific retrieval:

```text
URL
 ↓
Web Content Retriever

YouTube
 ↓
Transcript Retriever

Course
 ↓
Course Content Retriever
```

The retriever should return source-aware evidence.

---

# 9. Evidence-Grounded Questions

Every generated question should support source traceability where source grounding is available.

Recommended structure:

```json
{
  "question": "...",
  "correct_answers": ["..."],
  "source_references": [
    {
      "document_id": "doc_123",
      "chunk_id": "chunk_45",
      "url": "...",
      "citation": "..."
    }
  ]
}
```

Tutor should be able to inspect:

```text
Source
Section
Relevant excerpt
Citation / link
```

Questions generated from external/reference retrieval must not silently present unsupported claims as authoritative.

---

# 10. LangGraph Architecture

Current graph:

```text
Analyzer
 ↓
Retriever
 ↓
Planner
 ↓
Generator
 ↓
Evaluator
```

Evolve toward:

```text
START
 ↓
Input Analyzer
 ↓
Source / Context Router
 ↓
Retriever
 ↓
Assessment Blueprint Planner
 ↓
Question Generator
 ↓
Schema Validator
 ↓
Deterministic Validator
 ↓
Semantic Validator
 ↓
Pedagogical Validator
 ↓
Quality Scorer
 ↓
Tutor Review
 ↓
END
```

Use conditional edges where retry/revision is necessary.

Example:

```text
Generator
   ↓
Validation
   ├── invalid → targeted regeneration
   └── valid → quality evaluation
```

Avoid blindly regenerating the complete quiz when only one question fails.

---

# 11. Question Generation

Supported question types:

```text
mcq
multiple_answer
true_false
fill_blank
short
subjective
scenario
```

Question schema should evolve toward:

```json
{
  "id": "q1",
  "type": "mcq",
  "question": "...",
  "options": [],
  "correct_answers": [],
  "explanation": "...",
  "difficulty": "medium",
  "bloom_level": "apply",
  "learning_objective": "...",
  "skill": "...",
  "concept": "...",
  "source_references": [],
  "quality_score": null,
  "warnings": [],
  "status": "ai_generated"
}
```

---

# 12. Deterministic Validation

LLM evaluation must not be the only validation layer.

Implement deterministic validation before semantic evaluation.

Required checks:

```text
✓ question exists
✓ valid question type
✓ options exist where required
✓ options are unique
✓ correct answer exists
✓ correct answer belongs to options for MCQ
✓ no empty fields
✓ no duplicate IDs
✓ requested question count is satisfied
✓ valid difficulty
✓ valid Bloom level
✓ valid question structure
```

Invalid questions should be marked for regeneration/review.

---

# 13. Semantic Validation

Use an LLM evaluator or suitable semantic validation layer for:

```text
ambiguity
multiple correct answers
hallucination
unsupported answer
weak distractors
duplicate/similar questions
difficulty mismatch
Bloom mismatch
poor explanation
unclear wording
learning-objective mismatch
```

Evaluation output:

```json
{
  "quality_score": 92,
  "question_results": [
    {
      "question_id": "q1",
      "status": "valid",
      "issues": []
    }
  ]
}
```

---

# 14. Evaluator Failure Policy

Never use:

```text
evaluation failed
→ quality_score = 100
→ all questions valid
```

Instead:

```text
evaluation unavailable
→ quality_score = null
→ status = needs_review
→ warnings = ["Automated quality validation unavailable"]
```

Publishing rules should depend on assessment type.

High-stakes assessments should not be publishable when required validation has failed.

---

# 15. Duplicate Detection

Implement question-level duplicate detection.

Check:

```text
exact duplicates
semantic duplicates
near-duplicates
same-answer-pattern duplicates
```

Generation should retry only affected questions.

Do not display fake generation steps such as duplicate checking unless those checks actually execute.

---

# 16. Difficulty Evaluation

Do not blindly trust requested difficulty.

Evaluate:

```text
requested difficulty
actual estimated difficulty
```

Flag mismatches:

```text
Requested: Hard
Estimated: Easy
→ Needs Review
```

Later, use real learner performance data to calibrate empirical difficulty.

---

# 17. Bloom Taxonomy Validation

Support:

```text
remember
understand
apply
analyze
evaluate
create
```

Generation planner should honor requested distribution.

Evaluator should flag:

```text
Requested: Analyze
Generated: Remember
```

---

# 18. Quiz Studio UI

Current flow:

```text
Configure → Generate → Review → Publish
```

Target:

```text
1. Define
2. Generate
3. Review
4. Preview
5. Publish
```

---

# 19. Define Screen

Target layout:

```text
What are you assessing?

Source
[ Topic ] [ PDF ] [ URL ] [ YouTube ] [ Course ] [ RAG ]

Assessment Purpose
[ Formative ▼ ]

Topic / Objective
[...................................]

Audience
[...................................]

Questions
[20]

Difficulty
[Mixed ▼]

Time
[30 min]

Learning Objectives
[+ Add Objective]

Question Mix
MCQ 10 | Short 5 | T/F 5

[Generate →]
```

Advanced settings can contain:

```text
Bloom distribution
Difficulty distribution
Pass percentage
Question randomization
Option randomization
Explanation policy
Source grounding
```

---

# 20. Generation Screen

Generation progress must reflect real backend events.

Example:

```text
Understanding requirements        ✓
Selecting sources                 ✓
Building assessment blueprint     ✓
Retrieving evidence               ✓
Generating questions              ✓
Validating structure              ✓
Checking duplicates               ✓
Evaluating difficulty             ✓
Checking pedagogy                 ✓
Finalizing assessment             ✓
```

Do not fake progress.

Backend should emit explicit event types:

```text
analysis_started
retrieval_started
retrieval_completed
planning_started
generation_started
validation_started
evaluation_started
question_retry
completed
error
```

SSE remains acceptable for streaming generation status.

---

# 21. Review Editor

Current editor already supports:

```text
edit
add
delete
duplicate
reorder
warnings
quality score
```

Preserve these capabilities.

Upgrade UI to:

```text
┌─────────────┬──────────────────────────┬──────────────────┐
│ Questions   │ Question Editor          │ AI Review        │
│             │                          │                  │
│ ✓ Q1        │ Q8                       │ Quality 94       │
│ ✓ Q2        │                          │                  │
│ ⚠ Q3        │ What is...?             │ Grounded ✓       │
│ ✓ Q4        │                          │ Clear ✓          │
│ ✎ Q5        │ A [........]             │ Difficulty ✓     │
│             │ B [........] ✓           │                  │
│ + Add       │ C [........]             │ ⚠ Weak distractor│
│             │ D [........]             │                  │
│             │                          │ [Improve]        │
└─────────────┴──────────────────────────┴──────────────────┘
```

---

# 22. AI Question Copilot

Add question-level AI actions:

```text
Improve question
Make harder
Make easier
Change question type
Generate better distractors
Generate scenario
Remove ambiguity
Improve explanation
Regenerate
```

API example:

```http
POST /tutor/quizzes/:quiz_id/questions/:question_id/regenerate
```

Request:

```json
{
  "instruction": "Make this application-level",
  "preserve": [
    "learning_objective",
    "topic"
  ]
}
```

AI must preserve fields explicitly requested by the tutor.

---

# 23. Question Quality Panel

Display:

```text
Quality        94
Grounding     100
Clarity        95
Difficulty     88
Distractors    92
Objective      100
```

These scores are advisory and must be clearly distinguished from empirical learner statistics.

---

# 24. Source Evidence Panel

For grounded questions:

```text
AI Evidence

✓ Supported by source

Source:
Attention Is All You Need

Section:
3.2 Attention

[View Source]
```

If no evidence exists:

```text
⚠ No source evidence available
```

Do not claim grounding where grounding was not performed.

---

# 25. Quiz Persistence Lifecycle

Create quiz draft container before generation:

```text
POST /tutor/quizzes
        ↓
quiz_id
        ↓
POST /tutor/quizzes/:id/generate
        ↓
generated draft
        ↓
POST /tutor/quizzes/:id/versions
```

Do not depend on a missing `quiz_id` at save time.

---

# 26. Immutable Versioning

Lifecycle:

```text
DRAFT
 ↓
REVIEW
 ↓
PUBLISHED
 ↓
ARCHIVED
```

Published versions must be immutable.

If tutor edits a published quiz:

```text
v1 Published
     ↓
Edit
     ↓
v2 Draft
     ↓
Review
     ↓
v2 Published
```

Never mutate questions belonging to a published version.

---

# 27. Question Bank

Introduce reusable Tutor Question Bank.

Capabilities:

```text
search
filter
tag
edit
archive
duplicate
add to quiz
generate quiz from bank
```

Organization:

```text
Python
 ├── Functions
 ├── OOP
 ├── Exceptions
 └── Async

Machine Learning
 ├── Regression
 ├── Classification
 └── Neural Networks
```

Question metadata should support:

```text
subject
topic
subtopic
skill
difficulty
Bloom level
tags
source
```

---

# 28. Import Existing Assessments

Support:

```text
PDF
DOCX
PPTX
CSV
XLSX
JSON
QTI
```

Flow:

```text
Import
 ↓
Parse
 ↓
Normalize
 ↓
Validate
 ↓
AI Improve
 ↓
Tutor Review
 ↓
Publish
```

This is not optional long-term functionality.

---

# 29. Publish / Delivery

Current Publish screen is partially prototype/mock.

Replace mock operations with real APIs.

Required:

```text
Save
Publish
Assign
Generate share link
Export
Schedule
```

Assignment:

```text
Tutor
 ↓
Select learners/groups
 ↓
Set availability
 ↓
Set attempts
 ↓
Set deadline
 ↓
Send invitation
```

---

# 30. Invitation Security

Current invitation tokens must not be stored as raw secrets.

Preferred:

```text
raw token
 ↓
SHA-256 hash
 ↓
store token_hash
```

Email contains raw token.

Database stores hash.

Support:

```text
expiry
single-use or attempt policy
revocation
rate limiting
attempt binding
```

Replace mock email dispatch with an asynchronous email service/job.

---

# 31. Assessment Settings

Support:

```text
time_limit
pass_percentage
max_attempts
randomize_questions
randomize_options
show_explanations
allow_retry
availability_window_start
availability_window_end
```

These fields already exist in the Quiz model; wire them into the real UI/API lifecycle.

---

# 32. Integrity Profiles

Offer:

```text
Practice
Assessment
Exam
```

Practice:

```text
basic timer
feedback
retry
```

Assessment:

```text
randomized questions
randomized options
attempt limit
availability window
```

Exam:

```text
all assessment controls
server-side timing
focus-loss telemetry
suspicious activity events
stronger session controls
```

Do not claim browser-only restrictions provide perfect anti-cheating security.

---

# 33. Preview

Before publishing, show learner-facing preview.

Preview must support:

```text
desktop
mobile
question navigation
timer
question types
explanations
submission
```

Tutor should be able to identify layout/content problems before publication.

---

# 34. Analytics Foundation

Capture per-attempt/per-question data:

```text
attempt_id
quiz_id
quiz_version_id
question_id
learner_id
answer
is_correct
time_spent
skipped
submitted_at
```

Aggregate:

```text
average score
pass rate
completion rate
question accuracy
average response time
difficulty performance
skill performance
```

---

# 35. Tutor Analytics

Dashboard should eventually show:

```text
Participants
Completed
Average Score
Pass Rate
Average Time
```

Weak concepts:

```text
Graphs               42%
Dynamic Programming  38%
Recursion             51%
```

Question performance:

```text
Q12 → 18% correct
Q17 → 92% correct
```

Use analytics to detect:

```text
poor question quality
misconceptions
weak skills
unexpected difficulty
```

---

# 36. Skill-Level Learning Intelligence

Long-term flow:

```text
Quiz Results
    ↓
Skill Mapping
    ↓
Mastery Estimation
    ↓
Knowledge Gaps
    ↓
Recommended Resources
    ↓
Personalized Roadmap
```

This should integrate with existing CognitiveWizard learning/roadmap capabilities.

---

# 37. QTI / LMS Strategy

Long-term exports:

```text
PDF
JSON
CSV
QTI 3.x
```

Prioritize QTI for interoperability.

Architecture should avoid hardcoding CognitiveWizard-specific quiz formats into every integration.

Create an export abstraction:

```text
QuizVersion
   ↓
Export Adapter
   ├── PDF
   ├── JSON
   ├── CSV
   └── QTI
```

---

# 38. APIs

Suggested API structure:

```text
POST   /tutor/quizzes
GET    /tutor/quizzes
GET    /tutor/quizzes/:id
PATCH  /tutor/quizzes/:id
DELETE /tutor/quizzes/:id

POST   /tutor/quizzes/:id/generate
GET    /tutor/quizzes/:id/generation/:run_id

POST   /tutor/quizzes/:id/versions
GET    /tutor/quizzes/:id/versions

GET    /tutor/quiz-versions/:version_id
PATCH  /tutor/quiz-versions/:version_id

POST   /tutor/questions/:id/regenerate
PATCH  /tutor/questions/:id
DELETE /tutor/questions/:id

POST   /tutor/quizzes/:id/publish
POST   /tutor/quizzes/:id/archive

POST   /tutor/quizzes/:id/assign
GET    /tutor/quizzes/:id/assignments

POST   /tutor/quizzes/:id/export
```

Keep existing routes compatible where practical, but migrate toward resource-oriented APIs.

---

# 39. Data Model Evolution

Keep:

```text
Quiz
QuizVersion
QuizQuestion
QuizInvitation
```

Add/consider:

```text
QuizSource
QuizLearningObjective
QuizQuestionSource
QuizAttempt
QuizAttemptAnswer
QuestionBankItem
QuizAssignment
QuizGenerationRun
QuizEvaluation
```

Potential relationships:

```text
Quiz
 ├── QuizVersion
 │     └── QuizQuestion
 │           └── QuizQuestionSource
 │
 ├── QuizAssignment
 │
 └── QuizGenerationRun

QuizAttempt
 └── QuizAttemptAnswer

QuestionBankItem
```

Use normalized relational entities for queryable relationships and JSON only where schema flexibility is genuinely needed.

---

# 40. Generation Run / Observability

Create a generation run record.

Track:

```text
run_id
quiz_id
status
model
provider
started_at
completed_at
latency
tokens
estimated_cost
retrieval_count
generated_count
validation_failures
retry_count
quality_score
error
```

This should integrate with existing LangSmith monitoring work.

Every LangGraph generation should be traceable by:

```text
user_id
tutor_id
quiz_id
generation_run_id
```

Do not log sensitive learner content unnecessarily.

---

# 41. Error Handling

Use typed errors:

```text
SOURCE_UNAVAILABLE
RETRIEVAL_FAILED
GENERATION_FAILED
INVALID_OUTPUT
VALIDATION_FAILED
EVALUATION_FAILED
PUBLISH_VALIDATION_FAILED
UNAUTHORIZED
QUIZ_NOT_FOUND
VERSION_NOT_FOUND
```

Frontend should display actionable messages.

Never expose raw internal exceptions to tutors.

---

# 42. Performance

Generation is asynchronous/streamed.

Requirements:

```text
SSE status streaming
non-blocking LLM calls
bounded concurrency
timeouts
retry policy
cancellation support
```

Do not use arbitrary frontend timers to fake progress.

For long generation:

```text
request
 ↓
generation_run
 ↓
background execution
 ↓
SSE/WebSocket status
 ↓
completed result
```

Use Celery/Redis if generation duration or scale requires background execution.

---

# 43. Security

Enforce tutor ownership server-side.

Every mutation must validate:

```text
authenticated user
role == tutor
resource.owner == current user
```

Never rely only on frontend route protection.

Validate:

```text
input length
question count
allowed question types
URLs
uploaded files
generation parameters
```

Apply rate limits to:

```text
quiz generation
question regeneration
bulk imports
assignment invitations
```

---

# 44. Testing Requirements

## Unit

Test:

```text
blueprint calculation
question schema validation
difficulty distribution
Bloom distribution
duplicate detection
answer validation
version creation
ownership checks
token validation
```

## Graph

Test:

```text
analyzer
retriever
planner
generator
validators
evaluator
retry paths
failure paths
```

## API

Test:

```text
create quiz
generate
save version
edit question
delete question
publish
assign
export
```

## Frontend

Test:

```text
configuration
source switching
generation states
review editing
question regeneration
publish validation
error states
responsive layout
```

## End-to-End

Minimum flow:

```text
Tutor login
 ↓
Create quiz
 ↓
Select source
 ↓
Generate
 ↓
Review
 ↓
Edit
 ↓
Preview
 ↓
Publish
 ↓
Assign
 ↓
Learner attempts
 ↓
Tutor views analytics
```

---

# 45. Acceptance Criteria

## Generation

- [ ] Tutor can create a quiz draft.
- [ ] Tutor can select supported source types.
- [ ] Source data reaches backend correctly.
- [ ] Actual Reference Retriever is used where appropriate.
- [ ] Blueprint is created before question generation.
- [ ] Question distribution follows blueprint.
- [ ] Generated questions contain required schema.
- [ ] Questions are source-grounded when applicable.
- [ ] Deterministic validation runs.
- [ ] Semantic evaluation runs.
- [ ] Failed evaluation never produces a false 100% score.
- [ ] Duplicate detection is real, not simulated.
- [ ] Failed questions can be regenerated independently.

## Review

- [ ] Tutor can edit all supported question fields.
- [ ] Tutor can add/delete/duplicate/reorder.
- [ ] Tutor can regenerate one question.
- [ ] Tutor can request difficulty changes.
- [ ] Tutor can improve distractors/explanations.
- [ ] Warnings are visible.
- [ ] Source evidence is visible.
- [ ] Quality score is visible.
- [ ] Tutor edits are preserved.

## Persistence

- [ ] Quiz is created before generation.
- [ ] Draft versions persist.
- [ ] Published versions are immutable.
- [ ] Editing published content creates a new version.
- [ ] Version ownership is enforced.

## Publishing

- [ ] Publish API is real.
- [ ] Assignment API is real.
- [ ] Email dispatch is real/asynchronous.
- [ ] Invitation tokens are securely handled.
- [ ] Expiry and attempt limits work.
- [ ] Public links are generated dynamically.
- [ ] Preview works before publication.

## Analytics

- [ ] Attempts are persisted.
- [ ] Answers are persisted.
- [ ] Scores are calculated.
- [ ] Question performance is available.
- [ ] Skill performance foundation exists.

---

# 46. Implementation Rules for AI Coding Assistant

1. Inspect current repository before modifying code.
2. Use latest/default branch as source of truth.
3. Do not recreate modules that already exist.
4. Reuse existing authentication, models, API utilities, LLM provider factory, LangGraph infrastructure, logging, configuration and database conventions.
5. Preserve existing working functionality.
6. Avoid large unrelated refactors.
7. Implement incrementally.
8. Keep frontend/backend contracts synchronized.
9. Never implement a UI control whose backend behavior is fake.
10. Remove or replace mock implementations when implementing production functionality.
11. Do not simulate retrieval, validation, duplicate detection or progress.
12. Do not silently fall back to a successful quality score when evaluation fails.
13. Add migrations for schema changes.
14. Add tests for every new critical path.
15. Keep generated questions structured and validated.
16. Prefer deterministic validation before LLM evaluation.
17. Keep published versions immutable.
18. Enforce resource ownership server-side.
19. Keep source references attached to generated questions.
20. Maintain compatibility with existing CognitiveWizard architecture.
21. Integrate with the existing Reference Retriever instead of creating another web-search implementation.
22. Integrate generation tracing with LangSmith.
23. Use existing provider/model abstraction instead of hardcoding an LLM.
24. Do not expose secrets, raw invitation tokens or unnecessary user content in logs.
25. Do not mark incomplete functionality as complete.

---

# 47. Recommended Implementation Order

Implement in this order.

## Phase 1 — Stabilize Current Quiz Studio

```text
1. Create Quiz draft lifecycle
2. Fix source/context propagation
3. Replace simulated retriever
4. Add deterministic validators
5. Fix evaluator failure behavior
6. Implement real duplicate detection
7. Implement real question regeneration
8. Persist generation runs
9. Fix draft/version persistence
```

## Phase 2 — Assessment Authoring

```text
10. Assessment Blueprint
11. Learning Objectives
12. Assessment Purpose
13. Bloom distribution
14. Difficulty distribution
15. Question quality scoring
16. Source evidence
17. AI Question Copilot
```

## Phase 3 — Publishing

```text
18. Immutable versions
19. Preview
20. Real publish API
21. Assignment API
22. Secure invitations
23. Real email dispatch
24. Dynamic share links
```

## Phase 4 — Question Bank & Import

```text
25. Question Bank
26. Search/filter/tagging
27. PDF import
28. DOCX/PPTX import
29. CSV/XLSX import
30. QTI import/export
```

## Phase 5 — Analytics

```text
31. Attempts
32. Answers
33. Score engine
34. Question analytics
35. Skill analytics
36. Tutor dashboard
37. Reports
```

## Phase 6 — Adaptive Learning

```text
38. Skill mastery
39. Knowledge-gap detection
40. Personalized recommendations
41. Adaptive question selection
42. CognitiveWizard roadmap integration
```

---

# 48. Definition of Done

Quiz Studio should be considered production-ready only when:

```text
✓ real sources work
✓ real retrieval works
✓ generation is structured
✓ validation is deterministic + semantic
✓ questions are evidence-grounded where applicable
✓ tutor can fully review/edit
✓ AI copilot works at question level
✓ drafts persist
✓ versions are immutable after publication
✓ publishing is real
✓ assignment is real
✓ invitation security is implemented
✓ learner attempts persist
✓ analytics work
✓ generation is observable
✓ tests cover critical flows
✓ no core functionality is mocked
```

The target is not simply "generate good questions".

The target is:

> **Create a trustworthy AI-assisted assessment lifecycle from source material to learning intelligence.**
