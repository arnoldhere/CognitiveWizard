/**
 * models/index.js
 * ===============
 * Sequelize model registry and association mapping.
 *
 * All AI Wizard models follow the standardized `wizard_` prefix convention.
 *
 * Hierarchy:
 *   wizard_contents (common root / metadata)
 *     ├── 1:1 wizard_roadmaps
 *     ├── 1:1 wizard_guides
 *     ├── 1:1 wizard_courses
 *     │         └── 1:N wizard_course_sections
 *     │                   └── 1:N wizard_lessons
 *     │                             ├── 1:N wizard_lesson_sections
 *     │                             └── 1:N wizard_lesson_exercises
 *     ├── 1:N wizard_generation_jobs
 *     ├── 1:N wizard_content_versions
 *     └── 1:N wizard_content_metadata
 *
 * Polymorphic resources:
 *   wizard_resources (attachable to roadmap, guide, course, lesson)
 *     └── 1:N wizard_resource_links
 */

const { sequelize } = require('../config/db');

// ─── Core models ─────────────────────────────────────────────────────────────
const User = require('./User');
const ChatSession = require('./ChatSession');
const Quiz = require('./Quiz');
const PaymentTransaction = require('./PaymentTransaction');
const RAGDocument = require('./RAGDocument');
const RAGQueryLog = require('./RAGLog');
const LLMConfig = require('./LLMConfig');
const WizardQuestionSet = require('./WizardQuestionSet');

// ─── AI Wizard Models (New Normalized Architecture) ──────────────────────────
const WizardContent = require('./WizardContent');
const Roadmap = require('./Roadmap');
const Guide = require('./Guide');
const Course = require('./Course');
const CourseSection = require('./CourseSection');
const Lesson = require('./Lesson');
const LessonSection = require('./LessonSection');
const LessonExercise = require('./LessonExercise');
const Resource = require('./Resource');
const ResourceLink = require('./ResourceLink');
const GenerationJob = require('./GenerationJob');
const ContentVersion = require('./ContentVersion');
const ContentMetadata = require('./ContentMetadata');

// ─── LangGraph internal tables (read/written by Python) ───────────────────────
const LanggraphCheckpoint = require('./LanggraphCheckpoint');
const LanggraphWrite = require('./LanggraphWrite');

// ─── Cross-model associations ─────────────────────────────────────────────────

// User relationships
User.hasMany(Quiz, { foreignKey: 'user_id', as: 'quizzes' });
Quiz.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(PaymentTransaction, { foreignKey: 'user_id', as: 'payment_transactions' });
PaymentTransaction.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

User.hasMany(WizardContent, { foreignKey: 'user_id', as: 'wizard_contents' });
WizardContent.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// 1:1 Specializations from WizardContent root
WizardContent.hasOne(Roadmap, { foreignKey: 'content_id', as: 'roadmap', onDelete: 'CASCADE' });
Roadmap.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'content' });

WizardContent.hasOne(Guide, { foreignKey: 'content_id', as: 'guide', onDelete: 'CASCADE' });
Guide.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'content' });

WizardContent.hasOne(Course, { foreignKey: 'content_id', as: 'course', onDelete: 'CASCADE' });
Course.belongsTo(WizardContent, { foreignKey: 'content_id', as: 'content' });

// Course hierarchy (Course -> CourseSection -> Lesson -> Sections / Exercises)
Course.hasMany(CourseSection, { foreignKey: 'course_id', as: 'sections', onDelete: 'CASCADE' });
CourseSection.belongsTo(Course, { foreignKey: 'course_id', as: 'course' });

CourseSection.hasMany(Lesson, { foreignKey: 'section_id', as: 'lessons', onDelete: 'CASCADE' });
Lesson.belongsTo(CourseSection, { foreignKey: 'section_id', as: 'section' });

Lesson.hasMany(LessonSection, { foreignKey: 'lesson_id', as: 'sections', onDelete: 'CASCADE' });
LessonSection.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

Lesson.hasMany(LessonExercise, { foreignKey: 'lesson_id', as: 'exercises', onDelete: 'CASCADE' });
LessonExercise.belongsTo(Lesson, { foreignKey: 'lesson_id', as: 'lesson' });

// Resources and Normalized Links
Resource.hasMany(ResourceLink, { foreignKey: 'resource_id', as: 'links', onDelete: 'CASCADE' });
ResourceLink.belongsTo(Resource, { foreignKey: 'resource_id', as: 'resource' });

// Direct child operations from WizardContent
WizardContent.hasOne(GenerationJob, { foreignKey: 'wizard_content_id', as: 'generation_job', onDelete: 'CASCADE' });
GenerationJob.belongsTo(WizardContent, { foreignKey: 'wizard_content_id', as: 'wizard_content' });

WizardContent.hasMany(ContentVersion, { foreignKey: 'wizard_content_id', as: 'versions', onDelete: 'CASCADE' });
ContentVersion.belongsTo(WizardContent, { foreignKey: 'wizard_content_id', as: 'wizard_content' });

WizardContent.hasMany(ContentMetadata, { foreignKey: 'wizard_content_id', as: 'metadata_items', onDelete: 'CASCADE' });
ContentMetadata.belongsTo(WizardContent, { foreignKey: 'wizard_content_id', as: 'wizard_content' });

