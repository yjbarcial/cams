import { createServer } from 'http';
import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import ProfileModel from '../models/profile.model.js';

let io;

export const initializeWebSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
      credentials: true
    }
  });

  // Authentication middleware
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await ProfileModel.findById(decoded.userId);
      
      if (!user || user.status !== 'active') {
        return next(new Error('Authentication error'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.user.email} (ID: ${socket.user.id})`);

    // Join user-specific room
    socket.join(`user:${socket.user.id}`);

    // Join project rooms
    socket.on('join:project', (projectId) => {
      socket.join(`project:${projectId}`);
      console.log(`User ${socket.user.email} joined project ${projectId}`);
    });

    // Leave project room
    socket.on('leave:project', (projectId) => {
      socket.leave(`project:${projectId}`);
      console.log(`User ${socket.user.email} left project ${projectId}`);
    });

    // Join task room
    socket.on('join:task', (taskId) => {
      socket.join(`task:${taskId}`);
    });

    // Leave task room
    socket.on('leave:task', (taskId) => {
      socket.leave(`task:${taskId}`);
    });

    // Handle typing indicators for comments
    socket.on('typing:start', (data) => {
      socket.to(`${data.type}:${data.id}`).emit('user:typing', {
        userId: socket.user.id,
        userName: `${socket.user.first_name} ${socket.user.last_name}`,
        type: data.type,
        id: data.id
      });
    });

    socket.on('typing:stop', (data) => {
      socket.to(`${data.type}:${data.id}`).emit('user:stopped-typing', {
        userId: socket.user.id,
        type: data.type,
        id: data.id
      });
    });

    // Disconnect
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.user.email}`);
    });
  });

  console.log('🔌 WebSocket server initialized');
  return io;
};

// Emit events to specific users
export const emitToUser = (userId, event, data) => {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
};

// Emit events to all users in a project
export const emitToProject = (projectId, event, data) => {
  if (!io) return;
  io.to(`project:${projectId}`).emit(event, data);
};

// Emit events to all users watching a task
export const emitToTask = (taskId, event, data) => {
  if (!io) return;
  io.to(`task:${taskId}`).emit(event, data);
};

// Broadcast to all connected users
export const broadcastToAll = (event, data) => {
  if (!io) return;
  io.emit(event, data);
};

// Notification events
export const notifyUser = (userId, notification) => {
  emitToUser(userId, 'notification:new', notification);
};

export const notifyProjectUpdate = (projectId, update) => {
  emitToProject(projectId, 'project:updated', update);
};

export const notifyTaskUpdate = (taskId, update) => {
  emitToTask(taskId, 'task:updated', update);
};

export const notifyNewComment = (targetType, targetId, comment) => {
  if (targetType === 'project') {
    emitToProject(targetId, 'comment:new', comment);
  } else if (targetType === 'task') {
    emitToTask(targetId, 'comment:new', comment);
  }
};

export const notifyMemberAdded = (projectId, member) => {
  emitToProject(projectId, 'member:added', member);
  emitToUser(member.user_id, 'project:joined', { projectId, role: member.role });
};

export const notifyMemberRemoved = (projectId, userId) => {
  emitToProject(projectId, 'member:removed', { userId });
  emitToUser(userId, 'project:left', { projectId });
};

export const getIO = () => io;

export default {
  initializeWebSocket,
  emitToUser,
  emitToProject,
  emitToTask,
  broadcastToAll,
  notifyUser,
  notifyProjectUpdate,
  notifyTaskUpdate,
  notifyNewComment,
  notifyMemberAdded,
  notifyMemberRemoved,
  getIO
};
