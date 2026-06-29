const { pyAxios } = require("../utils/apiProxy");
const logger = require("../utils/logger");
const { Grade } = require("../models");
const {
  getTimeLimitSeconds,
  normalizeAnswer,
  buildQuizSummary,
  PASS_THRESHOLD
} = require("../services/quizGradeService");

/**
 * POST /quiz/generate
 * Generate a new quiz using the AI quiz generator.
 */
async function generateQuiz(req, res, next) {
  try {
    const { topic, difficulty, num_questions, mode } = req.body || {};
    logger.info(`[QUIZ] Generate: topic="${topic}", difficulty="${difficulty}", count=${num_questions} by ${req.user?.email}`);

    // Call py_server to generate raw quiz content
    const aiResponse = await pyAxios.post("/quiz/generate-raw", {
      topic,
      difficulty,
      num_questions,
      mode
    });

    const generatedQuestions = aiResponse.data.data;
    
    // Process and Save in JS MySQL
    const question_set = [];
    const answer_key = [];

    generatedQuestions.forEach((question, i) => {
      const index = i + 1;
      const options = question.options.map(opt => String(opt).trim());
      const answer = normalizeAnswer(question.answer, options);

      question_set.push({
        question_id: index,
        question: String(question.question).trim(),
        options: options
      });
      answer_key.push({ question_id: index, answer: answer });
    });

    const total_questions = question_set.length;

    const grade = await Grade.create({
      user_id: req.user.id,
      quiz_topic: String(topic).trim(),
      difficulty: String(difficulty).trim(),
      total_questions: total_questions,
      result: "pending",
      pass_threshold: PASS_THRESHOLD,
      time_limit_seconds: getTimeLimitSeconds(total_questions),
      question_set: question_set,
      answer_key: answer_key,
      started_at: new Date()
    });

    res.json({
      status: "success",
      data: {
        quiz_id: grade.id,
        topic: grade.quiz_topic,
        difficulty: grade.difficulty,
        total_questions: grade.total_questions,
        time_limit_seconds: grade.time_limit_seconds,
        questions: grade.question_set,
      }
    });

  } catch (err) {
    if (err.response) {
       return res.status(err.response.status).json(err.response.data);
    }
    next(err);
  }
}

/**
 * POST /quiz/submit
 * Submit answers for a quiz session and receive evaluated results.
 */
async function submitQuiz(req, res, next) {
  try {
    const { quiz_id, is_auto_submitted, answers } = req.body || {};
    logger.info(`[QUIZ] Submit: quiz_id=${quiz_id}, auto=${is_auto_submitted} by ${req.user?.email}`);

    const grade = await Grade.findOne({
      where: { id: quiz_id, user_id: req.user.id }
    });

    if (!grade) {
      return res.status(404).json({ detail: "Quiz session not found" });
    }

    if (grade.result !== "pending") {
      return res.status(400).json({ detail: "This quiz has already been submitted" });
    }

    const submittedAnswers = answers || [];
    
    // Evaluate in JS
    const answerLookup = {};
    (grade.answer_key || []).forEach(item => {
      answerLookup[item.question_id] = String(item.answer).trim();
    });

    const questionLookup = {};
    (grade.question_set || []).forEach(item => {
      questionLookup[item.question_id] = item;
    });

    const submittedLookup = {};
    submittedAnswers.forEach(ans => {
      submittedLookup[ans.question_id] = String(ans.selected_option || "").trim();
    });

    const expectedIds = Object.keys(questionLookup);
    const submittedIds = Object.keys(submittedLookup).filter(id => submittedLookup[id]);

    if (!is_auto_submitted && submittedIds.length !== expectedIds.length) {
      return res.status(400).json({ detail: "Please answer every question before submitting" });
    }

    let correct_answers = 0;
    const feedback_items = [];

    expectedIds.forEach(question_id => {
      const question = questionLookup[question_id];
      const selected_option = submittedLookup[question_id] || null;
      const correct_answer = answerLookup[question_id] || "";

      const is_correct = selected_option && selected_option === correct_answer;
      if (is_correct) correct_answers++;

      let feedback_text = "";
      if (!selected_option) {
        feedback_text = "No answer selected. Review this concept and try again.";
      } else if (is_correct) {
        feedback_text = "Correct! You handled this question well.";
      } else {
        feedback_text = `Incorrect. The correct answer is '${correct_answer}'. Review this concept.`;
      }

      feedback_items.push({
        question_id: parseInt(question_id, 10),
        question: question.question,
        selected_option: selected_option,
        correct_answer: correct_answer,
        is_correct: !!is_correct,
        feedback: feedback_text
      });
    });

    const score_percentage = grade.total_questions > 0 
      ? parseFloat(((correct_answers / grade.total_questions) * 100).toFixed(2)) 
      : 0.0;
    
    const result = score_percentage >= grade.pass_threshold ? "pass" : "fail";

    grade.correct_answers = correct_answers;
    grade.score_percentage = score_percentage;
    grade.result = result;
    
    grade.user_answers = expectedIds.map(question_id => ({
      question_id: parseInt(question_id, 10),
      selected_option: submittedLookup[question_id] || ""
    }));

    grade.feedback = feedback_items;
    grade.submitted_at = new Date();

    if (grade.started_at && grade.submitted_at) {
      const elapsedSeconds = Math.max(0, Math.floor((grade.submitted_at - grade.started_at) / 1000));
      grade.time_taken = Math.min(elapsedSeconds, grade.time_limit_seconds);
    }

    await grade.save();

    res.json({
      quiz_id: grade.id,
      topic: grade.quiz_topic,
      difficulty: grade.difficulty,
      total_questions: grade.total_questions,
      correct_answers: grade.correct_answers,
      score_percentage: grade.score_percentage,
      result: grade.result,
      time_limit_seconds: grade.time_limit_seconds,
      time_taken: grade.time_taken,
      is_auto_submitted: !!is_auto_submitted,
      summary: buildQuizSummary(grade),
      feedback: grade.feedback,
      submitted_at: grade.submitted_at
    });

  } catch (err) {
    next(err);
  }
}

