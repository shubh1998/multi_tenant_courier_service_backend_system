const { v4: uuidv4 } = require('uuid');
const pLimit = require('p-limit');
const { getAdapter, getSupportedCouriers, isSupported } = require('../adapters/couriers/registry');
const ApiError = require('../utils/ApiError.utils');
const { logger: moduleLogger } = require('../utils/logger.utils');
const { HTTP_STATUS, MESSAGES, ORDER_STATUS } = require('../constants');
const appConfig = require('../config/app.config');
const { toCourierApiError, toTrackingResponse } = require('../helpers/order.helper');

// Creates a single order by calling the appropriate courier adapter.
// Handles idempotency — if the order_id already exists, returns the existing record.
const createOrder = async (context, orderData) => {
  const {
    dbModels: { Order, TrackingEvent },
    logger = moduleLogger,
    traceId = '',
    sequelizeTransaction: t,
  } = context;
  const { courier_partner, order_id } = orderData;

  if (!isSupported(courier_partner)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.COURIER_NOT_SUPPORTED, [
      {
        errorField: 'courier_partner',
        errorMessage: `'${courier_partner}' is not supported. Supported couriers: ${getSupportedCouriers().join(', ')}`,
      },
    ]);
  }

  const existing = await Order.findOne({ where: { internal_order_id: order_id } });
  if (existing) {
    logger.info(`[${traceId}] order_id=${order_id} already exists, returning existing record`);
    return existing;
  }

  const adapter = getAdapter(courier_partner);
  let courierResult;

  try {
    courierResult = await adapter.createOrder(orderData);
  } catch (err) {
    logger.error(`[${traceId}] courier call failed order_id=${order_id} courier=${courier_partner}`, err);
    throw toCourierApiError(err);
  }

  const created = await Order.create({
    internal_order_id: order_id,
    courier_partner,
    courier_order_id: courierResult.courier_order_id,
    awb_number: courierResult.awb_number,
    status: ORDER_STATUS.CREATED,
    request_payload: orderData,
    response_payload: courierResult.raw_response,
    batch_id: orderData.batch_id || null,
  }, { transaction: t });

  await TrackingEvent.create({
    order_id: created.id,
    status: ORDER_STATUS.CREATED,
    event_time: new Date(),
    description: 'Order created',
    raw_payload: courierResult.raw_response,
  }, { transaction: t });

  logger.info(`[${traceId}] order created order_id=${order_id} awb=${courierResult.awb_number} courier=${courier_partner}`);

  return created;
};

// Fetches current tracking from the courier and stores new events in the DB.
const trackOrder = async (context, orderId) => {
  const {
    dbModels: { Order, TrackingEvent },
    logger = moduleLogger,
    traceId = '',
    sequelizeTransaction: t,
  } = context;

  const order = await Order.findOne({
    where: { internal_order_id: orderId },
    include: [{ association: 'trackingHistory', order: [['created_at', 'DESC']] }],
  });

  if (!order) throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDER_NOT_FOUND);

  if (!order.awb_number) return toTrackingResponse(order);

  if (!isSupported(order.courier_partner)) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, MESSAGES.COURIER_NOT_SUPPORTED);
  }

  const adapter = getAdapter(order.courier_partner);
  let trackResult;

  try {
    trackResult = await adapter.trackShipment(order.awb_number);
  } catch (err) {
    logger.error(`[${traceId}] tracking failed order_id=${orderId} awb=${order.awb_number}`, err);
    throw toCourierApiError(err);
  }

  if (trackResult.status && trackResult.status !== order.status) {
    await order.update({ status: trackResult.status }, { transaction: t });

    await TrackingEvent.create({
      order_id: order.id,
      status: trackResult.status,
      event_time: trackResult.event_time ? new Date(trackResult.event_time) : new Date(),
      location: trackResult.location,
      description: trackResult.description,
      raw_payload: trackResult.raw_response,
    }, { transaction: t });

    await order.reload({ include: [{ association: 'trackingHistory', order: [['created_at', 'DESC']] }] });
  }

  return toTrackingResponse(order);
};

