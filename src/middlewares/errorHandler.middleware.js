const appConfig = require('../config/app.config');
const { logger } = require('../utils/logger.utils');
const ApiError = require('../utils/ApiError.utils');
const { buildErrorEnvelope } = require('../utils/responseBuilder.utils');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const errorHandler = (err, req, res, next) => {
  let statusCode;
  let isOperational;
  let errors;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    isOperational = true;
    errors = err.errors;
  } else if (err && err.type === 'entity.parse.failed') {
    statusCode = HTTP_STATUS.BAD_REQUEST;
    isOperational = true;
    errors = [{ errorField: 'body', errorMessage: 'Invalid JSON payload' }];
  } else {
    statusCode = HTTP_STATUS.INTERNAL_SERVER_ERROR;
    isOperational = false;
    errors = [{ errorField: '', errorMessage: MESSAGES.INTERNAL_ERROR }];
    logger.error(`Unhandled error on ${req.method} ${req.originalUrl}:`, err);
  }

  const body = buildErrorEnvelope({ statusCode, isOperational, errors });

  if (appConfig.env !== 'production' && !isOperational && err && err.stack) {
    body.stack = err.stack;
  }

  res.status(statusCode).json(body);
};

module.exports = errorHandler;

