module.exports = (sequelize, DataTypes) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      // Our own order ID from the caller — must be unique to prevent duplicates
      internal_order_id: {
        type: DataTypes.STRING(100),
        allowNull: false,
        unique: true,
      },
      courier_partner: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      // The ID that the courier returns for this shipment
      courier_order_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // Air Waybill number — the tracking number from the courier
      awb_number: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(
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
      // Store the full request we sent to the courier — useful for debugging
      request_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      // Store the full response the courier gave us — also for debugging/audit
      response_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      // If this order came from a bulk request, link it to the batch
      batch_id: {
        type: DataTypes.STRING(100),
        allowNull: true,
      },
      // Error message if the order creation failed
      failure_reason: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'orders',
      underscored: true,
      timestamps: true,
      indexes: [
        {
          name: 'orders_pkey',
          unique: true,
          fields: [{ name: 'id' }],
        },
        {
          name: 'orders_internal_order_id_unique',
          unique: true,
          fields: [{ name: 'internal_order_id' }],
        },
        {
          name: 'index_orders_on_courier_partner',
          fields: [{ name: 'courier_partner' }],
        },
        {
          name: 'index_orders_on_awb_number',
          fields: [{ name: 'awb_number' }],
        },
        {
          name: 'index_orders_on_batch_id',
          fields: [{ name: 'batch_id' }],
        },
        {
          name: 'index_orders_on_status',
          fields: [{ name: 'status' }],
        },
      ],
    }
  );

  Order.associate = (models) => {
    Order.hasMany(models.TrackingEvent, { foreignKey: 'order_id', as: 'trackingHistory' });
  };

  return Order;
};