// Cancels an order by calling the courier's cancel endpoint.
const cancelOrder = async (context, orderId) => {
  const {
    dbModels: { Order, TrackingEvent },
    logger = moduleLogger,
    traceId = '',
    sequelizeTransaction: t,
  } = context;

  const order = await Order.findOne({ where: { internal_order_id: orderId } });

  if (!order) throw new ApiError(HTTP_STATUS.NOT_FOUND, MESSAGES.ORDER_NOT_FOUND);

  if (order.status === ORDER_STATUS.CANCELLED) {
    return { order_id: orderId, status: ORDER_STATUS.CANCELLED, message: 'Order already cancelled' };
  }

  if (order.status === ORDER_STATUS.DELIVERED) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Cannot cancel a delivered order', [
      { errorField: 'status', errorMessage: 'Order has already been delivered' },
    ]);
  }

  if (!order.awb_number) {
    await order.update({ status: ORDER_STATUS.CANCELLED }, { transaction: t });
    return { order_id: orderId, status: ORDER_STATUS.CANCELLED };
  }

  const adapter = getAdapter(order.courier_partner);
  let cancelResult;

  try {
    cancelResult = await adapter.cancelOrder(order.awb_number);
  } catch (err) {
    logger.error(`[${traceId}] cancel failed order_id=${orderId} awb=${order.awb_number}`, err);
    throw toCourierApiError(err);
  }

  await order.update({ status: ORDER_STATUS.CANCELLED }, { transaction: t });

  await TrackingEvent.create({
    order_id: order.id,
    status: ORDER_STATUS.CANCELLED,
    event_time: new Date(),
    description: 'Order cancelled',
    raw_payload: cancelResult.raw_response,
  }, { transaction: t });

  logger.info(`[${traceId}] order cancelled order_id=${orderId} awb=${order.awb_number}`);

  return { order_id: orderId, status: ORDER_STATUS.CANCELLED };
};

// Handles bulk order creation (up to 100 orders), Returns a batch_id immediately — processing happens in the background.
// Poll GET /api/v1/orders/batch/:batch_id for results.
const createBulkOrders = async (context, orders) => {
  const {
    dbModels: { BatchJob },
    logger = moduleLogger,
    traceId = '',
    sequelizeTransaction: t,
  } = context;
  const batchId = 'BATCH-' + uuidv4().slice(0, 8).toUpperCase();

  const batchJob = await BatchJob.create({
    batch_id: batchId,
    total_orders: orders.length,
    status: 'PROCESSING',
    results: [],
  }, { transaction: t });

  // Background context: same models + sequelize but no middleware-managed transaction
  // (response is already sent by the time background processing runs)
  const bgContext = {
    dbModels: context.dbModels,
    sequelize: context.sequelize,
    logger,
    traceId: `${batchId}/bg`,
    sequelizeTransaction: null,
  };

  processBulkOrdersInBackground(batchJob, orders, batchId, bgContext);

  logger.info(`[${traceId}] bulk batch created batch_id=${batchId} total=${orders.length}`);

  return {
    batch_id: batchId,
    total_orders: orders.length,
    status: 'PROCESSING',
    message: 'Orders are being processed. Poll the batch status endpoint to get results.',
  };
};

// Gets the status and per-order results of a previously submitted bulk batch.
const getBatchStatus = async (context, batchId) => {
  const { dbModels: { BatchJob } } = context;
  const batch = await BatchJob.findOne({ where: { batch_id: batchId } });

  if (!batch) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Batch not found', [
      { errorField: 'batch_id', errorMessage: `No batch found with id: ${batchId}` },
    ]);
  }

  return {
    batch_id: batch.batch_id,
    status: batch.status,
    total_orders: batch.total_orders,
    processed_orders: batch.processed_orders,
    successful_orders: batch.successful_orders,
    failed_orders: batch.failed_orders,
    results: batch.results,
  };
};


// Internal — processes bulk orders concurrently after the HTTP response is sent.
// Each createOrder call is independent; failures are captured in results.
const processBulkOrdersInBackground = async (batchJob, orders, batchId, bgContext) => {
  const limit = pLimit(appConfig.bulk.concurrency);
  const log = bgContext.logger || moduleLogger;
  const results = [];

  await Promise.allSettled(
    orders.map((orderData) =>
      limit(async () => {
        try {
          const order = await createOrder(bgContext, { ...orderData, batch_id: batchId });
          results.push({ order_id: orderData.order_id, success: true, awb_number: order.awb_number, status: order.status });
        } catch (err) {
          log.error(`[${bgContext.traceId}] order_id=${orderData.order_id} failed:`, err.message);
          results.push({
            order_id: orderData.order_id,
            success: false,
            error: err.errors?.[0]?.errorMessage || err.message || 'Unknown error',
          });
        }
      })
    )
  );

  const successful = results.filter((r) => r.success).length;
  const failed = results.length - successful;
  const finalStatus = failed === 0 ? 'COMPLETED' : successful === 0 ? 'FAILED' : 'PARTIAL_SUCCESS';

  await batchJob.update({
    status: finalStatus,
    processed_orders: results.length,
    successful_orders: successful,
    failed_orders: failed,
    results,
  });

  log.info(`[${bgContext.traceId}] batch done batch_id=${batchId} success=${successful} failed=${failed} status=${finalStatus}`);
};

module.exports = { createOrder, trackOrder, cancelOrder, createBulkOrders, getBatchStatus };
