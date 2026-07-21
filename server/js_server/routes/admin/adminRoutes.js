const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const wizardQSController = require('../../controllers/wizardQuestionSetController');
const { authenticate, requireRole } = require('../../middlewares/authMiddleware');

// Protect all admin routes
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/llm-configs', adminController.getLLMConfigs);
router.put('/llm-configs/:task_name', adminController.updateLLMConfig);

// Wizard question set management
router.get('/wizard-questions', wizardQSController.getAllQuestionSets);
router.post('/wizard-questions', wizardQSController.createQuestionSet);
router.put('/wizard-questions/:id', wizardQSController.updateQuestionSet);
router.delete('/wizard-questions/:id', wizardQSController.deleteQuestionSet);
router.patch('/wizard-questions/:id/toggle', wizardQSController.toggleQuestionSet);

module.exports = router;
