const express = require('express');
const c = require('../controllers/carController');
const { authenticate, requireAdmin } = require('../middleware/auth');

const router = express.Router();

router.get('/', c.listCars);
router.get('/:id', c.getCar);
router.post('/', authenticate, c.createCar);
router.patch('/:id/status', authenticate, c.markSold);
router.patch('/:id/price', authenticate, c.updatePrice);
router.delete('/:id', authenticate, requireAdmin, c.deleteCar);

module.exports = router;