/**
 * GET /quiz/results
 * Get paginated quiz result history with optional filtering and sorting.
 */
async function getResults(req, res, next) {
  try {
    const skip = parseInt(req.query.skip) || 0;
    const limit = parseInt(req.query.limit) || 10;
    const sort_by = req.query.sort_by || "submitted_at";
    const sort_order = (req.query.sort_order || "desc").toUpperCase();
    const status_filter = req.query.status_filter;
    const topic_search = req.query.topic_search;

    const where = {
      user_id: req.user.id,
      result: ['pass', 'fail']
    };

    if (status_filter && (status_filter === 'pass' || status_filter === 'fail')) {
      where.result = status_filter;
    }

    if (topic_search) {
      const { Op } = require('sequelize');
      where.quiz_topic = { [Op.like]: `%${topic_search}%` };
    }

    const { count, rows } = await Grade.findAndCountAll({
      where,
      order: [[sort_by, sort_order]],
      offset: skip,
      limit: limit
    });

    const data = rows.map(r => ({
      id: r.id,
      quiz_topic: r.quiz_topic,
      difficulty: r.difficulty,
      result: r.result,
      score_percentage: r.score_percentage,
      submitted_at: r.submitted_at,
      total_questions: r.total_questions,
      correct_answers: r.correct_answers,
      time_taken: r.time_taken,
      time_limit_seconds: r.time_limit_seconds,
    }));

    res.json({
      data: data,
      total: count,
      skip: skip,
      limit: limit,
      pages: count > 0 ? Math.ceil(count / limit) : 0,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /quiz/results/:quiz_id
 * Get detailed result for a specific quiz session.
 */
async function getResultDetail(req, res, next) {
  try {
    const grade = await Grade.findOne({
      where: { id: req.params.quiz_id, user_id: req.user.id }
    });

    if (!grade || !['pass', 'fail'].includes(grade.result)) {
      return res.status(404).json({ detail: "Quiz result not found" });
    }

    res.json({
      id: grade.id,
      quiz_topic: grade.quiz_topic,
      difficulty: grade.difficulty,
      total_questions: grade.total_questions,
      correct_answers: grade.correct_answers,
      score_percentage: grade.score_percentage,
      result: grade.result,
      time_limit_seconds: grade.time_limit_seconds,
      time_taken: grade.time_taken,
      submitted_at: grade.submitted_at,
      user_answers: grade.user_answers || [],
      feedback: grade.feedback || []
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  generateQuiz,
  submitQuiz,
  getResults,
  getResultDetail,
};
