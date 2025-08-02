const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const dbHelper = require('../config/db.helper'); // Updated path

let io;
const userSockets = new Map();

exports.initSocket = (httpServer, config = {}) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.CLIENT_URL || true,
      methods: ["GET", "POST"],
      credentials: true
    },
    path: '/socket.io',
    ...config
  });

  // Add connection state logging
  io.engine.on("connection_error", (err) => {
    console.error("Socket.IO connection error:", err);
  });

  // Connection handlers
  io.on('connection', async (socket) => {
    console.log('New client connected:', socket.id);

    // Verify user authentication
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (!token) {
      socket.disconnect();
      return;
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = decoded;

      const userId = decoded.id;
      userSockets.set(userId, socket.id);

      // Join user's personal room
      socket.join(`user-${userId}`);
      
      // Update online status
      await updateUserStatus(userId, true);

      // Thread management
      socket.on('joinThread', ({ threadId }, callback) => {
        if (!threadId) {
          callback({ error: 'Thread ID is required' });
          return;
        }

        socket.join(`thread-${threadId}`);
        console.log(`User ${userId} joined thread ${threadId}`);
        callback({ status: 'success' });
      });

      socket.on('leaveThread', ({ threadId }, callback) => {
        if (!threadId) {
          callback({ error: 'Thread ID is required' });
          return;
        }

        socket.leave(`thread-${threadId}`);
        console.log(`User ${userId} left thread ${threadId}`);
        callback({ status: 'success' });
      });

      // Typing indicators
      socket.on('typing', ({ threadId, isTyping }) => {
        if (!threadId) return;
        socket.to(`thread-${threadId}`).emit('typing', {
          userId,
          isTyping,
          threadId
        });
      });

      // Mark messages as read
      socket.on('markAsRead', ({ threadId }) => {
        if (!threadId) return;
        socket.to(`thread-${threadId}`).emit('readMessages', { threadId });
      });

      // Handle disconnection
      socket.on('disconnect', async () => {
        console.log(`User ${userId} disconnected`);
        userSockets.delete(userId);
        await updateUserStatus(userId, false);
      });

    } catch (err) {
      console.error('Socket connection error:', err);
      socket.disconnect();
    }
  });

  return io;
};

async function updateUserStatus(userId, isOnline) {
  try {
    await dbHelper.callStoredProcedure('UPDATE_LAST_SEEN', [
      { value: userId },
      { value: isOnline ? 1 : 0 }
    ]);
    io.emit('user-status', { userId, isOnline });
  } catch (err) {
    console.error('Error updating user status:', err);
  }
}

// Utility functions
exports.getIO = () => {
  if (!io) throw new Error('Socket.io not initialized!');
  return io;
};

exports.userSockets = userSockets;

exports.getSocketId = (userId) => {
  return userSockets.get(userId);
};

exports.emitToUser = (userId, event, data) => {
  const socketId = userSockets.get(userId);
  if (socketId && io) {
    io.to(socketId).emit(event, data);
  }
};

exports.emitToThread = (threadId, event, data) => {
  if (io) {
    io.to(`thread-${threadId}`).emit(event, data);
  }
};