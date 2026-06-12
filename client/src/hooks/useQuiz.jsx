import { useState } from "react";
import { generateQuiz, submitQuiz as submitQuizRequest } from "../services/api";
import { getApiErrorMessage } from "../utils/apiError";

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
      setError(getApiErrorMessage(err, "Failed to generate quiz. Please try again."));
    } finally {
      setGenerating(false);
    }
  };

  const submitQuiz = async ({ answers, isAutoSubmitted = false }) => {
    if (!quizSession?.quiz_id) {
      return null;
    }

    try {
      setSubmitting(true);
      setError(null);

      const data = await submitQuizRequest({
        quiz_id: quizSession.quiz_id,
        answers,
        is_auto_submitted: isAutoSubmitted,
      });

      setResult(data);
      setQuizSession(null);
      return data;
    } catch (err) {
      console.error("Error submitting quiz:", err);
      setError(getApiErrorMessage(err, "Failed to submit quiz. Please try again."));
      setQuizSession(null);
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
