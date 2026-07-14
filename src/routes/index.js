const { Router } = require('express');
const v1Routes = require('./v1');
const { sendSuccess } = require('../utils/responseBuilder.utils');
const { HTTP_STATUS } = require('../constants');

const appRouter = Router();

/**
 * @openapi
 * /health-check:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       '200':
 *         description: Service is healthy
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 */
appRouter.get('/health-check', (req, res) => {
  sendSuccess(res, HTTP_STATUS.OK, 'Service is healthy', {
    status: 'ok done',
    uptime: process.uptime(),
  });
});

appRouter.use('/api/v1', v1Routes);

module.exports = appRouter;

