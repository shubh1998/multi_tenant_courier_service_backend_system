const axios = require('axios');
const {
  default: axiosRetry,
  isNetworkOrIdempotentRequestError,
} = require('axios-retry');
const { logger } = require('../utils/logger.utils');

/**
 * Creates a pre-configured axios instance for a courier integration.
 *
 * Features baked in:
 *  - Exponential-backoff retries on network errors and 5xx responses via axios-retry
 *  - (optional) Automatic Bearer token injection via request interceptor
 *  - (optional) 401 handling: invalidates the cached token and retries the request once
 *
 * Pass `getToken` for authenticated endpoints. Omit it for unauthenticated calls
 * such as the initial auth/login request itself.
 *
 * @param {object}    opts
 * @param {string}    opts.baseURL            - Base URL for all requests
 * @param {number}    [opts.timeout]          - Request timeout in ms (default 10000)
 * @param {Function}  [opts.getToken]         - Async fn(forceRefresh?) → token string.
 *                                              When omitted no Authorization header is added.
 * @param {string}    [opts.courierName]      - Used in log messages
 * @param {number}    [opts.maxRetries]       - Max retry attempts (default 3)
 * @param {number}    [opts.retryDelay]       - Base delay in ms for exponential backoff (default 1000)
 * @returns {import('axios').AxiosInstance}
 */
const createCourierAxios = ({
  baseURL,
  timeout = 10000,
  getToken = null,
  courierName = 'courier',
  maxRetries = 3,
  retryDelay = 1000,
}) => {
  const instance = axios.create({ baseURL, timeout });

  // Retry on network errors and 5xx responses with exponential backoff.
  // 4xx errors are NOT retried — they indicate a bad request that won't fix itself.
  axiosRetry(instance, {
    retries: maxRetries,
    retryDelay: (retryCount) => retryDelay * Math.pow(2, retryCount - 1),
    retryCondition: (error) =>
      isNetworkOrIdempotentRequestError(error) ||
      (error.response?.status >= 500),
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn(
        `[${courierName}] retry attempt=${retryCount}/${maxRetries} url=${requestConfig.url} reason=${error.message}`
      );
    },
  });

  if (getToken) {
    // Inject Bearer token before every outgoing request
    instance.interceptors.request.use(async (config) => {
      const token = await getToken();
      config.headers['Authorization'] = `Bearer ${token}`;
      return config;
    });

    // On 401: invalidate the token, fetch a fresh one, and retry the request once
    instance.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;
        if (error.response?.status === 401 && !originalRequest._retried) {
          originalRequest._retried = true;
          logger.warn(`[${courierName}] 401 received, re-authenticating...`);
          const freshToken = await getToken(true);
          originalRequest.headers['Authorization'] = `Bearer ${freshToken}`;
          return instance(originalRequest);
        }
        return Promise.reject(error);
      }
    );
  }

  return instance;
};

module.exports = { createCourierAxios };
