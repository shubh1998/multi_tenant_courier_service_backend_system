const orderService = require('../services/order.service');
const asyncHandler = require('../utils/asyncHandler.utils');
const { sendSuccess } = require('../utils/responseBuilder.utils');
const { HTTP_STATUS, MESSAGES } = require('../constants');

const createOrder = asyncHandler(async (req, res) => {
  const order = await orderService.createOrder(req.context, req.body);
  sendSuccess(res, HTTP_STATUS.CREATED, MESSAGES.ORDER_CREATED, order);
});

const trackOrder = asyncHandler(async (req, res) => {
  const data = await orderService.trackOrder(req.context, req.params.order_id);
  sendSuccess(res, HTTP_STATUS.OK, MESSAGES.ORDER_TRACKED, data);
});

const cancelOrder = asyncHandler(async (req, res) => {
  const data = await orderService.cancelOrder(req.context, req.params.order_id);
  sendSuccess(res, HTTP_STATUS.OK, MESSAGES.ORDER_CANCELLED, data);
});

const createBulkOrders = asyncHandler(async (req, res) => {
  const data = await orderService.createBulkOrders(req.context, req.body.orders);
  // 202 Accepted — processing is async in the background
  sendSuccess(res, HTTP_STATUS.ACCEPTED, MESSAGES.BULK_ACCEPTED, data);
});

const getBatchStatus = asyncHandler(async (req, res) => {
  const data = await orderService.getBatchStatus(req.context, req.params.batch_id);
  sendSuccess(res, HTTP_STATUS.OK, MESSAGES.BATCH_STATUS_FETCHED, data);
});

module.exports = { createOrder, trackOrder, cancelOrder, createBulkOrders, getBatchStatus };
