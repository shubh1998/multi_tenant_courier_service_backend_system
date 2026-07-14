const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  BAD_GATEWAY: 502,
  INTERNAL_SERVER_ERROR: 500,
}

const MESSAGES = {
  // Orders
  ORDER_CREATED: 'Order created successfully',
  ORDER_TRACKED: 'Tracking details fetched successfully',
  ORDER_CANCELLED: 'Order cancelled successfully',
  ORDER_NOT_FOUND: 'Order not found',
  BULK_ACCEPTED: 'Bulk order request accepted. Use the batch_id to poll for results.',
  BATCH_STATUS_FETCHED: 'Batch status fetched successfully',
  COURIER_NOT_SUPPORTED: 'Courier partner not supported',
  COURIER_API_ERROR: 'Courier service returned an error',
  // General
  ROUTE_NOT_FOUND: 'Route not found',
  VALIDATION_ERROR: 'Validation error',
  INTERNAL_ERROR: 'Something went wrong, please try later.',
}

const ORDER_STATUS = {
  CREATED: 'CREATED',
  PICKED_UP: 'PICKED_UP',
  IN_TRANSIT: 'IN_TRANSIT',
  OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
  DELIVERED: 'DELIVERED',
  CANCELLED: 'CANCELLED',
  FAILED: 'FAILED',
  RTO_INITIATED: 'RTO_INITIATED',
  RTO_DELIVERED: 'RTO_DELIVERED',
}

module.exports = {
  HTTP_STATUS,
  MESSAGES,
  ORDER_STATUS,
};
