const { v4: uuidv4 } = require('uuid');
const db = require('../db/models');
const { logger } = require('../utils/logger.utils');

const TRANSACTION_DONE = ['commit', 'rollback'];
const ERROR_STATUS_PREFIXES = ['4', '5'];

/**
 * Request context middleware.
 *
 * Every request gets a context object at `req.context` containing:
 *   - traceId        — taken from `x-trace-id` / `x-request-id` header, or auto-generated
 *   - sequelize      — Sequelize connection instance
 *   - dbModels       — all registered Sequelize models (Order, TrackingEvent, BatchJob, …)
 *   - logger         — shared application logger
 *   - reqTimeStamp   — epoch ms when the request arrived
 *
 * The middleware is designed to be composable:
 *   • Register it globally (automaticTransaction = false) to get traceId + lifecycle
 *     logging on every request.
 *   • Register it again on individual write-routes (automaticTransaction = true) to add a
 *     managed Sequelize transaction that auto-commits on 2xx and auto-rolls back on 4xx/5xx.
 *
 * @param {boolean} automaticTransaction - When true, starts a DB transaction and commits /
 *                                         rolls it back automatically based on response status.
 */
const contextMiddleware = (automaticTransaction = false) => async (req, res, next) => {
  // ----- First call per request -----
  // Initialize the context and register the lifecycle logger.
  if (!req.context) {
    const traceId =
      req.headers['x-trace-id'] ||
      req.headers['x-request-id'] ||
      uuidv4();

    const context = {
      req,
      traceId,
      reqTimeStamp: Date.now(),
      sequelize: db.sequelize,
      dbModels: db,
      logger,
    };

    // Echo the traceId back so clients can correlate logs
    res.setHeader('x-trace-id', traceId);

    logger.info(`[${traceId}] → ${req.method} ${req.originalUrl}`);

    res.on('finish', () => {
      const duration = Date.now() - context.reqTimeStamp;
      const level = res.statusCode >= 400 ? 'error' : 'info';
      logger[level](
        `[${traceId}] ← ${res.statusCode} ${req.method} ${req.originalUrl} duration=${duration}ms`
      );
    });

    req.context = context;
  }

  // ----- Transaction management -----
  // Only runs when explicitly requested and a transaction isn't already open.
  if (automaticTransaction && !req.context.sequelizeTransaction) {
    req.context.sequelizeTransaction = await db.sequelize.transaction();

    let txHandled = false;

    const onFinishAndClose = async () => {
      if (txHandled) return;
      txHandled = true;

      const t = req.context.sequelizeTransaction;
      if (!t || TRANSACTION_DONE.includes(t.finished)) return;

      if (ERROR_STATUS_PREFIXES.includes(String(res.statusCode)[0])) {
        await t.rollback();
      } else {
        await t.commit();
      }
    };

    res.on('finish', onFinishAndClose);
    res.on('close', onFinishAndClose);
  }

  next();
};

module.exports = contextMiddleware;
