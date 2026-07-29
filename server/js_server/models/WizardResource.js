const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const WizardContent = require("./WizardContent");
const WizardModule = require("./WizardModule");
const WizardResource = sequelize.define('WizardResource', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },

    content_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: WizardContent,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },

    module_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: {
            model: WizardModule,
            key: 'id',
        },
        onDelete: 'CASCADE',
    },

    title: {
        type: DataTypes.STRING(500),
        allowNull: false,
    },

    url: {
        type: DataTypes.TEXT,
        allowNull: false,
    },

    description: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    source: {
        // e.g. arXiv, GitHub, YouTube, Blog, News API
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    provider: {
        // e.g. OpenAI, Google, Microsoft, Hugging Face
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    category: {
        // e.g. AI, Programming, Security
        type: DataTypes.STRING(100),
        allowNull: true,
    },

    content_type: {
        // e.g. article, video, paper, documentation
        type: DataTypes.STRING(100),
        allowNull: true,
    },

    domain: {
        // e.g. github.com
        type: DataTypes.STRING(255),
        allowNull: true,
    },

    thumbnail: {
        type: DataTypes.TEXT,
        allowNull: true,
    },

    published_at: {
        type: DataTypes.DATE,
        allowNull: true,
    },

    language: {
        // ISO-639-1 (en, hi, fr...)
        type: DataTypes.STRING(10),
        allowNull: true,
    },

    relevance_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
    },

    authority_score: {
        type: DataTypes.FLOAT,
        allowNull: true,
        defaultValue: 0,
    },

    tags: {
        // Stored as JSON array
        // Example: ["AI", "LLM", "Node.js"]
        type: DataTypes.JSON,
        allowNull: true,
    },

    metadata: {
        // Flexible JSON for extra information
        // Example:
        // {
        //   author: "John Doe",
        //   reading_time: 8,
        //   views: 1000,
        //   license: "MIT"
        // }
        type: DataTypes.JSON,
        allowNull: true,
    },
}, {
    tableName: 'wizard_resources',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

WizardContent.hasMany(WizardResource, { foreignKey: 'content_id', as: 'wizard_resources' });
WizardResource.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'wizard_content' });

WizardModule.hasMany(WizardResource, { foreignKey: 'module_id', as: 'resources' });
WizardResource.belongsTo(WizardModule, { foreignKey: 'module_id', as: 'module' });

module.exports = WizardResource;