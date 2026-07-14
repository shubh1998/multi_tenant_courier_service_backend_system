const { v4: uuidv4 } = require('uuid');

const MOCK_STATUSES = ['CREATED', 'PICKED_UP', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED'];

// Simulate a small network delay like a real courier API would have.
const fakeDelay = () => new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));

// Builds a deterministic fake tracking history from an AWB number so results are consistent for the same order across repeated calls.
const buildTrackingHistory = (awbNumber) => {
  const seed = awbNumber.charCodeAt(awbNumber.length - 1) % MOCK_STATUSES.length;
  const currentStatusIndex = Math.min(seed, MOCK_STATUSES.length - 1);
  const currentStatus = MOCK_STATUSES[currentStatusIndex];

  const history = MOCK_STATUSES.slice(0, currentStatusIndex + 1).map((s, i) => ({
    status: s,
    event_time: new Date(Date.now() - (currentStatusIndex - i) * 6 * 60 * 60 * 1000),
    location: 'Mock City Hub ' + (i + 1),
    description: `Shipment ${s.toLowerCase().replace(/_/g, ' ')}`,
    raw: { status: s, mock: true },
  }));

  return { currentStatus, history };
};

// Generates a random fake AWB number.
const generateAwb = () => 'MOCK' + uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();

module.exports = { fakeDelay, buildTrackingHistory, generateAwb };
