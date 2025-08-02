require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const http = require('http');
const verifySocketToken = require('./app/middleware/socketAuth');
const { updateLastSeenTimestamp } = require('./app/utils/lastSeen.helper');

const app = express();
const server = http.createServer(app);

// Enhanced Socket.IO configuration
const { initSocket, getIO, userSockets } = require('./app/middleware/socket');
const io = initSocket(server, {
  cors: {
    origin: process.env.CLIENT_URL || true,
    methods: ['GET', 'POST'],
    credentials: true
  },
  path: '/socket.io',
  serveClient: false,
  pingTimeout: 60000,
  pingInterval: 25000,
  cookie: false
});

// Improved Socket.IO middleware registration
io.use((socket, next) => {
  console.log('Authenticating socket connection...');
  verifySocketToken(socket, (err) => {
    if (err) {
      console.error('Socket authentication failed:', err.message);
      return next(new Error('Authentication error'));
    }
    console.log('Socket authenticated successfully');
    next();
  });
});

// Socket.IO connection handling with proper error management
io.on('connection', async (socket) => {
  try {
    console.log(`New connection from socket ID: ${socket.id}`);

    if (!socket.user?.id) {
      throw new Error('No user ID found in socket');
    }

    const userId = socket.user.id;
    userSockets.set(userId, socket.id);

    // Update user's online status
    await updateLastSeenTimestamp(userId, true);
    io.emit('user-online', { userId });

    // Thread management
    socket.on('joinThread', ({ threadId }, callback) => {
      try {
        if (!threadId) throw new Error('No threadId provided');
        
        // Leave any existing thread rooms
        socket.rooms.forEach(room => {
          if (room.startsWith('thread-')) {
            socket.leave(room);
          }
        });

        socket.join(`thread-${threadId}`);
        console.log(`User ${userId} joined thread ${threadId}`);
        callback({ status: 'success' });
      } catch (err) {
        console.error(`Error joining thread:`, err);
        callback({ status: 'error', error: err.message });
      }
    });

    socket.on('leaveThread', ({ threadId }) => {
      if (!threadId) return;
      socket.leave(`thread-${threadId}`);
      console.log(`User ${userId} left thread ${threadId}`);
    });

    // Typing indicator
    socket.on('typing', ({ threadId, isTyping }) => {
      if (!threadId) return;
      socket.to(`thread-${threadId}`).emit('typing', { 
        userId, 
        isTyping,
        threadId 
      });
    });

    // Read receipts
    socket.on('markAsRead', ({ threadId }) => {
      if (!threadId) return;
      socket.to(`thread-${threadId}`).emit('readMessages', { threadId });
    });

    // Disconnection handler
    socket.on('disconnect', async () => {
      console.log(`User disconnected: ${userId}`);
      userSockets.delete(userId);
      try {
        await updateLastSeenTimestamp(userId, false);
        io.emit('user-offline', { userId });
      } catch (err) {
        console.error('Error updating last seen on disconnect:', err);
      }
    });

  } catch (err) {
    console.error('Connection setup error:', err);
    socket.disconnect(true);
  }
});

// Enhanced CORS configuration
app.use(cors({ 
  origin: process.env.CLIENT_URL || true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
}));

// Security middleware
app.use(helmet());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static('uploads'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later'
});
app.use(limiter);

// Routes
app.use('/api/auth', require('./app/routes/auth'));
app.use('/api/user', require('./app/routes/user'));
app.use('/api/chat', require('./app/routes/chat'));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    websockets: io.engine.clientsCount,
    uptime: process.uptime()
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Server startup
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}/socket.io`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err);
});