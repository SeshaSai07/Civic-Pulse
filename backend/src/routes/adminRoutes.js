const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { validateBody } = require('../middleware/validate');
const { updateStatusSchema, updatePrioritySchema, mergeIssueSchema, updateUserRoleSchema } = require('../validators/adminValidators');
const { categorySchema } = require('../validators/categoryValidators');
const { authenticateToken } = require('../middleware/auth');
const { authorizeRoles } = require('../middleware/authorize');

// Enforce ADMIN role on all admin endpoints
router.use(authenticateToken, authorizeRoles('ADMIN'));

router.get('/dashboard', adminController.getDashboardStats);
router.get('/issues', adminController.getAdminIssues);
router.get('/issues/:id/review', adminController.getAdminIssueReview);
router.patch('/issues/:id/status', validateBody(updateStatusSchema), adminController.updateStatus);
router.patch('/issues/:id/priority', validateBody(updatePrioritySchema), adminController.updatePriority);
router.post('/issues/:id/merge', validateBody(mergeIssueSchema), adminController.mergeIssues);

router.get('/categories', adminController.getCategories);
router.post('/categories', validateBody(categorySchema), adminController.createCategory);
router.patch('/categories/:id', adminController.updateCategory);

router.get('/users', adminController.getUsers);
router.patch('/users/:id/role', validateBody(updateUserRoleSchema), adminController.updateUserRole);

module.exports = router;
