module.exports = (sequelize, DataTypes) => {
  const TrackingEvent = sequelize.define(
    'TrackingEvent',
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        allowNull: false,
        primaryKey: true,
      },
      order_id: {
        type: DataTypes.UUID,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING(50),
        allowNull: false,
      },
      // When the event actually happened (from the courier's data)
      event_time: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      // Full raw payload from the courier for this tracking event
      raw_payload: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      tableName: 'tracking_events',
      underscored: true,
      timestamps: true,
      updatedAt: false, // append-only, no need for updatedAt
      indexes: [
        {
          name: 'tracking_events_pkey',
          unique: true,
          fields: [{ name: 'id' }],
        },
        {
          name: 'index_tracking_events_on_order_id',
          fields: [{ name: 'order_id' }],
        },
        {
          name: 'index_tracking_events_on_status',
          fields: [{ name: 'status' }],
        },
        {
          name: 'index_tracking_events_on_event_time',
          fields: [{ name: 'event_time' }],
        },
      ],
    }
  );

  TrackingEvent.associate = (models) => {
    TrackingEvent.belongsTo(models.Order, { foreignKey: 'order_id', as: 'order' });
  };

  return TrackingEvent;
};
