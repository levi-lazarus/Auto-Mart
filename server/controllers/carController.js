const cars = require('../models/cars');

const BODY_TYPES = ['Sedan', 'SUV', 'Truck', 'Coupe', 'Hatchback', 'Van', 'Convertible'];

const findCar = (id) => cars.find((c) => c.id === Number(id));

const listCars = (req, res) => {
  const {
    status, state, manufacturer, body_type: bodyType, fuel, min_price: minPrice,
    max_price: maxPrice, q, featured, sort,
  } = req.query;

  let result = cars.slice();

  if (status) result = result.filter((c) => c.status === status);
  if (state) result = result.filter((c) => c.state === state);
  if (manufacturer) result = result.filter((c) => c.manufacturer.toLowerCase() === manufacturer.toLowerCase());
  if (bodyType) result = result.filter((c) => c.body_type.toLowerCase() === bodyType.toLowerCase());
  if (fuel) result = result.filter((c) => c.fuel.toLowerCase() === fuel.toLowerCase());
  if (minPrice) result = result.filter((c) => c.price >= Number(minPrice));
  if (maxPrice) result = result.filter((c) => c.price <= Number(maxPrice));
  if (featured === 'true') result = result.filter((c) => c.featured);
  if (q) {
    const term = q.toLowerCase();
    result = result.filter((c) => `${c.year} ${c.manufacturer} ${c.model} ${c.body_type} ${c.color}`
      .toLowerCase().includes(term));
  }

  const sorters = {
    price_asc: (a, b) => a.price - b.price,
    price_desc: (a, b) => b.price - a.price,
    year_desc: (a, b) => b.year - a.year,
    mileage_asc: (a, b) => a.mileage - b.mileage,
    newest: (a, b) => new Date(b.created_on) - new Date(a.created_on),
  };
  if (sorters[sort]) result.sort(sorters[sort]);

  return res.status(200).json({ status: 200, data: result });
};

const getCar = (req, res) => {
  const car = findCar(req.params.id);
  if (!car) return res.status(404).json({ status: 404, error: 'Car not found' });
  return res.status(200).json({ status: 200, data: car });
};

const createCar = (req, res) => {
  const {
    manufacturer, model, year, price, state = 'used', body_type: bodyType, mileage = 0,
    fuel = 'Petrol', transmission = 'Automatic', color = '', image = '', description = '',
  } = req.body || {};

  if (!manufacturer || !model || !price || !bodyType) {
    return res.status(400).json({ status: 400, error: 'manufacturer, model, price and body_type are required' });
  }
  if (Number.isNaN(Number(price)) || Number(price) <= 0) {
    return res.status(400).json({ status: 400, error: 'price must be a positive number' });
  }
  if (!['new', 'used'].includes(state)) {
    return res.status(400).json({ status: 400, error: "state must be 'new' or 'used'" });
  }
  if (!BODY_TYPES.map((b) => b.toLowerCase()).includes(String(bodyType).toLowerCase())) {
    return res.status(400).json({ status: 400, error: `body_type must be one of ${BODY_TYPES.join(', ')}` });
  }

  const car = {
    id: cars.reduce((max, c) => Math.max(max, c.id), 0) + 1,
    owner: req.user.id,
    created_on: new Date().toISOString(),
    status: 'available',
    featured: false,
    manufacturer,
    model,
    year: Number(year) || new Date().getFullYear(),
    price: Number(price),
    mileage: Number(mileage) || 0,
    body_type: BODY_TYPES.find((b) => b.toLowerCase() === String(bodyType).toLowerCase()),
    fuel,
    transmission,
    color,
    state,
    image,
    description,
  };
  cars.push(car);
  return res.status(201).json({ status: 201, data: car });
};

const canEdit = (req, car) => req.user.is_admin || car.owner === req.user.id;

const markSold = (req, res) => {
  const car = findCar(req.params.id);
  if (!car) return res.status(404).json({ status: 404, error: 'Car not found' });
  if (!canEdit(req, car)) return res.status(403).json({ status: 403, error: 'You can only update your own ads' });
  car.status = 'sold';
  return res.status(200).json({ status: 200, data: car });
};

const updatePrice = (req, res) => {
  const car = findCar(req.params.id);
  if (!car) return res.status(404).json({ status: 404, error: 'Car not found' });
  if (!canEdit(req, car)) return res.status(403).json({ status: 403, error: 'You can only update your own ads' });
  const price = Number((req.body || {}).price);
  if (!price || price <= 0) return res.status(400).json({ status: 400, error: 'price must be a positive number' });
  car.price = price;
  return res.status(200).json({ status: 200, data: car });
};

const deleteCar = (req, res) => {
  const index = cars.findIndex((c) => c.id === Number(req.params.id));
  if (index === -1) return res.status(404).json({ status: 404, error: 'Car not found' });
  cars.splice(index, 1);
  return res.status(200).json({ status: 200, data: 'Car Ad successfully deleted' });
};

module.exports = {
  listCars, getCar, createCar, markSold, updatePrice, deleteCar,
};
