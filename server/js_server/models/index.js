/**
 * models/index.js
 * ===============
 * Sequelize model registry.
 *
 * - Imports all models (load-order matters: parent before child)
 * - Cross-model associations are defined HERE to avoid circular imports
 * - Seeds default LLM configs and wizard question sets on first run
 * - Uses sequelize.sync({ alter: true }) to auto-migrate new columns/tables
 *
 * Course hierarchy (new):
 *   WizardContent → CoursePhase → CourseModule → CourseLesson
 *                                              → LessonSection
 *                                              → LessonResource
 *                                              → LessonExercise
 */

const { sequelize } = require('../config/db');

// ─── Core models ─────────────────────────────────────────────────────────────
const User = require('./User');
const ChatSession = require('./ChatSession');
const WizardContent = require('./WizardContent');
const Grade = require('./Grade');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGLog');
const LLMConfig = require('./LLMConfig');
const WizardQuestionSet = require('./WizardQuestionSet');

// ─── Legacy Wizard models (kept for Roadmap/Guide/Schedule content types) ────
const WizardModule = require('./WizardModule');
const WizardResource = require('./WizardResource');

// ─── New Course generation models ─────────────────────────────────────────────
const CoursePhase = require('./CoursePhase');
const CourseModule = require('./CourseModule');
const CourseLesson = require('./CourseLesson');
const LessonSection = require('./LessonSection');
const LessonResource = require('./LessonResource');
const LessonExercise = require('./LessonExercise');
const GenerationJob = require('./GenerationJob');

// ─── Cross-model associations ─────────────────────────────────────────────────


// User relationships
User.hasMany(Grade, { foreignKey: 'user_id', as: 'grades' });
Grade.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// ─── Default seeding data ──────────────────────────────────────────────────────

/**
 * Default wizard question sets (mirrors previously hardcoded QUESTION_SETS).
 * These drive the dynamic Wizard UI configuration.
 */
const DEFAULT_WIZARD_QUESTION_SETS = [
  {
    content_type: 'Roadmap',
    label: 'Roadmap',
    description: 'Visual path of milestones',
    icon: 'ExploreRounded',
    sort_order: 0,
    is_active: true,
    questions: [
      { key: 'skillLevel', label: 'What is your current skill level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
      { key: 'timeDedication', label: 'Time dedication per week?', type: 'text', placeholder: 'e.g., 10 hours', required: true },
      { key: 'learningStyle', label: 'What is your main learning style?', type: 'select', options: ['Visual & Project-based', 'Theoretical & Reading', 'Interactive & Coding'], required: true },
      { key: 'tools', label: 'Any specific tools/frameworks?', type: 'text', placeholder: 'e.g., React, TensorFlow, Python', required: false },
    ],
  },
  {
    content_type: 'Course/Syllabus',
    label: 'Course / Syllabus',
    description: 'Deep structured course with full lesson content',
    icon: 'LocalLibraryRounded',
    sort_order: 1,
    is_active: true,
    questions: [
      { key: 'skillLevel', label: 'What is your current skill level?', type: 'select', options: ['Beginner', 'Intermediate', 'Advanced'], required: true },
      { key: 'targetAudience', label: 'Who is the target audience?', type: 'text', placeholder: 'e.g., Beginners, Data Science students', required: true },
      { key: 'moduleCount', label: 'How many modules (approximate)?', type: 'number', placeholder: 'e.g., 8', required: false },
      { key: 'courseFocus', label: 'Primary focus of the course?', type: 'select', options: ['Academic/Theoretical', 'Bootcamp/Practical', 'Corporate Training'], required: true },
      { key: 'prerequisites', label: 'Any prerequisites needed?', type: 'text', placeholder: 'e.g., Basic Python, High School Math', required: false },
      { key: 'goal', label: 'What is the learner\'s goal?', type: 'text', placeholder: 'e.g., Get a job as ML Engineer', required: false },
      { key: 'learningStyle', label: 'Preferred learning style?', type: 'select', options: ['Visual & Project-based', 'Theoretical & Reading', 'Interactive & Coding'], required: true },
    ],
  },
  {
    content_type: 'Guide',
    label: 'Guide',
    description: 'Step-by-step instructions',
    icon: 'MenuBookRounded',
    sort_order: 2,
    is_active: true,
    questions: [
      { key: 'guideStyle', label: 'What style of guide?', type: 'select', options: ['Step-by-step tutorial', 'Conceptual overview', 'Quick reference'], required: true },
      { key: 'constraints', label: 'Any specific tools or constraints?', type: 'text', placeholder: 'e.g., Open-source tools only', required: false },
    ],
  },
  {
    content_type: 'Schedule',
    label: 'Schedule',
    description: 'Time-managed study plan',
    icon: 'ScheduleRounded',
    sort_order: 3,
    is_active: true,
    questions: [
      { key: 'deadline', label: 'When is your deadline?', type: 'date', required: true },
      { key: 'dailyHours', label: 'Hours per day?', type: 'number', placeholder: 'e.g., 2', required: true },
    ],
  },
];

// ─── DB sync + seeding ─────────────────────────────────────────────────────────
// alter: true → adds new columns/tables without dropping existing data.
// Switch to explicit Alembic/Umzug migrations for production stability.
sequelize.sync({ alter: true }).then(async () => {
  // Seed LLM configs on first run
  const llmCount = await LLMConfig.count();
  if (llmCount === 0) {
    const defaultConfigs = [
      { task_name: 'chat', temperature: 0.5, max_new_tokens: 512, use_chat: true },
      { task_name: 'summarize', temperature: 0.3, max_new_tokens: 1024, use_chat: true },
      { task_name: 'quiz', temperature: 0.8, max_new_tokens: 2500, top_p: 0.9, top_k: 50, use_chat: true },
      { task_name: 'rag', temperature: 0.3, max_new_tokens: 768, use_chat: true },
      // wizard: higher token budget for deep lesson content generation
      { task_name: 'wizard', temperature: 0.6, max_new_tokens: 4000, top_p: 0.9, top_k: 50, use_chat: true },
    ];
    await LLMConfig.bulkCreate(defaultConfigs);
    console.log('[SEED] Default LLM configs created.');
  }

  // Seed wizard question sets on first run
  const wizardCount = await WizardQuestionSet.count();
  if (wizardCount === 0) {
    await WizardQuestionSet.bulkCreate(DEFAULT_WIZARD_QUESTION_SETS);
    console.log('[SEED] Default wizard question sets created.');
  }
}).catch(console.error);

// ─── Exports ───────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  User,
  ChatSession,
  WizardContent,
  Grade,
  PaymentTransaction,
  RAGDocument,
  RAGQueryLog,
  LLMConfig,
  WizardQuestionSet,
  // Legacy wizard models (roadmap / guide / schedule)
  WizardModule,
  WizardResource,
  // New course generation models
  CoursePhase,
  CourseModule,
  CourseLesson,
  LessonSection,
  LessonResource,
  LessonExercise,
  GenerationJob,
};

