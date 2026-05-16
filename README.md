# CognitiveWizard - AI Quiz & Learning Assistant

## 📌 Overview

CognitiveWizard is an AI-powered learning platform that provides adaptive and smart materials and tools for learning and study purpose.

The platform provides Quiz and Summarization engine, RAG powered chatbot and more tools.

---


## Core idea
> An AI-driven personalized learning engine
- Generates quizzes dynamically
- Summarization for quick notes and study
- Personal assistant for study & chat
- Adapts learning path

---

## High-Level Architecture
1. User Interface
    - ReactJS + VITE
2. Backend
    - FastAPI
    - Redis + Celery / kafka
3. AI Engine
    - Hugging face transformers
    - Langchain
    - pytorch
4. Storage
    - MySQL
    - chromaDB for embeddings
    - MongoDB for chat storage


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

### 3. AI powered Study planner (not released)

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


### 4. RAG Powered Chatbot
    A personal assitant for study related chat with modern techniques such as RAG, Langchain. It features a query router that dynamically selects between user-uploaded documents and external knowledge bases, followed by a retriever, a re-ranker, and an LLM generator.

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
2
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