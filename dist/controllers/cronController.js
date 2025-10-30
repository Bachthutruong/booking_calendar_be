"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testReminderEmails = exports.sendReminderEmails = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const emailService_1 = require("../utils/emailService");
const SystemConfig_1 = __importDefault(require("../models/SystemConfig"));
const sendReminderEmails = async (req, res) => {
    try {
        // Load reminder hours from config (default 24)
        const generalCfg = await SystemConfig_1.default.findOne({ type: 'general', isActive: true });
        const reminderHours = Number(generalCfg?.config?.reminderHoursBefore ?? 24);
        const now = new Date();
        const target = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);
        // We will find confirmed bookings whose start datetime equals target date+timeSlot within a small window
        const startOfTargetDay = new Date(target);
        startOfTargetDay.setHours(0, 0, 0, 0);
        const endOfTargetDay = new Date(target);
        endOfTargetDay.setHours(23, 59, 59, 999);
        const dayBookings = await Booking_1.default.find({
            bookingDate: { $gte: startOfTargetDay, $lt: endOfTargetDay },
            status: 'confirmed'
        });
        let successCount = 0;
        let errorCount = 0;
        // Send reminder emails for bookings matching the target hour/minute
        for (const booking of dayBookings) {
            try {
                // Build the start datetime from bookingDate and timeSlot (format HH:mm-HH:mm)
                const startStr = String(booking.timeSlot).split('-')[0];
                const [h, m] = startStr.split(':').map((x) => parseInt(x, 10));
                const bookingStart = new Date(booking.bookingDate);
                bookingStart.setHours(h || 0, m || 0, 0, 0);
                // If bookingStart matches target within 5 minutes
                const diffMs = Math.abs(bookingStart.getTime() - target.getTime());
                const withinWindow = diffMs <= 5 * 60 * 1000;
                if (withinWindow) {
                    await (0, emailService_1.sendBookingReminderEmail)(booking);
                    successCount++;
                    console.log(`Reminder email sent for booking ${booking._id}`);
                }
            }
            catch (error) {
                errorCount++;
                console.error(`Failed to send reminder email for booking ${booking._id}:`, error);
            }
        }
        res.json({
            success: true,
            message: `Reminder emails processed: ${successCount} sent, ${errorCount} failed`,
            totalBookings: dayBookings.length,
            successCount,
            errorCount
        });
    }
    catch (error) {
        console.error('Send reminder emails error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.sendReminderEmails = sendReminderEmails;
const testReminderEmails = async (req, res) => {
    try {
        // Get all confirmed bookings for testing
        const bookings = await Booking_1.default.find({
            status: 'confirmed'
        }).limit(5); // Limit to 5 for testing
        let successCount = 0;
        let errorCount = 0;
        // Send reminder emails
        for (const booking of bookings) {
            try {
                await (0, emailService_1.sendBookingReminderEmail)(booking);
                successCount++;
                console.log(`Test reminder email sent for booking ${booking._id}`);
            }
            catch (error) {
                errorCount++;
                console.error(`Failed to send test reminder email for booking ${booking._id}:`, error);
            }
        }
        res.json({
            success: true,
            message: `Test reminder emails processed: ${successCount} sent, ${errorCount} failed`,
            totalBookings: bookings.length,
            successCount,
            errorCount
        });
    }
    catch (error) {
        console.error('Test reminder emails error:', error);
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.testReminderEmails = testReminderEmails;
//# sourceMappingURL=cronController.js.map