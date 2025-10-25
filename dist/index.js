"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const mongoose_1 = __importDefault(require("mongoose"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const dotenv_1 = __importDefault(require("dotenv"));
const cron_1 = require("cron");
// Import routes
const auth_1 = __importDefault(require("./routes/auth"));
const booking_1 = __importDefault(require("./routes/booking"));
const admin_1 = __importDefault(require("./routes/admin"));
const systemConfig_1 = __importDefault(require("./routes/systemConfig"));
const cron_2 = __importDefault(require("./routes/cron"));
// Import services
const emailService_1 = require("./utils/emailService");
const Booking_1 = __importDefault(require("./models/Booking"));
// Load environment variables
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5004;
// CORS configuration - Allow all origins
app.use((0, cors_1.default)({
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: false // Set to false when using wildcard origin
}));
// Security middleware
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false, // Disable for CORS compatibility
    contentSecurityPolicy: false // Disable for development
}));
// Body parsing middleware
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/bookings', booking_1.default);
app.use('/api/admin', admin_1.default);
app.use('/api/system-config', systemConfig_1.default);
app.use('/api/cron', cron_2.default);
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
app.use((err, req, res, next) => {
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
mongoose_1.default.connect(process.env.MONGODB_URI)
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
const reminderJob = new cron_1.CronJob('0 9 * * *', async () => {
    try {
        console.log('Running reminder job...');
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const endOfTomorrow = new Date(tomorrow);
        endOfTomorrow.setHours(23, 59, 59, 999);
        // Find bookings for tomorrow that haven't had reminders sent
        const bookings = await Booking_1.default.find({
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
                await (0, emailService_1.sendBookingReminderEmail)(booking);
                // Mark as reminder sent
                await Booking_1.default.findByIdAndUpdate(booking._id, { reminderSent: true });
                console.log(`Sent reminder for booking ${booking._id}`);
            }
            catch (emailError) {
                console.error(`Failed to send reminder for booking ${booking._id}:`, emailError);
            }
        }
        console.log(`Sent ${bookings.length} reminder emails`);
    }
    catch (error) {
        console.error('Reminder job error:', error);
    }
}, null, true, 'Asia/Ho_Chi_Minh');
// Start the cron job
reminderJob.start();
console.log('Reminder cron job started');
// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    mongoose_1.default.connection.close();
    process.exit(0);
});
process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    mongoose_1.default.connection.close();
    process.exit(0);
});
//# sourceMappingURL=index.js.map