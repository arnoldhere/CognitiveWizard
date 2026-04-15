import { useState } from "react";
import { generateQuiz, submitQuiz as submitQuizRequest } from "../services/api";

export const useQuiz = () => {
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [quizSession, setQuizSession] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const createQuiz = async (input) => {
    try {
      setGenerating(true);
      setError(null);
      setResult(null);

      const data = await generateQuiz(input);
      setQuizSession(data?.data || null);
    } catch (err) {
      console.error("Error in useQuiz hook:", err);
      setError(err.response?.data?.detail || "Failed to generate quiz.");
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async (answers) => {
    if (!quizSession?.quiz_id) {
      return null;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data = await submitQuizRequest({
        quiz_id: quizSession.quiz_id,
        answers,
      });

      setResult(data);
      setQuizSession(null);
      return data;
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError(err.response?.data?.detail || "Failed to submit quiz.");
      throw err;
    } finally {
      setSubmitting(false);
    }
  };

  const resetQuiz = () => {
    setQuizSession(null);
    setResult(null);
    setError(null);
  };

  return {
    generating,
    submitting,
    quizSession,
    result,
    error,
    createQuiz,
    submitQuiz,
    resetQuiz,
  };
};
