const adminService = require('../services/adminService');
const issueService = require('../services/issueService');
const { sendSuccess } = require('../utils/apiResponse');

async function getDashboardStats(req, res, next) {
  try {
    const stats = await adminService.getDashboardStats();
    return res.status(200).json(stats);
  } catch (err) {
    next(err);
  }
}

async function getAdminIssues(req, res, next) {
  try {
    const result = await issueService.getIssues(req.query);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getAdminIssueReview(req, res, next) {
  try {
    const issue = await issueService.getIssueById(req.params.id);
    const duplicates = await require('../services/duplicateDetectionService').findDuplicateCandidates(issue, issue.id);
    return res.status(200).json({ issue, duplicates });
  } catch (err) {
    next(err);
  }
}

async function updateStatus(req, res, next) {
  try {
    const { status, note } = req.body;
    const updated = await adminService.updateIssueStatus(req.params.id, status, note, req.user);
    
    // Emit socket event if io is available
    if (req.app.get('io')) {
      req.app.get('io').emit('status_updated', {
        issueId: req.params.id,
        status,
        note,
      });
    }

    return sendSuccess(res, updated, 'Issue status updated successfully');
  } catch (err) {
    next(err);
  }
}

async function updatePriority(req, res, next) {
  try {
    const { priorityScore, note } = req.body;
    const updated = await adminService.updateIssuePriority(req.params.id, priorityScore, note, req.user);
    return sendSuccess(res, updated, 'Issue priority updated successfully');
  } catch (err) {
    next(err);
  }
}

async function mergeIssues(req, res, next) {
  try {
    const { duplicateIssueId, note } = req.body;
    const result = await adminService.mergeDuplicateIssues(req.params.id, duplicateIssueId, note, req.user);
    return sendSuccess(res, result, 'Duplicate issue merged successfully');
  } catch (err) {
    next(err);
  }
}

async function getCategories(req, res, next) {
  try {
    const categories = await adminService.getCategories();
    return res.status(200).json(categories);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const category = await adminService.createCategory(req.body);
    return sendSuccess(res, category, 'Category created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function updateCategory(req, res, next) {
  try {
    const category = await adminService.updateCategory(req.params.id, req.body);
    return sendSuccess(res, category, 'Category updated successfully');
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const users = await adminService.getUsers();
    return res.status(200).json(users);
  } catch (err) {
    next(err);
  }
}

async function updateUserRole(req, res, next) {
  try {
    const user = await adminService.updateUserRole(req.params.id, req.body.role);
    return sendSuccess(res, user, 'User role updated successfully');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDashboardStats,
  getAdminIssues,
  getAdminIssueReview,
  updateStatus,
  updatePriority,
  mergeIssues,
  getCategories,
  createCategory,
  updateCategory,
  getUsers,
  updateUserRole,
};
