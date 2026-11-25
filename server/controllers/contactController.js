const messages = require('../models/messages');

const sendMessage = (req, res) => {
  const { name, email, message, topic = 'General' } = req.body || {};
  if (!name || !email || !message) {
    return res.status(400).json({ status: 400, error: 'name, email and message are required' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ status: 400, error: 'Invalid email address' });
  }
  const entry = {
    id: messages.length + 1, name, email, topic, message, created_on: new Date().toISOString(),
  };
  messages.push(entry);
  return res.status(201).json({ status: 201, data: { id: entry.id, message: 'Thanks! We will be in touch within 24 hours.' } });
};

module.exports = { sendMessage };
