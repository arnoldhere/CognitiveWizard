/**
 * controllers/wizardQuestionSetController.js
 * ============================================
 * Admin CRUD + public read for WizardQuestionSet.
 *
 * Public  → GET /wizard/question-sets        (authenticated users)
 * Admin   → GET/POST/PUT/DELETE /admin/wizard-questions/*
 */

const { WizardQuestionSet } = require('../models');
const logger = require('../utils/logger');

const ALLOWED_CONTENT_TYPES = ['Roadmap', 'Course/Syllabus', 'Guide', 'Schedule'];

function validateContentType(contentType) {
    return typeof contentType === 'string' && contentType.trim() && ALLOWED_CONTENT_TYPES.includes(contentType.trim());
}

// ─── Public: used by the Wizard frontend ──────────────────────────────────────

/**
 * GET /wizard/question-sets
 * Returns all active question sets ordered by sort_order.
 */
async function getActiveQuestionSets(req, res, next) {
    try {
        const sets = await WizardQuestionSet.findAll({
            where: { is_active: true },
            order: [['sort_order', 'ASC']],
        });
        res.json(sets);
    } catch (err) {
        next(err);
    }
}

// ─── Admin CRUD ───────────────────────────────────────────────────────────────

/**
 * GET /admin/wizard-questions
 * Returns ALL question sets (active + inactive) for the admin panel.
 */
async function getAllQuestionSets(req, res, next) {
    try {
        const sets = await WizardQuestionSet.findAll({
            order: [['sort_order', 'ASC']],
        });
        res.json(sets);
    } catch (err) {
        next(err);
    }
}

/**
 * POST /admin/wizard-questions
 * Creates a new question set.
 */
async function createQuestionSet(req, res, next) {
    try {
        const { content_type, label, description, icon, questions, is_active, sort_order } = req.body;

        if (!content_type || !label) {
            return res.status(400).json({ error: 'content_type and label are required.' });
        }

        if (!validateContentType(content_type)) {
            return res.status(400).json({ error: 'content_type must be one of: Roadmap, Course/Syllabus, Guide, Schedule.' });
        }

        // Validate questions array
        if (!Array.isArray(questions)) {
            return res.status(400).json({ error: 'questions must be an array.' });
        }

        for (const q of questions) {
            if (!q.key || !q.label || !q.type) {
                return res.status(400).json({ error: 'Each question must have key, label, and type.' });
            }
            if (q.type === 'select' && (!Array.isArray(q.options) || q.options.length === 0)) {
                return res.status(400).json({ error: `Question "${q.label}" (type: select) must have at least one option.` });
            }
        }

        const set = await WizardQuestionSet.create({
            content_type,
            label,
            description,
            icon,
            questions,
            is_active: is_active !== undefined ? is_active : true,
            sort_order: sort_order !== undefined ? sort_order : 99,
        });

        logger.info(`[ADMIN] Wizard question set created: ${content_type}`);
        res.status(201).json(set);
    } catch (err) {
        if (err.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ error: `A question set for content type "${req.body.content_type}" already exists.` });
        }
        next(err);
    }
}

/**
 * PUT /admin/wizard-questions/:id
 * Updates an existing question set.
 */
async function updateQuestionSet(req, res, next) {
    try {
        const { id } = req.params;
        const { content_type, label, description, icon, questions, is_active, sort_order } = req.body;

        const set = await WizardQuestionSet.findByPk(id);
        if (!set) return res.status(404).json({ error: 'Question set not found.' });

        if (content_type !== undefined && !validateContentType(content_type)) {
            return res.status(400).json({ error: 'content_type must be one of: Roadmap, Course/Syllabus, Guide, Schedule.' });
        }

        if (questions !== undefined) {
            if (!Array.isArray(questions)) {
                return res.status(400).json({ error: 'questions must be an array.' });
            }
            for (const q of questions) {
                if (!q.key || !q.label || !q.type) {
                    return res.status(400).json({ error: 'Each question must have key, label, and type.' });
                }
                if (q.type === 'select' && (!Array.isArray(q.options) || q.options.length === 0)) {
                    return res.status(400).json({ error: `Question "${q.label}" (type: select) must have at least one option.` });
                }
            }
        }

        await set.update({
            ...(content_type !== undefined && { content_type }),
            ...(label !== undefined && { label }),
            ...(description !== undefined && { description }),
            ...(icon !== undefined && { icon }),
            ...(questions !== undefined && { questions }),
            ...(is_active !== undefined && { is_active }),
            ...(sort_order !== undefined && { sort_order }),
        });

        logger.info(`[ADMIN] Wizard question set updated: id=${id}`);
        res.json(set);
    } catch (err) {
        next(err);
    }
}

/**
 * DELETE /admin/wizard-questions/:id
 * Deletes a question set.
 */
async function deleteQuestionSet(req, res, next) {
    try {
        const { id } = req.params;
        const set = await WizardQuestionSet.findByPk(id);
        if (!set) return res.status(404).json({ error: 'Question set not found.' });

        await set.destroy();
        logger.info(`[ADMIN] Wizard question set deleted: id=${id}`);
        res.json({ success: true, message: 'Question set deleted.' });
    } catch (err) {
        next(err);
    }
}

/**
 * PATCH /admin/wizard-questions/:id/toggle
 * Quickly toggles is_active.
 */
async function toggleQuestionSet(req, res, next) {
    try {
        const { id } = req.params;
        const set = await WizardQuestionSet.findByPk(id);
        if (!set) return res.status(404).json({ error: 'Question set not found.' });

        set.is_active = !set.is_active;
        await set.save();
        res.json({ success: true, id: set.id, is_active: set.is_active });
    } catch (err) {
        next(err);
    }
}

module.exports = {
    getActiveQuestionSets,
    getAllQuestionSets,
    createQuestionSet,
    updateQuestionSet,
    deleteQuestionSet,
    toggleQuestionSet,
};
