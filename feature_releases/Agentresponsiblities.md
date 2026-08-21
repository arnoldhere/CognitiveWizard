## Agent responsiblities

1. Learning Architect

- Input:

```
Python
Beginner
Goal: become backend developer
10 hours/week
```

- Produces:

```
phases
modules
lessons
dependencies
learning objectives
difficulty progression
estimated effort
```

> It should not generate lesson prose.

2. Research Agent

- for each lessions:

```
Lesson
 ↓
identify concepts requiring evidence
 ↓
search trusted sources
 ↓
rank sources
 ↓
deduplicate
 ↓
return evidence package
```

> existing Reference Retriever worfklow should become this agent's primary tool rather than being an afterthought.

3. Content generator

- Input:

```
lesson blueprint
+
learner profile
+
research package
```

- produces:

```
explanation
examples
analogies
code
visual descriptions
common mistakes
practical task
```

> goal is to provide actual lesson

4. Assesment Agent

- generate:

```
Pre-check
↓
Lesson knowledge check
↓
Practice
↓
Module assessment
↓
Phase assessment
↓
Capstone
```

- use Bloom-styled progression:

```
Remember
Understand
Apply
Analyze
Evaluate
Create
```

> Don't make every lesson an MCQ generator.

5. Pedagogical Reviewer
   after generation: lession -> reviewer

- check for:

```
✓ learning objective covered?
✓ explanation sufficient?
✓ examples correct?
✓ difficulty appropriate?
✓ prerequisite dependency satisfied?
✓ no hallucinated facts?
✓ references support claims?
✓ no duplicated content?
✓ estimated time realistic?
```

if failed:

```
Reviewer
   │
   ├── PASS → Quality Gate
   │
   └── FAIL → Content Generator
```
