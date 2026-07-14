// Courier registry — this is the only place you touch when adding a new courier.
// Just import your adapter and add it to the list below.

const urbaneboltAdapter = require('./urbanebolt');
const mockcourierAdapter = require('./mockcourier');

// All registered couriers
const registeredCouriers = [urbaneboltAdapter, mockcourierAdapter];

// Build a name → adapter map for O(1) lookups
const courierMap = Object.fromEntries(registeredCouriers.map((a) => [a.name, a]));

const getAdapter = (courierPartner) => {
  return courierMap[courierPartner] || null;
};

const getSupportedCouriers = () => {
  return registeredCouriers.map((a) => a.name);
};

const isSupported = (courierPartner) => {
  return Boolean(courierMap[courierPartner]);
};

module.exports = { getAdapter, getSupportedCouriers, isSupported };
