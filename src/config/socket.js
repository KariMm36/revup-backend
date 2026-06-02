'use strict';

const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const logger = require('./logger');

let io = null;

const initSocket = (httpServer) => {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    },
  });

  // Authenticate socket connections using JWT
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Authentication error: No token provided'));

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      socket.userId = decoded.id;
      next();
    } catch (err) {
      next(new Error('Authentication error: Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    // Each user joins their own private room so we can target them directly
    socket.join(`user:${socket.userId}`);
    logger.info(`[Socket.io] User ${socket.userId} connected (socket: ${socket.id})`);

    socket.on('disconnect', () => {
      logger.info(`[Socket.io] User ${socket.userId} disconnected`);
    });
  });

  logger.info('[Socket.io] Server initialized');
  return io;
};

const getIo = () => {
  if (!io) {
    logger.warn('[Socket.io] Not initialized — real-time events are disabled');
    return null;
  }
  return io;
};

module.exports = { initSocket, getIo };
