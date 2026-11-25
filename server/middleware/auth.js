const jwt = require('jsonwebtoken');
const { SECRET } = require('../config');

const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ status: 401, error: 'Authentication required' });
  }
  try {
    req.user = jwt.verify(token, SECRET);
    return next();
  } catch (err) {
    return res.status(401).json({ status: 401, error: 'Invalid or expired token' });
  }
};

const requireAdmin = (req, res, next) => {
  if (!req.user || !req.user.is_admin) {
    return res.status(403).json({ status: 403, error: 'Admin access required' });
  }
  return next();
};

module.exports = { authenticate, requireAdmin };
