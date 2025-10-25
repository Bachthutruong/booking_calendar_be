"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.testReminderEmails = exports.sendReminderEmails = void 0;
const Booking_1 = __importDefault(require("../models/Booking"));
const emailService_1 = require("../utils/emailService");
const sendReminderEmails = async (req, res) => {
    try {
        // Get tomorrow's date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        const dayAfter = new Date(tomorrow);
        dayAfter.setHours(23, 59, 59, 999);
        // Find all confirmed bookings for tomorrow
        const bookings = await Booking_1.default.find({
            bookingDate: {
                $gte: tomorrow,
                $lt: dayAfter
            },
            status: 'confirmed'
        });
        let successCount = 0;
        let errorCount = 0;
        // Send reminder emails
        for (const booking of bookings) {
            try {
                await (0, emailService_1.sendBookingReminderEmail)(booking);
                successCount++;
                console.log(`Reminder email sent for booking ${booking._id}`);
            }
            catch (error) {
                errorCount++;
                console.error(`Failed to send reminder email for booking ${booking._id}:`, error);
            }
        }
        res.json({
            success: true,
            message: `Reminder emails processed: ${successCount} sent, ${errorCount} failed`,
            totalBookings: bookings.length,
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