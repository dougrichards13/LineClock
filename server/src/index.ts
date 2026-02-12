import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth';
import timeEntriesRoutes from './routes/timeEntries';
import vacationsRoutes from './routes/vacations';
import questionsRoutes from './routes/questions';
import dashboardRoutes from './routes/dashboard';
import clientsRoutes from './routes/clients';
import projectsRoutes from './routes/projects';
import userAssignmentsRoutes from './routes/userAssignments';
import invoicesRoutes from './routes/invoices';
import billcomConfigRoutes from './routes/billcomConfig';
import templatesRoutes from './routes/templates';
import overtimeRoutes from './routes/overtime';
import fractionalIncentivesRoutes from './routes/fractionalIncentives';
import financialReportsRoutes from './routes/financialReports';
import modificationRequestsRoutes from './routes/modificationRequests';
import prisma from './utils/prisma';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';
const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

console.log(`🔒 CORS enabled for: ${CORS_ORIGIN}`);
console.log(`📍 Environment: ${NODE_ENV}`);

// Security Middleware
// Helmet - sets various HTTP headers for security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", CORS_ORIGIN],
    },
  },
  crossOriginEmbedderPolicy: false, // Allow embedding for Microsoft auth
}));

// Rate Limiting - prevent brute force attacks
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isProduction ? 100 : 1000, // Limit each IP to 100 requests per windowMs in production
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/', limiter);

// Auth endpoint rate limiting (stricter)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 auth requests per windowMs
  message: 'Too many authentication attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api/auth/', authLimiter);

// CORS
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true,
}));

// Body parsing with size limits
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Force HTTPS in production
if (isProduction) {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      res.redirect(`https://${req.header('host')}${req.url}`);
    } else {
      next();
    }
  });
}

// Health check with database connectivity
app.get('/health', async (req, res) => {
  const health: any = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    environment: NODE_ENV,
  };

  // Check database connectivity
  try {
    await prisma.$queryRaw`SELECT 1`;
    health.database = 'connected';
  } catch (error) {
    health.status = 'degraded';
    health.database = 'disconnected';
    console.error('Database health check failed:', error);
  }

  const statusCode = health.status === 'ok' ? 200 : 503;
  res.status(statusCode).json(health);
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/time-entries', timeEntriesRoutes);
app.use('/api/vacations', vacationsRoutes);
app.use('/api/questions', questionsRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/clients', clientsRoutes);
app.use('/api/projects', projectsRoutes);
app.use('/api/assignments', userAssignmentsRoutes);
app.use('/api/invoices', invoicesRoutes);
app.use('/api/billcom', billcomConfigRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/overtime', overtimeRoutes);
app.use('/api/fractional-incentives', fractionalIncentivesRoutes);
app.use('/api/financial-reports', financialReportsRoutes);
app.use('/api/modification-requests', modificationRequestsRoutes);

// 404 handler for undefined routes
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  // Log error details
  console.error('=== Error Details ===');
  console.error('Time:', new Date().toISOString());
  console.error('Path:', req.path);
  console.error('Method:', req.method);
  console.error('Error:', err);
  console.error('Stack:', err.stack);
  console.error('==================');

  // Determine status code
  const statusCode = err.statusCode || err.status || 500;

  // Send response (hide details in production)
  res.status(statusCode).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message || 'Internal server error',
    ...(isProduction ? {} : { stack: err.stack }),
  });
});

const HOST = process.env.HOST || '0.0.0.0';

app.listen(Number(PORT), HOST, () => {
  console.log(`🚀 LineClock server running on ${HOST}:${PORT}`);
  console.log(`📍 Environment: ${NODE_ENV}`);
  console.log(`🔗 Health check: http://${HOST}:${PORT}/health`);
});
