const Joi = require('joi');
const { getSupportedCouriers } = require('../adapters/couriers/registry');

const addressSchema = Joi.object({
  name: Joi.string().trim().min(1).max(200).required(),
  email: Joi.string().email().max(200).required(),
  mobile: Joi.string().pattern(/^\d{10}$/).required().messages({
    'string.pattern.base': 'mobile must be a 10-digit number',
  }),
  address: Joi.string().trim().min(1).max(500).required(),
  address_type: Joi.string().valid('Home', 'Office', 'Seller', 'Warehouse').default('Home'),
  city: Joi.string().trim().min(1).max(100).required(),
  state: Joi.string().trim().min(1).max(100).required(),
  pincode: Joi.string().pattern(/^\d{6}$/).required().messages({
    'string.pattern.base': 'pincode must be a 6-digit number',
  }),
  country: Joi.string().trim().min(1).max(100).default('India'),
});

const coreOrderSchema = {
  courier_partner: Joi.string()
    .valid(...getSupportedCouriers())
    .required()
    .messages({
      'any.only': `courier_partner must be one of: ${getSupportedCouriers().join(', ')}`,
      'any.required': 'courier_partner is required',
    }),
  order_id: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'order_id is required',
    'string.empty': 'order_id cannot be empty',
  }),
  declared_value: Joi.number().positive().required(),
  item_description: Joi.string().trim().min(1).max(500).required(),
  collectable_value: Joi.number().min(0).required(),
  weight: Joi.number().positive().required(),
  length: Joi.number().positive().required(),
  breadth: Joi.number().positive().required(),
  height: Joi.number().positive().required(),
  pieces: Joi.number().integer().min(1).default(1),
  service_type: Joi.string().trim().uppercase().default('SDD'),
  payment_mode: Joi.string().valid('COD', 'PREPAID').default('PREPAID'),
  invoice_number: Joi.string().trim().max(100).required(),
  invoice_date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({ 'string.pattern.base': 'invoice_date must be in YYYY-MM-DD format' }),
  invoice_value: Joi.number().positive().required(),
  item_quantity: Joi.number().integer().min(1).default(1),
  consignee: addressSchema.required(),
  shipper: addressSchema.required(),
  return_address: addressSchema.required(),
};

const createOrderSchema = Joi.object(coreOrderSchema);

const createBulkOrderSchema = Joi.object({
  orders: Joi.array()
    .items(Joi.object(coreOrderSchema))
    .min(1)
    .max(100)
    .required()
    .messages({
      'array.min': 'orders array must have at least 1 item',
      'array.max': 'orders array cannot exceed 100 items',
      'any.required': 'orders field is required',
    }),
});

const orderIdParamSchema = Joi.object({
  order_id: Joi.string().trim().min(1).max(100).required(),
});

const batchIdParamSchema = Joi.object({
  batch_id: Joi.string().trim().min(1).max(100).required(),
});

module.exports = {
  createOrderSchema,
  createBulkOrderSchema,
  orderIdParamSchema,
  batchIdParamSchema,
};
