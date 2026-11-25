const path = require('path');
const express = require('express');
const authRoutes = require('./routes/authRoutes');
const carRoutes = require('./routes/carRoutes');
const orderRoutes = require('./routes/orderRoutes');
const { sendMessage } = require('./controllers/contactController');

const app = express();
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

app.use(express.json());

// ---- API ---------------------------------------------------------------
app.get('/api/v1', (req, res) => {
  res.status(200).json({ status: 200, data: { message: 'Welcome to AutoMart API v1' } });
});
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/car', carRoutes);
app.use('/api/v1/order', orderRoutes);
app.post('/api/v1/contact', sendMessage);

app.use('/api', (req, res) => {
  res.status(404).json({ status: 404, error: 'Route not found' });
});

// ---- Front end ---------------------------------------------------------
app.use(express.static(PUBLIC_DIR, { extensions: ['html'] }));

app.use((req, res) => {
  res.status(404).sendFile(path.join(PUBLIC_DIR, '404.html'));
});

// Malformed JSON and other errors
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ status, error: status === 500 ? 'Something went wrong' : err.message });
});

module.exports = app;
