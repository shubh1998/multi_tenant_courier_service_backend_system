// Mock courier — simulates a real courier for local development and testing.
// It generates fake AWB numbers and random tracking states so you can test
// the full flow without needing real courier credentials.

const { fakeDelay, buildTrackingHistory, generateAwb } = require('./mockcourier.helper');

const authenticate = async () => {
  await fakeDelay();
  return 'mock-token-' + Date.now();
};

const createOrder = async (orderPayload) => {
  await fakeDelay();

  // 5% chance of simulated failure for testing partial-success in bulk orders
  if (Math.random() < 0.05) {
    const err = new Error('Mock courier: simulated creation failure');
    err.statusCode = 500;
    throw err;
  }

  const awb = generateAwb();

  return {
    courier_order_id: 'MOCKSHIP-' + orderPayload.order_id,
    awb_number: awb,
    status: 'CREATED',
    raw_response: {
      message: 'Order created by MockCourier',
      orderNumber: orderPayload.order_id,
      awbNumber: awb,
    },
  };
};

const trackShipment = async (awbNumber) => {
  await fakeDelay();

  const { currentStatus, history } = buildTrackingHistory(awbNumber);
  const latest = history[history.length - 1] || {};

  return {
    status: currentStatus,
    event_time: latest.event_time || null,
    location: latest.location || 'Mock City',
    description: latest.description || '',
    history,
    raw_response: { awb: awbNumber, tracking: history, mock: true },
  };
};

const cancelOrder = async (awbNumber) => {
  await fakeDelay();

  return {
    success: true,
    raw_response: {
      message: 'Order cancelled by MockCourier',
      awbNumber,
      mock: true,
    },
  };
};

module.exports = {
  name: 'mockcourier',
  authenticate,
  createOrder,
  trackShipment,
  cancelOrder,
};

