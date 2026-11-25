const orders = require('../models/orders');
const cars = require('../models/cars');

const createOrder = (req, res) => {
  const { car_id: carId, amount } = req.body || {};
  const car = cars.find((c) => c.id === Number(carId));
  if (!car) return res.status(404).json({ status: 404, error: 'Car not found' });
  if (car.status !== 'available') return res.status(400).json({ status: 400, error: 'This car has already been sold' });
  if (!Number(amount) || Number(amount) <= 0) {
    return res.status(400).json({ status: 400, error: 'amount must be a positive number' });
  }

  const order = {
    id: orders.length + 1,
    buyer: req.user.id,
    car_id: car.id,
    created_on: new Date().toISOString(),
    status: 'pending',
    price: car.price,
    price_offered: Number(amount),
  };
  orders.push(order);
  return res.status(201).json({ status: 201, data: order });
};

const listMyOrders = (req, res) => {
  const mine = orders.filter((o) => o.buyer === req.user.id);
  return res.status(200).json({ status: 200, data: mine });
};

const updateOrderPrice = (req, res) => {
  const order = orders.find((o) => o.id === Number(req.params.id));
  if (!order) return res.status(404).json({ status: 404, error: 'Order not found' });
  if (order.buyer !== req.user.id) return res.status(403).json({ status: 403, error: 'You can only update your own orders' });
  if (order.status !== 'pending') return res.status(400).json({ status: 400, error: 'Only pending orders can be updated' });
  const price = Number((req.body || {}).price);
  if (!price || price <= 0) return res.status(400).json({ status: 400, error: 'price must be a positive number' });

  const oldPrice = order.price_offered;
  order.price_offered = price;
  return res.status(200).json({
    status: 200,
    data: { ...order, old_price_offered: oldPrice, new_price_offered: price },
  });
};

module.exports = { createOrder, listMyOrders, updateOrderPrice };
