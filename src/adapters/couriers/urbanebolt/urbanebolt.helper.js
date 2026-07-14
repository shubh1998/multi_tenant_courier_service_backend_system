const appConfig = require('../../../config/app.config');
const { logger } = require('../../../utils/logger.utils');
const { createCourierAxios } = require('../../../helpers/axios.helpers');

const URBANE_BOLT_CONFIG = appConfig.couriers.urbanebolt || {};

// Token cache
let cachedToken = null;
let tokenExpiresAt = null;

const isTokenValid = () => cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt;

// Axios instances
// Unauthenticated — used only by authenticate() for the /auth/getToken/ call.
// No token interceptor; that would be circular since we don't have a token yet.
const authAxios = createCourierAxios({
  baseURL: URBANE_BOLT_CONFIG.baseUrl,
  timeout: URBANE_BOLT_CONFIG.timeout,
  courierName: 'urbanebolt-auth',
  maxRetries: URBANE_BOLT_CONFIG.maxRetries,
  retryDelay: URBANE_BOLT_CONFIG.retryDelay,
});

// Authenticated — token injection, 401 re-auth, and retries are baked in.
const courierAxios = createCourierAxios({
  baseURL: URBANE_BOLT_CONFIG.baseUrl,
  timeout: URBANE_BOLT_CONFIG.timeout,
  getToken,
  courierName: 'urbanebolt',
  maxRetries: URBANE_BOLT_CONFIG.maxRetries,
  retryDelay: URBANE_BOLT_CONFIG.retryDelay,
});

// Auth helpers - POST /api/v1/auth/getToken/
// Fetches a fresh token and caches it with a 55-minute TTL (tokens last ~60 min).
const authenticate = async () => {
  const response = await authAxios.request({
    method: 'post',
    url: '/api/v1/auth/getToken/',
    data: { username: URBANE_BOLT_CONFIG.username, password: URBANE_BOLT_CONFIG.password },
  });
  const token = response.data?.token || response.data?.access || response.data?.access_token;
  if (!token) {
    throw new Error('UrbaneBolt auth response did not contain a token');
  }
  cachedToken = token;
  tokenExpiresAt = Date.now() + 55 * 60 * 1000;
  logger.info('[urbanebolt] authenticated, token cached');
  return token;
};

// Returns the cached token, or a fresh one when the cache is stale / force-refreshed.
// The forceRefresh flag is set by the axios helper's 401 interceptor.
function getToken(forceRefresh = false) {
  if (!forceRefresh && isTokenValid()) return Promise.resolve(cachedToken);
  cachedToken = null;
  tokenExpiresAt = null;
  return authenticate();
}

// Payload helpers

// Maps UrbaneBolt's status strings to our internal status enum.
// Normalise spaces → underscores first so each variant only needs one entry.
const mapStatus = (ubStatus) => {
  if (!ubStatus) return 'CREATED';
  const normalized = String(ubStatus).toUpperCase().replace(/ /g, '_');
  const statusMap = {
    BOOKED: 'CREATED',
    MANIFESTED: 'CREATED',
    PICKED_UP: 'PICKED_UP',
    IN_TRANSIT: 'IN_TRANSIT',
    OUT_FOR_DELIVERY: 'OUT_FOR_DELIVERY',
    DELIVERED: 'DELIVERED',
    CANCELLED: 'CANCELLED',
    FAILED: 'FAILED',
    RTO_INITIATED: 'RTO_INITIATED',
    RTO_DELIVERED: 'RTO_DELIVERED',
  };
  return statusMap[normalized] || 'IN_TRANSIT';
};

// Converts our normalized internal order schema to the shape UrbaneBolt expects.
const buildManifestPayload = (order) => ({
  customerCode: URBANE_BOLT_CONFIG.customerCode,
  orderNumber: order.order_id,
  declaredValue: order.declared_value,
  itemDescription: order.item_description,
  collectableValue: order.collectable_value,
  height: order.height,
  length: order.length,
  breadth: order.breadth,
  pieces: order.pieces,
  weight: order.weight,
  serviceType: order.service_type,
  payMode: order.payment_mode,
  invoiceNumber: order.invoice_number,
  invoiceDate: order.invoice_date,
  invoiceValue: order.invoice_value,
  itemQuantity: order.item_quantity,
  consName: order.consignee.name,
  consEmail: order.consignee.email,
  consMobile: order.consignee.mobile,
  consAddress: order.consignee.address,
  consAddressType: order.consignee.address_type,
  consCity: order.consignee.city,
  consState: order.consignee.state,
  consPincode: parseInt(order.consignee.pincode, 10),
  consCountry: order.consignee.country,
  shprName: order.shipper.name,
  shprEmail: order.shipper.email,
  shprMobile: order.shipper.mobile,
  shprAddress: order.shipper.address,
  shprAddressType: order.shipper.address_type,
  shprCity: order.shipper.city,
  shprState: order.shipper.state,
  shprPincode: parseInt(order.shipper.pincode, 10),
  shprCountry: order.shipper.country,
  rtnName: order.return_address.name,
  rtnEmail: order.return_address.email,
  rtnMobile: order.return_address.mobile,
  rtnAddress: order.return_address.address,
  rtnAddressType: order.return_address.address_type,
  rtnCity: order.return_address.city,
  rtnState: order.return_address.state,
  rtnPincode: parseInt(order.return_address.pincode, 10),
  rtnCountry: order.return_address.country,
});

module.exports = { courierAxios, authenticate, mapStatus, buildManifestPayload };