// ─── Default seeding data (WizardQuestionSet preserved unchanged) ─────────────
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
      { key: 'chapterCount', label: 'How many chapters/sections (approximate)?', type: 'number', placeholder: 'e.g., 5', required: false },
      { key: 'courseFocus', label: 'Primary focus of the course?', type: 'select', options: ['Academic/Theoretical', 'Bootcamp/Practical', 'Corporate Training'], required: true },
      { key: 'prerequisites', label: 'Any prerequisites needed?', type: 'text', placeholder: 'e.g., Basic Python, High School Math', required: false },
      { key: 'goal', label: "What is the learner's goal?", type: 'text', placeholder: 'e.g., Get a job as ML Engineer', required: false },
      { key: 'learningStyle', label: 'Preferred learning style?', type: 'select', options: ['Visual & Project-based', 'Theoretical & Reading', 'Interactive & Coding'], required: true },
    ],
  },
  {
    content_type: 'Guide',
    label: 'Guide',
    description: 'Step-by-step instructions to master topics',
    icon: 'MenuBookRounded',
    sort_order: 2,
    is_active: true,
    questions: [
      { key: 'guideStyle', label: 'What style of guide?', type: 'select', options: ['Step-by-step tutorial', 'Conceptual overview', 'Quick reference'], required: true },
      { key: 'constraints', label: 'Any specific tools or constraints?', type: 'text', placeholder: 'e.g., Open-source tools only', required: false },
    ],
  },
];

// ─── DB sync + seeding ─────────────────────────────────────────────────────────
sequelize.sync({ alter: true }).then(async () => {
  // Ensure langgraph_checkpoints.checkpoint is LONGTEXT to safely hold msgpack base64 & JSON payloads
  try {
    await sequelize.query("ALTER TABLE langgraph_checkpoints MODIFY COLUMN checkpoint LONGTEXT");
  } catch (_) {
    // Ignore if table not yet created
  }

  // Ensure composite indexes for high-performance listing queries
  const ensureIndexes = [
    { name: 'idx_wc_status_created_id', table: 'wizard_contents', cols: '(status, created_at DESC, id DESC)' },
    { name: 'idx_wc_status_type_created', table: 'wizard_contents', cols: '(status, content_type, created_at DESC, id DESC)' },
    { name: 'idx_wc_user_created_id', table: 'wizard_contents', cols: '(user_id, created_at DESC, id DESC)' },
    { name: 'idx_users_role', table: 'users', cols: '(role)' },
    { name: 'idx_cs_course_sequence', table: 'wizard_course_sections', cols: '(course_id, sequence ASC)' },
    { name: 'idx_lessons_section_seq', table: 'wizard_lessons', cols: '(section_id, sequence ASC)' },
    { name: 'idx_ls_lesson_seq', table: 'wizard_lesson_sections', cols: '(lesson_id, sequence ASC)' },
    { name: 'idx_le_lesson_seq', table: 'wizard_lesson_exercises', cols: '(lesson_id, sequence ASC)' },
    { name: 'idx_res_entity', table: 'wizard_resources', cols: '(entity_type, entity_id)' },
  ];
  for (const idx of ensureIndexes) {
    try {
      await sequelize.query(`CREATE INDEX ${idx.name} ON ${idx.table} ${idx.cols}`);
    } catch (_) {
      // Ignore if index already exists or table not yet created
    }
  }

  // Seed LLM configs on first run
  const llmCount = await LLMConfig.count();
  if (llmCount === 0) {
    const defaultConfigs = [
      { task_name: 'chat', temperature: 0.5, max_new_tokens: 512, use_chat: true },
      { task_name: 'summarize', temperature: 0.3, max_new_tokens: 1024, use_chat: true },
      { task_name: 'quiz', temperature: 0.8, max_new_tokens: 2500, top_p: 0.9, top_k: 50, use_chat: true },
      { task_name: 'rag', temperature: 0.3, max_new_tokens: 768, use_chat: true },
      { task_name: 'wizard', temperature: 0.6, max_new_tokens: 4000, top_p: 0.9, top_k: 50, use_chat: true },
    ];
    await LLMConfig.bulkCreate(defaultConfigs);
    console.log('[SEED] Default LLM configs created.');
  }

  // Seed / update wizard question sets
  const wizardCount = await WizardQuestionSet.count();
  if (wizardCount === 0) {
    await WizardQuestionSet.bulkCreate(DEFAULT_WIZARD_QUESTION_SETS);
    console.log('[SEED] Default wizard question sets created.');
  } else {
    const courseQuestionSet = DEFAULT_WIZARD_QUESTION_SETS.find(q => q.content_type === 'Course/Syllabus');
    if (courseQuestionSet) {
      await WizardQuestionSet.update(
        { questions: courseQuestionSet.questions },
        { where: { content_type: 'Course/Syllabus' } }
      );
    }
  }

  // Remove any legacy Schedule question sets from DB
  await WizardQuestionSet.destroy({ where: { content_type: 'Schedule' } });
}).catch(console.error);

// ─── Exports ──────────────────────────────────────────────────────────────────
module.exports = {
  sequelize,
  User,
  ChatSession,
  Quiz,
  PaymentTransaction,
  RAGDocument,
  RAGQueryLog,
  LLMConfig,
  WizardQuestionSet,
  // New normalized AI Wizard models
  WizardContent,
  Roadmap,
  Guide,
  Course,
  CourseSection,
  Lesson,
  LessonSection,
  LessonExercise,
  Resource,
  ResourceLink,
  GenerationJob,
  ContentVersion,
  ContentMetadata,
  // LangGraph internal tables
  LanggraphCheckpoint,
  LanggraphWrite,
};
