const logger = require('../config/logger');
const { sendError } = require('../utils/apiResponse');

function errorHandler(err, req, res, next) {
  logger.error({ err, path: req.path, method: req.method }, err.message);

  const statusCode = err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  return sendError(res, message, statusCode, err.errors || null);
}

module.exports = errorHandler;
