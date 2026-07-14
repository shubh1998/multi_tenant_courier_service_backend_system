// When someone submits a bulk order request, we create a BatchJob record immediately
// and process everything in the background. The caller polls by batch_id.
module.exports = (sequelize, DataTypes) => {
  const BatchJob = sequelize.define(
    'BatchJob',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      batch_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      total_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      processed_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      successful_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      failed_orders: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      status: {
        type: DataTypes.ENUM('PROCESSING', 'COMPLETED', 'PARTIAL_SUCCESS', 'FAILED'),
        defaultValue: 'PROCESSING',
        allowNull: false,
      },
      // Per-order results stored here so the caller can see what happened to each order
      results: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: [],
      },
    },
    {
      sequelize,
      tableName: 'batch_jobs',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'batch_jobs_pkey',
          unique: true,
          fields: [{ name: 'id' }],
        },
        {
          name: 'batch_jobs_batch_id_unique',
          unique: true,
          fields: [{ name: 'batch_id' }],
        },
        {
          name: 'index_batch_jobs_on_status',
          fields: [{ name: 'status' }],
        },
      ],
    }
  );

  return BatchJob;
};
