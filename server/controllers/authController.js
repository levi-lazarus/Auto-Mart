const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const users = require('../models/users');
const { SECRET } = require('../config');

const createToken = (user) => jwt.sign(
  { id: user.id, email: user.email, is_admin: user.is_admin },
  SECRET,
  { expiresIn: '24h' },
);

const publicUser = (user, token) => ({
  token,
  id: user.id,
  first_name: user.first_name,
  last_name: user.last_name,
  email: user.email,
  is_admin: user.is_admin,
});

const signup = async (req, res) => {
  const {
    email, first_name: firstName, last_name: lastName, password, address,
  } = req.body || {};

  if (!email || !firstName || !lastName || !password) {
    return res.status(400).json({
      status: 400,
      error: 'email, first_name, last_name and password are required',
    });
  }

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ status: 400, error: 'Invalid email address' });
  }

  if (password.length < 6) {
    return res.status(400).json({ status: 400, error: 'Password must be at least 6 characters long' });
  }

  const exists = users.find((u) => u.email === email.toLowerCase());
  if (exists) {
    return res.status(409).json({ status: 409, error: 'Email is already registered' });
  }

  const user = {
    id: users.length + 1,
    email: email.toLowerCase(),
    first_name: firstName.trim(),
    last_name: lastName.trim(),
    password: await bcrypt.hash(password, 10),
    address: address || '',
    is_admin: false,
  };
  users.push(user);

  return res.status(201).json({ status: 201, data: publicUser(user, createToken(user)) });
};

const signin = async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ status: 400, error: 'email and password are required' });
  }

  const user = users.find((u) => u.email === String(email).toLowerCase());
  const valid = user && await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ status: 401, error: 'Incorrect email or password' });
  }

  return res.status(200).json({ status: 200, data: publicUser(user, createToken(user)) });
};

const me = (req, res) => {
  const user = users.find((u) => u.id === req.user.id);
  if (!user) return res.status(404).json({ status: 404, error: 'User not found' });
  return res.status(200).json({ status: 200, data: publicUser(user) });
};

module.exports = { signup, signin, me };
