const express = require('express');
const cors = require('cors')
const helmet = require('helmet');
const swaggerUi = require('swagger-ui-express');
const { httpLogger } = require('./utils/logger.utils');
const swaggerSpec = require('./config/swagger.config');
const appRoutes = require('./routes');
const handleNotFoundRoutes = require('./middlewares/notFound.middleware');
const errorHandler = require('./middlewares/errorHandler.middleware');

const app = express()
    .use(express.json())
    .use(express.urlencoded({ extended: true }))
    .use(httpLogger)
    .use(helmet())
    .use(cors({
        credentials: true,
        origin: (origin, callback) => callback(null, true),
    }));

// Swagger API docs Route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/', appRoutes);

app.use(handleNotFoundRoutes);
app.use(errorHandler);

module.exports = app;

