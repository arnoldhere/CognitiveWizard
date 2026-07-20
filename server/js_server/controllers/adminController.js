/**
 * controllers/adminController.js
 * ================================
 * Admin-only controller handling KPI stats, user management,
 * and LLM configuration CRUD operations.
 */

const { Op, fn, col, literal } = require("sequelize");
const { User, ChatSession, LLMConfig } = require("../models");
const logger = require("../utils/logger");

// Lazy-load optional models to avoid crashes if tables don't exist yet
let Grade, RAGQueryLog, WizardContent;
try { Grade = require("../models/Grade"); } catch (_) {}
try { RAGQueryLog = require("../models/RAGLog"); } catch (_) {}
try { WizardContent = require("../models/WizardContent"); } catch (_) {}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build daily registration counts for the past N days.
 * Returns an array of { date, count } objects in ascending order.
 */
async function getDailyRegistrations(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await User.findAll({
    attributes: [
      [fn("DATE", col("created_at")), "date"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: { created_at: { [Op.gte]: since } },
    group: [fn("DATE", col("created_at"))],
    order: [[fn("DATE", col("created_at")), "ASC"]],
    raw: true,
  });

  // Fill missing days with 0
  const map = {};
  rows.forEach((r) => { map[r.date] = parseInt(r.count, 10); });

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10); // "YYYY-MM-DD"
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    result.push({ date: key, label, users: map[key] || 0 });
  }
  return result;
}

/**
 * Build daily chat session counts for the past N days.
 */
async function getDailyChatActivity(days = 7) {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const rows = await ChatSession.findAll({
    attributes: [
      [fn("DATE", col("created_at")), "date"],
      [fn("COUNT", col("id")), "count"],
    ],
    where: { created_at: { [Op.gte]: since } },
    group: [fn("DATE", col("created_at"))],
    order: [[fn("DATE", col("created_at")), "ASC"]],
    raw: true,
  });

  const map = {};
  rows.forEach((r) => { map[r.date] = parseInt(r.count, 10); });

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(since);
    d.setDate(since.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = d.toLocaleDateString("en-US", { weekday: "short" });
    result.push({ date: key, label, chats: map[key] || 0 });
  }
  return result;
}

// ─── Controller Functions ──────────────────────────────────────────────────────

async function getStats(req, res, next) {
  try {
    // ── Core user metrics ────────────────────────────────────────────
    const [totalUsers, activeUsers] = await Promise.all([
      User.count(),
      User.count({ where: { is_active: true } }),
    ]);
    const disabledUsers = totalUsers - activeUsers;

    // New users in the last 24h and last 7 days
    const now = new Date();
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [newUsersToday, newUsersThisWeek] = await Promise.all([
      User.count({ where: { created_at: { [Op.gte]: oneDayAgo } } }),
      User.count({ where: { created_at: { [Op.gte]: sevenDaysAgo } } }),
    ]);

    // ── Chat metrics ─────────────────────────────────────────────────
    const [totalChats, chatsToday, chatsThisWeek] = await Promise.all([
      ChatSession.count(),
      ChatSession.count({ where: { created_at: { [Op.gte]: oneDayAgo } } }),
      ChatSession.count({ where: { created_at: { [Op.gte]: sevenDaysAgo } } }),
    ]);

    // ── Quiz metrics ─────────────────────────────────────────────────
    let totalQuizzes = 0;
    let avgScore = null;
    let passRate = null;

    if (Grade) {
      const [quizCount, gradeAgg] = await Promise.all([
        Grade.count(),
        Grade.findOne({
          attributes: [
            [fn("AVG", col("score_percentage")), "avg_score"],
            [fn("SUM", literal("CASE WHEN result = 'pass' THEN 1 ELSE 0 END")), "passes"],
            [fn("COUNT", col("id")), "total"],
          ],
          raw: true,
        }),
      ]);
      totalQuizzes = quizCount;
      if (gradeAgg?.total > 0) {
        avgScore = parseFloat(gradeAgg.avg_score || 0).toFixed(1);
        passRate = parseFloat((gradeAgg.passes / gradeAgg.total) * 100).toFixed(1);
      }
    }

    // ── Wizard content metrics ───────────────────────────────────────
    let totalWizardContent = 0;
    if (WizardContent) {
      totalWizardContent = await WizardContent.count();
    }

    // ── RAG latency metrics ──────────────────────────────────────────
    let avgLatencyMs = null;
    if (RAGQueryLog) {
      const latencyRow = await RAGQueryLog.findOne({
        attributes: [[fn("AVG", col("latency_total_ms")), "avg_latency"]],
        raw: true,
      });
      if (latencyRow?.avg_latency) {
        avgLatencyMs = parseFloat(latencyRow.avg_latency).toFixed(0);
      }
    }

    // ── Time-series chart data ───────────────────────────────────────
    const [dailyRegistrations, dailyChatActivity] = await Promise.all([
      getDailyRegistrations(7),
      getDailyChatActivity(7),
    ]);

    res.json({
      // Core KPIs
      totalUsers,
      activeUsers,
      disabledUsers,
      newUsersToday,
      newUsersThisWeek,

      // Chat
      totalChats,
      chatsToday,
      chatsThisWeek,

      // Quiz
      totalQuizzes,
      avgScore,
      passRate,

      // Wizard
      totalWizardContent,

      // RAG
      avgLatencyMs,

      // Chart series
      dailyRegistrations,
      dailyChatActivity,
    });
  } catch (err) {
    logger.error("[ADMIN] getStats error:", err);
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await User.findAll({
      attributes: ["id", "email", "full_name", "role", "is_active", "created_at"],
      order: [["created_at", "DESC"]],
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
}

async function toggleUserStatus(req, res, next) {
  try {
    const { id } = req.params;
    const { is_active } = req.body;

    const user = await User.findByPk(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.is_active = is_active;
    await user.save();

    res.json({ success: true, user: { id: user.id, is_active: user.is_active } });
  } catch (err) {
    next(err);
  }
}

async function getLLMConfigs(req, res, next) {
  try {
    const configs = await LLMConfig.findAll();
    res.json(configs);
  } catch (err) {
    next(err);
  }
}

async function updateLLMConfig(req, res, next) {
  try {
    const { task_name } = req.params;
    const { temperature, max_new_tokens, top_p, top_k, model_override, use_chat } = req.body;

    let config = await LLMConfig.findByPk(task_name);
    if (!config) {
      config = await LLMConfig.create({ task_name, temperature, max_new_tokens, top_p, top_k, model_override, use_chat });
    } else {
      await config.update({ temperature, max_new_tokens, top_p, top_k, model_override, use_chat });
    }

    res.json({ success: true, config });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getStats,
  getUsers,
  toggleUserStatus,
  getLLMConfigs,
  updateLLMConfig,
};
