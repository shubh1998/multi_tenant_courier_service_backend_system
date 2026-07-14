const { Router } = require('express');
const orderController = require('../../controllers/order.controller');
const contextMiddleware = require('../../middlewares/context.middleware');
const validateJoiSchema = require('../../middlewares/validateSchema.middleware');
const {
  createOrderSchema,
  createBulkOrderSchema,
  orderIdParamSchema,
  batchIdParamSchema,
} = require('../../validation-schemas/order.schemas');

const orderRouter = Router();

/**
 * @openapi
 * components:
 *   schemas:
 *     Address:
 *       type: object
 *       required: [name, email, mobile, address, city, state, pincode]
 *       properties:
 *         name:        { type: string, example: "Rahul Sharma" }
 *         email:       { type: string, format: email, example: "rahul@example.com" }
 *         mobile:      { type: string, example: "9876543210" }
 *         address:     { type: string, example: "123 MG Road" }
 *         address_type:
 *           type: string
 *           enum: [Home, Office, Seller, Warehouse]
 *           default: Home
 *         city:        { type: string, example: "Bengaluru" }
 *         state:       { type: string, example: "Karnataka" }
 *         pincode:     { type: string, example: "560001" }
 *         country:     { type: string, default: "India" }
 *
 *     OrderCreateRequest:
 *       type: object
 *       required:
 *         - courier_partner
 *         - order_id
 *         - declared_value
 *         - item_description
 *         - collectable_value
 *         - weight
 *         - length
 *         - breadth
 *         - height
 *         - invoice_number
 *         - invoice_date
 *         - invoice_value
 *         - consignee
 *         - shipper
 *         - return_address
 *       properties:
 *         courier_partner:
 *           type: string
 *           enum: [urbanebolt, mockcourier]
 *           example: mockcourier
 *         order_id:
 *           type: string
 *           example: ORD-2024-001
 *           description: Your unique order identifier (used as idempotency key)
 *         declared_value:  { type: number, example: 500 }
 *         item_description: { type: string, example: "Books" }
 *         collectable_value: { type: number, example: 500 }
 *         weight:  { type: number, example: 1.2 }
 *         length:  { type: number, example: 20 }
 *         breadth: { type: number, example: 15 }
 *         height:  { type: number, example: 10 }
 *         pieces:  { type: integer, default: 1 }
 *         service_type:
 *           type: string
 *           default: SDD
 *           example: SDD
 *         payment_mode:
 *           type: string
 *           enum: [COD, PREPAID]
 *           default: PREPAID
 *         invoice_number: { type: string, example: "INV-001" }
 *         invoice_date:   { type: string, example: "2024-07-01", description: "YYYY-MM-DD" }
 *         invoice_value:  { type: number, example: 500 }
 *         item_quantity:  { type: integer, default: 1 }
 *         consignee:      { $ref: '#/components/schemas/Address' }
 *         shipper:        { $ref: '#/components/schemas/Address' }
 *         return_address: { $ref: '#/components/schemas/Address' }
 *
 *     TrackingEvent:
 *       type: object
 *       properties:
 *         status:      { type: string, example: "IN_TRANSIT" }
 *         event_time:  { type: string, format: date-time }
 *         location:    { type: string, example: "Delhi Hub" }
 *         description: { type: string, example: "Shipment in transit" }
 *
 *     OrderTrackData:
 *       type: object
 *       properties:
 *         order_id:        { type: string, example: "ORD-2024-001" }
 *         courier_partner: { type: string, example: "mockcourier" }
 *         awb_number:      { type: string, example: "MOCK7AEF2E8B4F" }
 *         status:
 *           type: string
 *           enum: [CREATED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY, DELIVERED, CANCELLED, FAILED, RTO_INITIATED, RTO_DELIVERED]
 *         tracking_history:
 *           type: array
 *           items: { $ref: '#/components/schemas/TrackingEvent' }
 *
 *     BatchStatusData:
 *       type: object
 *       properties:
 *         batch_id:          { type: string, example: "BATCH-A1B2C3D4" }
 *         status:
 *           type: string
 *           enum: [PROCESSING, COMPLETED, PARTIAL_SUCCESS, FAILED]
 *         total_orders:      { type: integer, example: 10 }
 *         processed_orders:  { type: integer, example: 10 }
 *         successful_orders: { type: integer, example: 9 }
 *         failed_orders:     { type: integer, example: 1 }
 *         results:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               order_id:   { type: string }
 *               success:    { type: boolean }
 *               awb_number: { type: string }
 *               error:      { type: string }
 */

/**
 * @openapi
 * /api/v1/orders/bulk:
 *   post:
 *     tags: [Orders]
 *     summary: Bulk create orders (up to 100)
 *     description: |
 *       Accepts up to 100 orders in one request. Returns a `batch_id` immediately
 *       (HTTP 202). Orders are processed concurrently in the background.
 *       Poll `GET /api/v1/orders/batch/{batch_id}` to get per-order results.
 *       Each order may use a different `courier_partner`.
 *       Duplicate `order_id` values within the batch are handled gracefully.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [orders]
 *             properties:
 *               orders:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items: { $ref: '#/components/schemas/OrderCreateRequest' }
 *     responses:
 *       '202':
 *         description: Batch accepted — processing in background
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *             example:
 *               success: true
 *               statusCode: 202
 *               result:
 *                 message: "Bulk order request accepted. Use the batch_id to poll for results."
 *                 data:
 *                   batch_id: BATCH-A1B2C3D4
 *                   total_orders: 3
 *                   status: PROCESSING
 *       '400':
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */

