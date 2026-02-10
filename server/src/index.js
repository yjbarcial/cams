import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { initializeWebSocket } from './config/websocket.js';

// Import routes
import archivesRoutes from './routes/archives.routes.js';
import departmentsRoutes from './routes/departments.routes.js';
import positionsRoutes from './routes/positions.routes.js';
import profilesRoutes from './routes/profiles.routes.js';
import projectsRoutes from './routes/projects.routes.js';
import projectCommentsRoutes from './routes/projectComments.routes.js';
import projectHistoryRoutes from './routes/projectHistory.routes.js';
import tasksRoutes from './routes/tasks.routes.js';
import notificationsRoutes from './routes/notifications.routes.js';
import mediaFilesRoutes from './routes/mediaFiles.routes.js';
import auditLogsRoutes from './routes/auditLogs.routes.js';
import authRoutes from './routes/auth.routes.js';

// Import middleware
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(compression());

// CORS configuration
const corsOptions = {
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:5173'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Static files for uploads
app.use('/uploads', express.static(join(__dirname, '../uploads')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/archives', archivesRoutes);
app.use('/api/departments', departmentsRoutes);
app.use('/api/positions', positionsRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/projects', projectCommentsRoutes);
app.use('/api/projects', projectHistoryRoutes);
app.use('/api/tasks', tasksRoutes);
app.use('/api/notifications', notificationsRoutes);
app.use('/api/media-files', mediaFilesRoutes);
app.use('/api/audit-logs', auditLogsRoutes);

// Error handling middleware
app.use(notFound);
app.use(errorHandler);

// Create HTTP server and initialize WebSocket
const httpServer = createServer(app);
initializeWebSocket(httpServer);

// Start server
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  console.log(`📡 API available at http://localhost:${PORT}/api`);
  console.log(`🏥 Health check at http://localhost:${PORT}/health`);
  console.log(`🔌 WebSocket server ready`);
});

export default app;
