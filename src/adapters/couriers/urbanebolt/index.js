const { 
  courierAxios, authenticate, 
  mapStatus, buildManifestPayload 
} = require('./urbanebolt.helper');

// POST /api/v1/services/manifest/
// UrbaneBolt expects an array even for a single order.
const createOrder = async (orderPayload) => {
  const response = await courierAxios.request({
    method: 'post',
    url: '/api/v1/services/manifest/',
    data: [buildManifestPayload(orderPayload)],
  });
  const data = Array.isArray(response.data) ? response.data[0] : response.data;
  return {
    courier_order_id: data?.orderNumber || data?.order_number || orderPayload.order_id,
    awb_number: data?.awbNumber || data?.awb_number || data?.awb || '',
    status: 'CREATED',
    raw_response: response.data,
  };
};

// GET /api/v1/services/tracking/?awb=AWB123
const trackShipment = async (awbNumber) => {
  const response = await courierAxios.request({
    method: 'get',
    url: '/api/v1/services/tracking/',
    params: { awb: awbNumber },
  });

  const data = response.data;
  const events = Array.isArray(data?.tracking) ? data.tracking : (Array.isArray(data) ? data : []);

  const history = events.map((e) => ({
    status: mapStatus(e.status || e.shipmentStatus),
    event_time: e.timestamp || e.eventTime || e.event_time || null,
    location: e.location || e.city || null,
    description: e.description || e.remarks || null,
    raw: e,
  }));

  const latest = history[0] || {};

  return {
    status: latest.status || 'CREATED',
    event_time: latest.event_time || null,
    location: latest.location || null,
    description: latest.description || null,
    history,
    raw_response: data,
  };
};

// POST /api/v1/services/cancellation/
const cancelOrder = async (awbNumber) => {
  const response = await courierAxios.request({
    method: 'post',
    url: '/api/v1/services/cancellation/',
    data: { awbNumber: [awbNumber] },
  });
  return {
    success: true,
    raw_response: response.data,
  };
};

module.exports = {
  name: 'urbanebolt',
  authenticate,
  createOrder,
  trackShipment,
  cancelOrder,
};

