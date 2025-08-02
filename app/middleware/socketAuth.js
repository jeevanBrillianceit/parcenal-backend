const jwt = require('jsonwebtoken');

module.exports = function(socket, next) {
  // Verify the middleware is being called as a function
  if (typeof next !== 'function') {
    console.error('Socket middleware called without next function');
    return;
  }

  try {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    
    if (!token) {
      console.error('No token provided');
      return next(new Error('Unauthorized: No token provided'));
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = decoded;
    return next();
  } catch (err) {
    console.error('Token verification failed:', err.message);
    return next(new Error('Invalid Token: ' + err.message));
  }
};
