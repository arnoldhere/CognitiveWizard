/**
 * controllers/adminController.js
 * ================================
 * Admin-only controller handling KPI stats, user management,
 * and LLM configuration CRUD operations.
 */

const { Op, fn, col, literal } = require("sequelize");
const { User, ChatSession, LLMConfig, CourseChapter, CourseModule, CourseLesson } = require("../models");
const logger = require("../utils/logger");
const {
  encodeCursor,
  decodeCursor,
  buildCursorWhere,
  validateSortField,
  validateSortOrder,
} = require("../utils/paginationHelper");

const ALLOWED_COURSE_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "topic",
  "content_type",
  "status",
  "id",
];

// Lazy-load optional models to avoid crashes if tables don't exist yet
let Quiz, RAGQueryLog, WizardContent;
try { Quiz = require("../models/Quiz"); } catch (_) { }
try { RAGQueryLog = require("../models/RAGLog"); } catch (_) { }
try { WizardContent = require("../models/WizardContent"); } catch (_) { }

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

    if (Quiz) {
      const [quizCount, gradeAgg] = await Promise.all([
        Quiz.count(),
        Quiz.findOne({
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

async function getCourses(req, res, next) {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 10, 1), 100);
    const page = Math.max(parseInt(req.query.page, 10) || 0, 0);
    const search = (req.query.search || "").trim();
    const contentType = (req.query.contentType || "").trim();
    const userRole = (req.query.userRole || "").trim();
    const cursor = (req.query.cursor || "").trim();

    // Whitelist sort field and order
    const sortField = validateSortField(req.query.sortField, ALLOWED_COURSE_SORT_FIELDS, "created_at");
    const sortOrder = validateSortOrder(req.query.sortOrder, "DESC");

    const where = {};
    if (contentType && contentType !== "all") {
      where.content_type = contentType;
    }

    const hasUserFilter = Boolean(userRole) || Boolean(search);

    if (search) {
      where[Op.or] = [
        { topic: { [Op.like]: `%${search}%` } },
        { '$user.email$': { [Op.like]: `%${search}%` } },
        { '$user.full_name$': { [Op.like]: `%${search}%` } },
      ];
    }

    if (userRole) {
      where['$user.role$'] = userRole;
    }

    // Determine pagination mode: Cursor vs Offset
    const cursorData = cursor ? decodeCursor(cursor) : null;
    let isCursorPaging = false;

    if (cursorData) {
      const cursorWhere = buildCursorWhere(cursorData, sortField, sortOrder);
      if (cursorWhere) {
        where[Op.and] = where[Op.and] ? [...where[Op.and], cursorWhere] : [cursorWhere];
        isCursorPaging = true;
      }
    }

    const offset = isCursorPaging ? 0 : page * limit;

    // Build order array with secondary deterministic sort key (id)
    const order = [
      [sortField, sortOrder],
      ["id", sortOrder],
    ];

    // Optimize Count Query: Decouple from heavy row fetching & avoid joining User unless required by filters
    const countPromise = hasUserFilter
      ? WizardContent.count({
          where,
          include: [
            {
              model: User,
              as: "user",
              attributes: [],
            },
          ],
          distinct: true,
          col: "id",
        })
      : WizardContent.count({ where });

    // Rows Query: NEVER fetch large JSON `content` in list view!
    const rowsPromise = WizardContent.findAll({
      where,
      attributes: [
        "id",
        "user_id",
        "topic",
        "content_type",
        "status",
        "created_at",
        "updated_at",
      ],
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
      ],
      order,
      limit: limit + 1,
      offset,
    });

    const [count, rawRows] = await Promise.all([countPromise, rowsPromise]);

    const hasMore = rawRows.length > limit;
    const rows = hasMore ? rawRows.slice(0, limit) : rawRows;
    const nextCursor = hasMore && rows.length > 0 ? encodeCursor(rows[rows.length - 1], sortField) : null;

    res.json({
      data: rows,
      total: count,
      page: isCursorPaging ? null : page,
      totalPages: Math.ceil(count / limit),
      pagination: {
        next_cursor: nextCursor,
        has_more: hasMore,
        limit,
      },
    });
  } catch (err) {
    logger.error("[ADMIN] getCourses error:", err);
    next(err);
  }
}

/**
 * GET /admin/courses/:id
 * Fetch complete course details on-demand (when modal is opened).
 */
async function getCourseById(req, res, next) {
  try {
    const { id } = req.params;
    const course = await WizardContent.findByPk(id, {
      include: [
        {
          model: User,
          as: "user",
          attributes: ["id", "full_name", "email", "role"],
        },
        {
          model: CourseChapter,
          as: "chapters",
          include: [
            {
              model: CourseModule,
              as: "modules",
              include: [
                {
                  model: CourseLesson,
                  as: "lessons",
                },
              ],
            },
          ],
        },
      ],
    });

    if (!course) {
      return res.status(404).json({ error: "Course not found" });
    }

    res.json(course);
  } catch (err) {
    logger.error(`[ADMIN] getCourseById error for id ${req.params.id}:`, err);
    next(err);
  }
}

module.exports = {
  getStats,
  getUsers,
  toggleUserStatus,
  getLLMConfigs,
  updateLLMConfig,
  getCourses,
  getCourseById,
};
