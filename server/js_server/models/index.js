const { sequelize } = require('../config/db');

const User = require('./User');
const ChatSession = require('./ChatSession');
const WizardContent = require('./WizardContent');
const Grade = require('./Grade');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGLog');
const LLMConfig = require('./LLMConfig');
const WizardQuestionSet = require('./WizardQuestionSet');

// Define relationships
User.hasMany(Grade, { foreignKey: 'user_id', as: 'grades' });
Grade.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Default wizard question sets (mirrors the previously hardcoded QUESTION_SETS)
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
    description: 'Structured educational modules',
    icon: 'LocalLibraryRounded',
    sort_order: 1,
    is_active: true,
    questions: [
      { key: 'targetAudience', label: 'Who is the target audience?', type: 'text', placeholder: 'e.g., High school students, Beginners', required: true },
      { key: 'moduleCount', label: 'How many modules or weeks?', type: 'number', placeholder: 'e.g., 8', required: true },
      { key: 'courseFocus', label: 'Primary focus of the course?', type: 'select', options: ['Academic/Theoretical', 'Bootcamp/Practical', 'Corporate Training'], required: true },
      { key: 'prerequisites', label: 'Any prerequisites needed?', type: 'text', placeholder: 'e.g., Basic JavaScript, High School Math', required: false },
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

// Sync all models and seed defaults
sequelize.sync().then(async () => {
  // Seed LLM configs
  const llmCount = await LLMConfig.count();
  if (llmCount === 0) {
    const defaultConfigs = [
      { task_name: 'chat', temperature: 0.5, max_new_tokens: 512, use_chat: true },
      { task_name: 'summarize', temperature: 0.3, max_new_tokens: 1024, use_chat: true },
      { task_name: 'quiz', temperature: 0.8, max_new_tokens: 2500, top_p: 0.9, top_k: 50, use_chat: true },
      { task_name: 'rag', temperature: 0.3, max_new_tokens: 768, use_chat: true },
      { task_name: 'wizard', temperature: 0.6, max_new_tokens: 3000, top_p: 0.9, top_k: 50, use_chat: true },
    ];
    await LLMConfig.bulkCreate(defaultConfigs);
    console.log('[SEED] Default LLM configs created.');
  }

  // Seed wizard question sets
  const wizardCount = await WizardQuestionSet.count();
  if (wizardCount === 0) {
    await WizardQuestionSet.bulkCreate(DEFAULT_WIZARD_QUESTION_SETS);
    console.log('[SEED] Default wizard question sets created.');
  }
}).catch(console.error);

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
};
