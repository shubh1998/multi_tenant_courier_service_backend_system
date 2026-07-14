const { Router } = require('express');
const orderRoutes = require('./order.routes');

const v1Router = Router();

v1Router.use('/orders', orderRoutes);

module.exports = v1Router;

