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
  .then(() => {
    console.log('Connected to MongoDB');
    
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

// Setup reminder cron job (runs daily at 9 AM)
const reminderJob = new CronJob('0 9 * * *', async () => {
  try {
    console.log('Running reminder job...');
    
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const endOfTomorrow = new Date(tomorrow);
    endOfTomorrow.setHours(23, 59, 59, 999);
    
    // Find bookings for tomorrow that haven't had reminders sent
    const bookings = await Booking.find({
      bookingDate: {
        $gte: tomorrow,
        $lte: endOfTomorrow
      },
      status: { $in: ['pending', 'confirmed'] },
      reminderSent: { $ne: true }
    });
    
    console.log(`Found ${bookings.length} bookings for reminder`);
    
    // Send reminder emails
    for (const booking of bookings) {
      try {
        await sendBookingReminderEmail(booking);
        // Mark as reminder sent
        await Booking.findByIdAndUpdate(booking._id, { reminderSent: true });
        console.log(`Sent reminder for booking ${booking._id}`);
      } catch (emailError) {
        console.error(`Failed to send reminder for booking ${booking._id}:`, emailError);
      }
    }
    
    console.log(`Sent ${bookings.length} reminder emails`);
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
