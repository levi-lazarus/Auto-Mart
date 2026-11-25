const request = require('supertest');
const { expect } = require('chai');
const app = require('../server/app');

const API = '/api/v1';

describe('AutoMart API', () => {
  let userToken;
  let adminToken;
  let orderId;

  describe('Auth', () => {
    it('signs up a new user', async () => {
      const res = await request(app).post(`${API}/auth/signup`).send({
        email: 'ada@example.com', first_name: 'Ada', last_name: 'Lovelace', password: 'secret123',
      });
      expect(res.status).to.equal(201);
      expect(res.body.data).to.include({ email: 'ada@example.com', first_name: 'Ada' });
      expect(res.body.data.token).to.be.a('string');
      expect(res.body.data).to.not.have.property('password');
    });

    it('rejects duplicate emails', async () => {
      const res = await request(app).post(`${API}/auth/signup`).send({
        email: 'ADA@example.com', first_name: 'Ada', last_name: 'L', password: 'secret123',
      });
      expect(res.status).to.equal(409);
    });

    it('validates required fields and password length', async () => {
      expect((await request(app).post(`${API}/auth/signup`).send({ email: 'x@y.z' })).status).to.equal(400);
      const short = await request(app).post(`${API}/auth/signup`).send({
        email: 'b@example.com', first_name: 'B', last_name: 'C', password: '123',
      });
      expect(short.status).to.equal(400);
    });

    it('signs in with correct credentials', async () => {
      const res = await request(app).post(`${API}/auth/signin`).send({ email: 'ada@example.com', password: 'secret123' });
      expect(res.status).to.equal(200);
      userToken = res.body.data.token;
      const admin = await request(app).post(`${API}/auth/signin`).send({ email: 'admin@automart.dev', password: 'admin1234' });
      adminToken = admin.body.data.token;
      expect(admin.body.data.is_admin).to.equal(true);
    });

    it('rejects wrong passwords', async () => {
      const res = await request(app).post(`${API}/auth/signin`).send({ email: 'ada@example.com', password: 'nope' });
      expect(res.status).to.equal(401);
    });

    it('returns the current user for a valid token', async () => {
      const res = await request(app).get(`${API}/auth/me`).set('Authorization', `Bearer ${userToken}`);
      expect(res.status).to.equal(200);
      expect(res.body.data.email).to.equal('ada@example.com');
      expect((await request(app).get(`${API}/auth/me`)).status).to.equal(401);
    });
  });

  describe('Cars', () => {
    it('lists the inventory', async () => {
      const res = await request(app).get(`${API}/car`);
      expect(res.status).to.equal(200);
      expect(res.body.data).to.be.an('array').with.length.greaterThan(5);
    });

    it('filters by body type, price range and search term', async () => {
      const suv = await request(app).get(`${API}/car?body_type=suv`);
      expect(suv.body.data.every((c) => c.body_type === 'SUV')).to.equal(true);

      const range = await request(app).get(`${API}/car?min_price=20000&max_price=30000`);
      expect(range.body.data.every((c) => c.price >= 20000 && c.price <= 30000)).to.equal(true);

      const q = await request(app).get(`${API}/car?q=porsche`);
      expect(q.body.data).to.have.length(1);
    });

    it('sorts by price', async () => {
      const res = await request(app).get(`${API}/car?sort=price_asc`);
      const prices = res.body.data.map((c) => c.price);
      expect(prices).to.deep.equal([...prices].sort((a, b) => a - b));
    });

    it('gets a single car and 404s for unknown ids', async () => {
      expect((await request(app).get(`${API}/car/1`)).body.data.id).to.equal(1);
      expect((await request(app).get(`${API}/car/9999`)).status).to.equal(404);
    });

    it('requires auth to post a car ad and validates it', async () => {
      expect((await request(app).post(`${API}/car`).send({})).status).to.equal(401);
      const bad = await request(app).post(`${API}/car`).set('Authorization', `Bearer ${userToken}`)
        .send({ manufacturer: 'Kia', model: 'Rio', price: 9000, body_type: 'Spaceship' });
      expect(bad.status).to.equal(400);
    });

    it('lets a user post, reprice and mark their own car sold', async () => {
      const auth = { Authorization: `Bearer ${userToken}` };
      const created = await request(app).post(`${API}/car`).set(auth).send({
        manufacturer: 'Volkswagen', model: 'Golf', year: 2019, price: 15000, body_type: 'Hatchback',
      });
      expect(created.status).to.equal(201);
      const { id } = created.body.data;

      const priced = await request(app).patch(`${API}/car/${id}/price`).set(auth).send({ price: 14000 });
      expect(priced.body.data.price).to.equal(14000);

      const sold = await request(app).patch(`${API}/car/${id}/status`).set(auth);
      expect(sold.body.data.status).to.equal('sold');

      // someone else's car
      expect((await request(app).patch(`${API}/car/1/price`).set(auth).send({ price: 1 })).status).to.equal(403);
    });

    it('only allows admins to delete ads', async () => {
      expect((await request(app).delete(`${API}/car/2`).set('Authorization', `Bearer ${userToken}`)).status).to.equal(403);
      expect((await request(app).delete(`${API}/car/2`).set('Authorization', `Bearer ${adminToken}`)).status).to.equal(200);
    });
  });

  describe('Orders', () => {
    it('creates a purchase order', async () => {
      const res = await request(app).post(`${API}/order`).set('Authorization', `Bearer ${userToken}`)
        .send({ car_id: 1, amount: 120000 });
      expect(res.status).to.equal(201);
      expect(res.body.data).to.include({ car_id: 1, status: 'pending', price_offered: 120000 });
      orderId = res.body.data.id;
    });

    it('updates the offered price of a pending order', async () => {
      const res = await request(app).patch(`${API}/order/${orderId}/price`).set('Authorization', `Bearer ${userToken}`)
        .send({ price: 121500 });
      expect(res.status).to.equal(200);
      expect(res.body.data).to.include({ old_price_offered: 120000, new_price_offered: 121500 });
    });

    it('lists my orders and blocks anonymous access', async () => {
      const res = await request(app).get(`${API}/order`).set('Authorization', `Bearer ${userToken}`);
      expect(res.body.data).to.have.length(1);
      expect((await request(app).get(`${API}/order`)).status).to.equal(401);
    });
  });

  describe('Contact & misc', () => {
    it('accepts contact messages', async () => {
      const res = await request(app).post(`${API}/contact`).send({ name: 'Sam', email: 'sam@example.com', message: 'Hi!' });
      expect(res.status).to.equal(201);
    });

    it('returns JSON 404 for unknown API routes', async () => {
      const res = await request(app).get(`${API}/nope`);
      expect(res.status).to.equal(404);
      expect(res.body.error).to.equal('Route not found');
    });
  });
});
