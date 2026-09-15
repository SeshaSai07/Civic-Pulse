const issueService = require('../services/issueService');
const { sendSuccess } = require('../utils/apiResponse');

async function addComment(req, res, next) {
  try {
    const comment = await issueService.addComment(req.params.id, req.body.body, req.user);
    return sendSuccess(res, comment, 'Comment added successfully', 201);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  addComment,
};
