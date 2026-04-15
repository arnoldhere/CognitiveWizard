# CognitiveWizard - AI Quiz & Learning Assistant

## 📌 Overview

This project is an AI-powered learning platform that generates personalized quizzes, evaluates user responses, analyzes sentiment, and provides adaptive learning recommendations.

The system leverages transformer-based models using Hugging Face to deliver intelligent and scalable educational experiences.

---


## Core idea
> An AI-driven personalized learning engine
- Generates quizzes dynamically
- Evaluates user understanding
- Analyzes sentiment + confidence
- Adapts learning path

---

## Objectives

* Generate quizzes dynamically based on user input
* Evaluate answers using semantic understanding
* Analyze user sentiment to understand confidence and engagement
* Recommend topics for improved learning outcomes

---

## High-Level Architecture
1. User Interface
    - ReactJS (Web App)
2. Backend
    - FastAPI
    - MySQL
    - Redis + Celery / kafka
3. AI Engine
    - Hugging face transformers
    - Langchain
    - pytorch


## Core Features

### 1. AI Quiz Generation

* Input: topic, difficulty
* Output: MCQs or subjective questions
* Powered by transformer models
* **NEW**: Robust parsing and validation with auto-fix

### 2. Summarization Engine

* user inputs pdf, url (blog or article) or Youtube url
* input data is preproccesed and divided to chunks and sent to Llama model for summarization
* summarization is displayed in readable format for quick study

### 3. AI powered Study planner

* Input:
    - User goals (exam, skill, deadline)
    - Available time
    - Current knowledge level
* Output: personalized study schedule
    - Dynamically adjusts plan based on:
    - Performance in quizzes
    - Learning pace
    - Missed sessions
* Features:
    - Daily / weekly roadmap
    - Topic prioritization (weak → strong areas)
    - Smart revision cycles (spaced repetition)
    - Break and workload optimization
    - rescheduling on missed tasks


### 4. Sentiment Analysis

* Detect user confidence and frustration levels
* Improve personalization

### 5. Recommendation System

* Suggest next topics based on:

  * Performance
  * Sentiment
  * Weak areas

---


## Evaluation Metrics

* Accuracy of answer evaluation
* Quality of generated questions
* User engagement and retention
* Quiz generation success rate

---

## 🚀 Future Enhancements

* Voice-based quizzes
* Adaptive difficulty tuning
* Multi-language support
* Fine-tuned domain-specific models
* Multiple question types (multiple answer, true/false, etc.)
* Answer explanation generation

---

## 💡 Key Insight

This project combines NLP, LLMs, and system design to simulate a real-world intelligent tutoring system, making it highly relevant for industry applications. The improved quiz pipeline ensures reliability and maintainability for production deployments.