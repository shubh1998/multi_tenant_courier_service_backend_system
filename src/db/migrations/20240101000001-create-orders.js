'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('orders', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      internal_order_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      courier_partner: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      courier_order_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      awb_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      status: {
        type: Sequelize.ENUM(
          'CREATED',
          'PICKED_UP',
          'IN_TRANSIT',
          'OUT_FOR_DELIVERY',
          'DELIVERED',
          'CANCELLED',
          'FAILED',
          'RTO_INITIATED',
          'RTO_DELIVERED'
        ),
        defaultValue: 'CREATED',
        allowNull: false,
      },
      request_payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      response_payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      batch_id: {
        type: Sequelize.STRING(100),
        allowNull: true,
      },
      failure_reason: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('orders', ['courier_partner']);
    await queryInterface.addIndex('orders', ['awb_number']);
    await queryInterface.addIndex('orders', ['batch_id']);
    await queryInterface.addIndex('orders', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('orders');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_orders_status";');
  },
};
