const { Quiz } = require('../models');

const PASS_THRESHOLD = 60.0;

function getTimeLimitSeconds(totalQuestions) {
  if (totalQuestions <= 5) return 8 * 60;
  if (totalQuestions <= 10) return 15 * 60;
  if (totalQuestions <= 15) return 20 * 60;
  if (totalQuestions <= 20) return 30 * 60;

  const extraBlocks = Math.floor((totalQuestions - 20 + 4) / 5);
  return (30 + (extraBlocks * 8)) * 60;
}

function normalizeAnswer(answer, options) {
  const answerValue = String(answer).trim();
  for (const option of options) {
    const normalizedOption = String(option).trim();
    if (normalizedOption.toLowerCase() === answerValue.toLowerCase()) {
      return normalizedOption;
    }
  }
  return answerValue;
}

function buildQuizSummary(grade) {
  if (grade.result === "pass") {
    return `You passed this ${grade.quiz_topic} quiz with ${grade.correct_answers} out of ${grade.total_questions} correct.`;
  }
  return `You did not pass this ${grade.quiz_topic} quiz yet. You got ${grade.correct_answers} out of ${grade.total_questions} correct.`;
}

module.exports = {
  PASS_THRESHOLD,
  getTimeLimitSeconds,
  normalizeAnswer,
  buildQuizSummary
};
