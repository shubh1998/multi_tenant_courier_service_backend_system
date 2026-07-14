const ApiError = require('../utils/ApiError.utils');
const { HTTP_STATUS, MESSAGES } = require('../constants');

// Turns a courier HTTP/network error into a safe, non-leaking message for the client.
const normalizeCourierError = (err) => {
  const status = err.response?.status;

  if (!status) {
    if (err.code === 'ECONNABORTED' || err.code === 'ETIMEDOUT') {
      return 'Courier service timed out. Please try again.';
    }
    return 'Could not reach courier service. Please try again.';
  }

  if (status >= 400 && status < 500) return 'Courier rejected the request. Please check the order details.';
  if (status >= 500) return 'Courier service is currently unavailable. Please try again later.';

  return 'Unexpected error from courier service.';
};

const toCourierApiError = (err) => new ApiError(
  HTTP_STATUS.BAD_GATEWAY,
  MESSAGES.COURIER_API_ERROR,
  [{ errorField: 'courier', errorMessage: normalizeCourierError(err) }]
);

const toTrackingResponse = (order) => ({
  order_id: order.internal_order_id,
  courier_partner: order.courier_partner,
  awb_number: order.awb_number || null,
  status: order.status,
  tracking_history: order.trackingHistory || [],
});

module.exports = { normalizeCourierError, toCourierApiError, toTrackingResponse };

