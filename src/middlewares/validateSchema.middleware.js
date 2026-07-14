const ApiError = require('../utils/ApiError.utils');
const { HTTP_STATUS, MESSAGES } = require('../constants');

// Generic validator: passing a map of { body, params, query } to Joi schema and validating schema.
const validateJoiSchema = (schemas) => (req, res, next) => {
  const options = { abortEarly: false, stripUnknown: true, convert: true };

  for (const key of ['params', 'query', 'body']) {
    if (!schemas[key]) continue;
    const { value, error } = schemas[key].validate(req[key], options);
    if (error) {
      const errors = error.details.map((d) => ({
        errorField: d.path.join('.'),
        errorMessage: d.message,
      }));
      return next(new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.VALIDATION_ERROR, errors));
    }
    req[key] = value;
  }
  next();
};

module.exports = validateJoiSchema;
