const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/adminController');
const { authenticate, requireRole } = require('../../middlewares/authMiddleware');

// Protect all admin routes
router.use(authenticate);
router.use(requireRole('admin'));

router.get('/stats', adminController.getStats);
router.get('/users', adminController.getUsers);
router.patch('/users/:id/status', adminController.toggleUserStatus);
router.get('/llm-configs', adminController.getLLMConfigs);
router.put('/llm-configs/:task_name', adminController.updateLLMConfig);

module.exports = router;
