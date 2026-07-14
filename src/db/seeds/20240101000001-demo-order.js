'use strict';

// This seed creates a sample order record so you can test tracking/cancel
// without needing to actually call the courier first.
module.exports = {
  up: async (queryInterface) => {
    const now = new Date();
    await queryInterface.bulkInsert('orders', [
      {
        id: '00000000-0000-0000-0000-000000000001',
        internal_order_id: 'DEMO-ORDER-001',
        courier_partner: 'mockcourier',
        courier_order_id: 'MOCK-SHIP-001',
        awb_number: 'MOCKAWB001',
        status: 'CREATED',
        request_payload: JSON.stringify({ note: 'seeded demo order' }),
        response_payload: JSON.stringify({ awb: 'MOCKAWB001' }),
        batch_id: null,
        failure_reason: null,
        created_at: now,
        updated_at: now,
      },
    ]);
  },

  down: async (queryInterface) => {
    await queryInterface.bulkDelete('orders', {
      internal_order_id: 'DEMO-ORDER-001',
    });
  },
};
