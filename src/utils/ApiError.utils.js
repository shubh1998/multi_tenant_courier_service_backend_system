// `errors` is an array of { errorField, errorMessage } matching the API contract.
class ApiError extends Error {
  constructor(statusCode, message, errors) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    this.errors = Array.isArray(errors) && errors.length
      ? errors
      : [{ errorField: '', errorMessage: message }];
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = ApiError;
