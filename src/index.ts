import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import { CronJob } from 'cron';

// Import routes
import authRoutes from './routes/auth';
import bookingRoutes from './routes/booking';
import adminRoutes from './routes/admin';
import systemConfigRoutes from './routes/systemConfig';
import cronRoutes from './routes/cron';

// Import services
import { sendBookingReminderEmail } from './utils/emailService';
import Booking from './models/Booking';
import SystemConfig from './models/SystemConfig';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5004;

// CORS configuration - Allow all origins
app.use(cors({
  origin: '*', // Allow all origins
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: false // Set to false when using wildcard origin
}));

// Security middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false, // Disable for CORS compatibility
  contentSecurityPolicy: false // Disable for development
}));

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/system-config', systemConfigRoutes);
app.use('/api/cron', cronRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    port: PORT,
    cors: 'enabled'
  });
});

// Debug endpoint for auth testing
app.post('/api/auth/debug', (req, res) => {
  console.log('Debug endpoint hit');
  console.log('Request body:', req.body);
  console.log('Request headers:', req.headers);
  res.json({ 
    message: 'Debug endpoint working',
    body: req.body,
    timestamp: new Date().toISOString()
  });
});

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ 
    success: false,
    message: 'Something went wrong!',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    success: false,
    message: 'Route not found' 
  });
});

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI!)
  .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure default general config exists
    try {
      const hasGeneral = await SystemConfig.findOne({ type: 'general' });
      if (!hasGeneral) {
        await SystemConfig.create({
          type: 'general',
          config: {
            timezone: 'Asia/Ho_Chi_Minh',
            reminderHoursBefore: 24,
            reminderTime: ''
          },
          isActive: true
        });
        console.log('Inserted default general config (reminderHoursBefore=24)');
      }
    } catch (e) {
      console.error('Failed to ensure default general config:', e);
    }
    
    // Start server
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  });

// Setup reminder cron job (runs every minute, checks reminderHoursBefore; default 24h)
const reminderJob = new CronJob('*/1 * * * *', async () => {
  try {
    // Load reminderHoursBefore from config (default 24)
    const generalCfg = await SystemConfig.findOne({ type: 'general', isActive: true });
    const reminderHours = Number((generalCfg?.config as any)?.reminderHoursBefore ?? 24);
    const now = new Date();
    const target = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

    const startOfTargetDay = new Date(target);
    startOfTargetDay.setHours(0, 0, 0, 0);
    const endOfTargetDay = new Date(target);
    endOfTargetDay.setHours(23, 59, 59, 999);

    const dayBookings = await Booking.find({
      bookingDate: { $gte: startOfTargetDay, $lt: endOfTargetDay },
      status: 'confirmed',
      reminderSent: { $ne: true }
    });

    let sent = 0;
    for (const booking of dayBookings) {
      try {
        const startStr = String(booking.timeSlot).split('-')[0];
        const [h, m] = startStr.split(':').map((x: string) => parseInt(x, 10));
        const bookingStart = new Date(booking.bookingDate);
        bookingStart.setHours(h || 0, m || 0, 0, 0);
        const diffMs = Math.abs(bookingStart.getTime() - target.getTime());
        const withinWindow = diffMs <= 5 * 60 * 1000; // 5-minute window
        if (withinWindow) {
          await sendBookingReminderEmail(booking);
          await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
          sent++;
          console.log('Reminder sent (auto)', { id: String(booking._id), bookingStart, target });
        }
      } catch (err) {
        console.error('Auto reminder failed', { id: String(booking._id) }, err);
      }
    }
    if (sent > 0) {
      console.log(`Auto reminder job: sent ${sent} email(s)`);
    }
  } catch (error) {
    console.error('Reminder job error:', error);
  }
}, null, true, 'Asia/Ho_Chi_Minh');

// Start the cron job
reminderJob.start();
console.log('Reminder cron job started');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  mongoose.connection.close();
  process.exit(0);
});
