const issueService = require('../services/issueService');
const { duplicateDetectionService } = require('../services/duplicateDetectionService');
const { sendSuccess } = require('../utils/apiResponse');

async function getIssues(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const result = await issueService.getIssues(req.query, currentUserId);
    return res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function getIssueById(req, res, next) {
  try {
    const currentUserId = req.user ? req.user.id : null;
    const issue = await issueService.getIssueById(req.params.id, currentUserId);
    return res.status(200).json(issue);
  } catch (err) {
    next(err);
  }
}

async function createIssue(req, res, next) {
  try {
    const issue = await issueService.createIssue(req.body, req.user);
    return sendSuccess(res, issue, 'Issue created successfully', 201);
  } catch (err) {
    next(err);
  }
}

async function getNearbyIssues(req, res, next) {
  try {
    const { lat, lng, radiusKm } = req.query;
    const issues = await issueService.getNearbyIssues(lat, lng, radiusKm);
    return res.status(200).json(issues);
  } catch (err) {
    next(err);
  }
}

async function getIssueDuplicates(req, res, next) {
  try {
    const issue = await issueService.getIssueById(req.params.id);
    const candidates = await require('../services/duplicateDetectionService').findDuplicateCandidates(
      issue,
      issue.id
    );
    return res.status(200).json({ candidates });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getIssues,
  getIssueById,
  createIssue,
  getNearbyIssues,
  getIssueDuplicates,
};
