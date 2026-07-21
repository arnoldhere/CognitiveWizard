const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

/**
 * WizardQuestionSet
 * -----------------
 * Stores admin-managed question sets per content type for the Wizard module.
 *
 * Each record represents one content type (e.g. "Roadmap") and holds its
 * ordered array of questions as JSON.
 *
 * questions JSON shape (array of question objects):
 * [
 *   {
 *     key: string,          // unique field key, used in answers map
 *     label: string,        // question text shown to user
 *     type: "text" | "select" | "number" | "date",
 *     placeholder?: string, // for text / number inputs
 *     options?: string[],   // for select type
 *     required?: boolean    // default true
 *   }
 * ]
 */
const WizardQuestionSet = sequelize.define('WizardQuestionSet', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    content_type: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
        comment: 'Content type identifier e.g. Roadmap, Guide, Schedule',
    },
    label: {
        type: DataTypes.STRING(100),
        allowNull: false,
        comment: 'Display label shown to users in the wizard',
    },
    description: {
        type: DataTypes.STRING(255),
        allowNull: true,
        comment: 'Short description shown as subtitle in wizard content type card',
    },
    icon: {
        type: DataTypes.STRING(50),
        allowNull: true,
        comment: 'MUI icon name for this content type',
        defaultValue: 'ExploreRounded',
    },
    questions: {
        type: DataTypes.JSON,
        allowNull: false,
        defaultValue: [],
        comment: 'Ordered array of question objects',
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Whether this content type appears in the wizard',
    },
    sort_order: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order in wizard content type picker',
    },
}, {
    tableName: 'wizard_question_sets',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = WizardQuestionSet;
