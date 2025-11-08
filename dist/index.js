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
const SystemConfig_1 = __importDefault(require("./models/SystemConfig"));
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
    .then(async () => {
    console.log('Connected to MongoDB');
    // Ensure default general config exists
    try {
        const hasGeneral = await SystemConfig_1.default.findOne({ type: 'general' });
        if (!hasGeneral) {
            await SystemConfig_1.default.create({
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
    }
    catch (e) {
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
const reminderJob = new cron_1.CronJob('*/1 * * * *', async () => {
    try {
        // Kiểm tra MongoDB connection trước khi query
        if (mongoose_1.default.connection.readyState !== 1) {
            // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
            console.log('[CRON] MongoDB not connected, skipping reminder job. State:', mongoose_1.default.connection.readyState);
            return;
        }
        // Load reminderHoursBefore from config (default 24)
        const generalCfg = await SystemConfig_1.default.findOne({ type: 'general', isActive: true });
        const reminderHours = Number(generalCfg?.config?.reminderHoursBefore ?? 24);
        const now = new Date();
        const target = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
        const startOfTargetDay = new Date(target);
        startOfTargetDay.setHours(0, 0, 0, 0);
        const endOfTargetDay = new Date(target);
        endOfTargetDay.setHours(23, 59, 59, 999);
        const dayBookings = await Booking_1.default.find({
            bookingDate: { $gte: startOfTargetDay, $lt: endOfTargetDay },
            status: 'confirmed',
            reminderSent: { $ne: true }
        });
        let sent = 0;
        for (const booking of dayBookings) {
            try {
                const startStr = String(booking.timeSlot).split('-')[0];
                const [h, m] = startStr.split(':').map((x) => parseInt(x, 10));
                const bookingStart = new Date(booking.bookingDate);
                bookingStart.setHours(h || 0, m || 0, 0, 0);
                const diffMs = Math.abs(bookingStart.getTime() - target.getTime());
                const withinWindow = diffMs <= 5 * 60 * 1000; // 5-minute window
                if (withinWindow) {
                    await (0, emailService_1.sendBookingReminderEmail)(booking);
                    await Booking_1.default.findByIdAndUpdate(booking._id, { reminderSent: true });
                    sent++;
                    console.log('Reminder sent (auto)', { id: String(booking._id), bookingStart, target });
                }
            }
            catch (err) {
                console.error('Auto reminder failed', { id: String(booking._id) }, err);
            }
        }
        if (sent > 0) {
            console.log(`Auto reminder job: sent ${sent} email(s)`);
        }
    }
    catch (error) {
        // Chỉ log lỗi MongoDB connection một lần mỗi 5 phút để tránh spam log
        const errorMessage = error?.message || String(error);
        const isMongoError = errorMessage.includes('MongoServerSelectionError') ||
            errorMessage.includes('ENOTFOUND') ||
            errorMessage.includes('MongoNetworkError');
        if (isMongoError) {
            // Chỉ log lỗi MongoDB connection mỗi 5 phút
            const lastMongoErrorLog = global.lastMongoErrorLog || 0;
            const now = Date.now();
            if (now - lastMongoErrorLog > 5 * 60 * 1000) {
                console.error('[CRON] Reminder job MongoDB connection error (will retry when connection restored):', {
                    error: errorMessage,
                    code: error?.code,
                    name: error?.name
                });
                global.lastMongoErrorLog = now;
            }
        }
        else {
            // Log các lỗi khác ngay lập tức
            console.error('[CRON] Reminder job error:', error);
        }
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