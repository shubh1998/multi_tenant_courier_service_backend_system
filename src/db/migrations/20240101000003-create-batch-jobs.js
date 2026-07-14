'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('batch_jobs', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
      },
      batch_id: {
        type: Sequelize.STRING(100),
        allowNull: false,
        unique: true,
      },
      total_orders: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processed_orders: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successful_orders: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_orders: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: Sequelize.ENUM('PROCESSING', 'COMPLETED', 'PARTIAL_SUCCESS', 'FAILED'),
        defaultValue: 'PROCESSING',
        allowNull: false,
      },
      results: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: [],
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

    await queryInterface.addIndex('batch_jobs', ['status']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('batch_jobs');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_batch_jobs_status";');
  },
};
