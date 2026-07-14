const swaggerJSDoc = require('swagger-jsdoc');
const path = require('path');
const appConfig = require('./app.config');

const swaggerConfigs = swaggerJSDoc({
  definition: {
    openapi: '3.0.3',
    info: {
      title: 'Multi-Courier Integration API',
      version: '1.0.0',
      description: 'Unified REST API for creating, tracking and cancelling shipments across multiple courier partners.',
    },
    servers: [{ url: `http://localhost:${appConfig.port}` }],
    components: {
      schemas: {
        FieldError: {
          type: 'object',
          properties: {
            errorField: { type: 'string' },
            errorMessage: { type: 'string' },
          },
        },
        SuccessResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: true },
            isOperational: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 200 },
            result: {
              type: 'object',
              properties: {
                message: { type: 'string' },
                data: { type: 'object' },
              },
            },
            errors: { type: 'array', items: { $ref: '#/components/schemas/FieldError' } },
          },
        },
        ErrorResponse: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            isOperational: { type: 'boolean', example: true },
            statusCode: { type: 'integer', example: 400 },
            result: { type: 'object', example: {} },
            errors: { type: 'array', items: { $ref: '#/components/schemas/FieldError' } },
          },
        },
      },
    },
  },
  apis: [path.join(__dirname, '..', 'routes', '*.js')],
});

module.exports = swaggerConfigs;
