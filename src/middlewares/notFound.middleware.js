const ApiError = require('../utils/ApiError.utils');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const handleNotFoundRoutes = (req, res, next) => {
  next(
    new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ROUTE_NOT_FOUND, [
      { errorField: 'route', errorMessage: `${req.method} ${req.originalUrl} not found` },
    ])
  );
};

module.exports = handleNotFoundRoutes;
