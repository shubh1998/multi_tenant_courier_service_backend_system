'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('tracking_events', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      order_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'orders',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING(50),
        allowNull: false,
      },
      event_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      location: {
        type: Sequelize.STRING(255),
        allowNull: true,
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      raw_payload: {
        type: Sequelize.JSONB,
        allowNull: true,
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });

    await queryInterface.addIndex('tracking_events', ['order_id']);
    await queryInterface.addIndex('tracking_events', ['created_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('tracking_events');
  },
};
