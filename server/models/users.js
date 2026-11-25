const bcrypt = require('bcryptjs');

// In-memory store. A demo admin account is seeded so the admin-only
// endpoints can be exercised: admin@automart.dev / admin1234
const users = [
  {
    id: 1,
    email: 'admin@automart.dev',
    first_name: 'Auto',
    last_name: 'Mart',
    password: bcrypt.hashSync('admin1234', 8),
    address: '',
    is_admin: true,
  },
];

module.exports = users;
