// Builds the unified API envelope response used by both 
// responseHandler and errorHandler.
//
// Response Structure Shape:
// {
//   success: boolean,
//   isOperational: boolean,
//   statusCode: number,
//   result: { message: string, data: object | { rows, count, totalPages } } | {},
//   errors: [{ errorField, errorMessage }]
// }

const buildSuccessEnvelope = ({ statusCode, message = '', data }) => ({
  success: true,
  isOperational: true,
  statusCode,
  result: {
    message,
    data: data === undefined || data === null ? {} : data,
  },
  errors: [],
});

const buildErrorEnvelope = ({ statusCode, isOperational, errors }) => ({
  success: false,
  isOperational: Boolean(isOperational),
  statusCode,
  result: {},
  errors:
    Array.isArray(errors) && errors.length
      ? errors
      : [{ errorField: '', errorMessage: 'Something went wrong, please try later.' }],
});

const sendSuccess = (res, statusCode, message, data) =>
  res.status(statusCode).json(buildSuccessEnvelope({ statusCode, message, data }));

module.exports = { buildSuccessEnvelope, buildErrorEnvelope, sendSuccess };