// POST /api/v1/orders/bulk must come before /:order_id routes
// to avoid Express matching 'bulk' as an order_id param
orderRouter.post(
  '/bulk',
  contextMiddleware(true),
  validateJoiSchema({ body: createBulkOrderSchema }),
  orderController.createBulkOrders
);

/**
 * @openapi
 * /api/v1/orders/batch/{batch_id}:
 *   get:
 *     tags: [Orders]
 *     summary: Get bulk batch status and per-order results
 *     description: Poll this endpoint after submitting a bulk request to check progress and see per-order success/failure details.
 *     parameters:
 *       - in: path
 *         name: batch_id
 *         required: true
 *         schema: { type: string }
 *         example: BATCH-A1B2C3D4
 *     responses:
 *       '200':
 *         description: Batch status retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *             example:
 *               success: true
 *               statusCode: 200
 *               result:
 *                 message: "Batch status fetched successfully"
 *                 data:
 *                   batch_id: BATCH-A1B2C3D4
 *                   status: PARTIAL_SUCCESS
 *                   total_orders: 3
 *                   processed_orders: 3
 *                   successful_orders: 2
 *                   failed_orders: 1
 *                   results:
 *                     - { order_id: ORD-001, success: true, awb_number: MOCK7AEF2E8B4F }
 *                     - { order_id: ORD-002, success: true, awb_number: MOCK9BC3D1A2E5 }
 *                     - { order_id: ORD-003, success: false, error: "Courier rejected the request." }
 *       '404':
 *         description: Batch not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
orderRouter.get(
  '/batch/:batch_id',
  contextMiddleware(false),
  validateJoiSchema({ params: batchIdParamSchema }),
  orderController.getBatchStatus
);

/**
 * @openapi
 * /api/v1/orders:
 *   post:
 *     tags: [Orders]
 *     summary: Create a single shipment
 *     description: |
 *       Creates a shipment with the specified courier partner.
 *       **Idempotent** — submitting the same `order_id` twice returns the existing
 *       order without calling the courier again.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: '#/components/schemas/OrderCreateRequest' }
 *     responses:
 *       '201':
 *         description: Order created successfully
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *             example:
 *               success: true
 *               statusCode: 201
 *               result:
 *                 message: "Order created successfully"
 *                 data:
 *                   internal_order_id: ORD-2024-001
 *                   courier_partner: mockcourier
 *                   awb_number: MOCK7AEF2E8B4F
 *                   status: CREATED
 *       '400':
 *         description: Validation error or unsupported courier
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       '502':
 *         description: Courier API error (after retries)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
orderRouter.post(
  '/',
  contextMiddleware(true),
  validateJoiSchema({ body: createOrderSchema }),
  orderController.createOrder
);

/**
 * @openapi
 * /api/v1/orders/{order_id}/track:
 *   get:
 *     tags: [Orders]
 *     summary: Track a shipment
 *     description: |
 *       Fetches the latest status from the courier and appends a new tracking event
 *       to the history if the status has changed. Returns the full tracking history.
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *         example: ORD-2024-001
 *     responses:
 *       '200':
 *         description: Tracking data retrieved
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *             example:
 *               success: true
 *               statusCode: 200
 *               result:
 *                 message: "Tracking details fetched successfully"
 *                 data:
 *                   order_id: ORD-2024-001
 *                   courier_partner: mockcourier
 *                   awb_number: MOCK7AEF2E8B4F
 *                   status: IN_TRANSIT
 *                   tracking_history:
 *                     - { status: IN_TRANSIT, event_time: "2024-07-01T14:00:00Z", location: "Delhi Hub", description: "Shipment in transit" }
 *                     - { status: CREATED,    event_time: "2024-07-01T10:00:00Z", location: null, description: "Order created" }
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       '502':
 *         description: Courier API error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
orderRouter.get(
  '/:order_id/track',
  contextMiddleware(true),
  validateJoiSchema({ params: orderIdParamSchema }),
  orderController.trackOrder
);

/**
 * @openapi
 * /api/v1/orders/{order_id}/cancel:
 *   post:
 *     tags: [Orders]
 *     summary: Cancel a shipment
 *     description: |
 *       Cancels the shipment with the courier. Cannot cancel an already-delivered order.
 *       If the order never got an AWB (failed at creation), it is marked cancelled locally.
 *     parameters:
 *       - in: path
 *         name: order_id
 *         required: true
 *         schema: { type: string }
 *         example: ORD-2024-001
 *     responses:
 *       '200':
 *         description: Order cancelled
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/SuccessResponse' }
 *             example:
 *               success: true
 *               statusCode: 200
 *               result:
 *                 message: "Order cancelled successfully"
 *                 data: { order_id: ORD-2024-001, status: CANCELLED }
 *       '400':
 *         description: Cannot cancel (e.g. already delivered)
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       '404':
 *         description: Order not found
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 *       '502':
 *         description: Courier API error
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/ErrorResponse' }
 */
orderRouter.post(
  '/:order_id/cancel',
  contextMiddleware(true),
  validateJoiSchema({ params: orderIdParamSchema }),
  orderController.cancelOrder
);

module.exports = orderRouter;
