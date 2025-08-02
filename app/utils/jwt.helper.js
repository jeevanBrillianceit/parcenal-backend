const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

// Generate JWT token for 1 day
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '1d' });
};

// Verify JWT token validity
const verifyToken = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
};
