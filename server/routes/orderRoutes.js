const express = require('express');
const o = require('../controllers/orderController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);
router.post('/', o.createOrder);
router.get('/', o.listMyOrders);
router.patch('/:id/price', o.updateOrderPrice);

module.exports = router;
