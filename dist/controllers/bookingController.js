"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBooking = exports.updateBookingStatus = exports.getBookingById = exports.getBookings = exports.createBooking = exports.getAvailableTimeSlots = void 0;
const express_validator_1 = require("express-validator");
const Booking_1 = __importDefault(require("../models/Booking"));
const TimeSlot_1 = __importDefault(require("../models/TimeSlot"));
const CustomField_1 = __importDefault(require("../models/CustomField"));
const emailService_1 = require("../utils/emailService");
const getAvailableTimeSlots = async (req, res) => {
    try {
        const { date } = req.params;
        const bookingDate = new Date(date);
        const dayOfWeek = bookingDate.getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        let timeSlots = [];
        // Priority 1: Specific date slots (highest priority)
        const specificDateSlots = await TimeSlot_1.default.find({
            specificDate: {
                $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
                $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
            },
            isActive: true
        }).sort({ startTime: 1 });
        if (specificDateSlots.length > 0) {
            timeSlots = specificDateSlots;
        }
        else {
            // Priority 2: Weekend slots (if it's weekend)
            if (isWeekend) {
                const weekendSlots = await TimeSlot_1.default.find({
                    dayOfWeek,
                    isWeekend: true,
                    isActive: true
                }).sort({ startTime: 1 });
                if (weekendSlots.length > 0) {
                    timeSlots = weekendSlots;
                }
                else {
                    // Priority 3: All days slots (fallback)
                    timeSlots = await TimeSlot_1.default.find({
                        dayOfWeek,
                        isWeekend: false,
                        isActive: true
                    }).sort({ startTime: 1 });
                }
            }
            else {
                // Priority 3: All days slots (for weekdays)
                timeSlots = await TimeSlot_1.default.find({
                    dayOfWeek,
                    isWeekend: false,
                    isActive: true
                }).sort({ startTime: 1 });
            }
        }
        // Get existing bookings for the date
        const existingBookings = await Booking_1.default.find({
            bookingDate: {
                $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
                $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
            },
            status: { $in: ['pending', 'confirmed'] }
        });
        // Calculate current bookings for each slot
        const slotsWithBookings = timeSlots.map(slot => {
            const slotBookings = existingBookings.filter(booking => booking.timeSlot === slot.startTime);
            return {
                ...slot.toObject(),
                currentBookings: slotBookings.length
            };
        });
        // Filter available slots
        const availableSlots = slotsWithBookings.filter(slot => slot.currentBookings < slot.maxBookings);
        res.json({
            success: true,
            timeSlots: availableSlots.map(slot => ({
                id: slot._id,
                startTime: slot.startTime,
                endTime: slot.endTime,
                maxBookings: slot.maxBookings,
                currentBookings: slot.currentBookings
            }))
        });
    }
    catch (error) {
        console.error('Get available time slots error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAvailableTimeSlots = getAvailableTimeSlots;
const createBooking = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { customerName, customerEmail, customerPhone, bookingDate, timeSlot, customFields, notes } = req.body;
        // Extract start time from timeSlot (format: "09:00-10:00" -> "09:00")
        const startTime = timeSlot.split('-')[0];
        // Check if slot is still available
        const slot = await TimeSlot_1.default.findOne({ startTime, isActive: true });
        if (!slot) {
            return res.status(400).json({ message: 'Time slot not available' });
        }
        const bookingDateObj = new Date(bookingDate);
        const existingBookings = await Booking_1.default.countDocuments({
            bookingDate: {
                $gte: new Date(bookingDateObj.setHours(0, 0, 0, 0)),
                $lt: new Date(bookingDateObj.setHours(23, 59, 59, 999))
            },
            timeSlot: startTime,
            status: { $in: ['pending', 'confirmed'] }
        });
        if (existingBookings >= slot.maxBookings) {
            return res.status(400).json({ message: 'Time slot is fully booked' });
        }
        // Validate custom fields
        const customFieldIds = customFields?.map((field) => field.fieldId) || [];
        const requiredFields = await CustomField_1.default.find({
            _id: { $in: customFieldIds },
            required: true,
            isActive: true
        });
        for (const field of requiredFields) {
            const fieldValue = customFields?.find((f) => f.fieldId === field._id.toString());
            if (!fieldValue || !fieldValue.value) {
                return res.status(400).json({
                    message: `Field ${field.label} is required`
                });
            }
        }
        // Create booking
        const booking = new Booking_1.default({
            customerName,
            customerEmail,
            customerPhone,
            bookingDate: bookingDateObj,
            timeSlot: startTime,
            customFields: customFields || [],
            notes
        });
        await booking.save();
        // Send confirmation emails
        await (0, emailService_1.sendBookingConfirmationEmail)(booking);
        res.status(201).json({
            success: true,
            booking: {
                id: booking._id,
                customerName: booking.customerName,
                customerEmail: booking.customerEmail,
                bookingDate: booking.bookingDate,
                timeSlot: booking.timeSlot,
                status: booking.status
            }
        });
    }
    catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBooking = createBooking;
const getBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, date, search } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        let filter = {};
        if (status)
            filter.status = status;
        if (date) {
            const dateObj = new Date(date);
            filter.bookingDate = {
                $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                $lt: new Date(dateObj.setHours(23, 59, 59, 999))
            };
        }
        // Add search functionality
        if (search) {
            filter.$or = [
                { customerName: { $regex: search, $options: 'i' } },
                { customerEmail: { $regex: search, $options: 'i' } },
                { customerPhone: { $regex: search, $options: 'i' } }
            ];
        }
        const bookings = await Booking_1.default.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit));
        const total = await Booking_1.default.countDocuments(filter);
        res.json({
            success: true,
            bookings,
            pagination: {
                current: Number(page),
                pages: Math.ceil(total / Number(limit)),
                total,
                limit: Number(limit)
            }
        });
    }
    catch (error) {
        console.error('Get bookings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBookings = getBookings;
const getBookingById = async (req, res) => {
    try {
        const { id } = req.params;
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        res.json({
            success: true,
            booking
        });
    }
    catch (error) {
        console.error('Get booking by ID error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getBookingById = getBookingById;
const updateBookingStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const previousStatus = booking.status;
        booking.status = status;
        await booking.save();
        // Send confirmation email when status changes to 'confirmed'
        if (status === 'confirmed' && previousStatus !== 'confirmed') {
            await (0, emailService_1.sendBookingConfirmationEmail)(booking);
        }
        res.json({
            success: true,
            booking
        });
    }
    catch (error) {
        console.error('Update booking status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateBookingStatus = updateBookingStatus;
const cancelBooking = async (req, res) => {
    try {
        const { id } = req.params;
        const { cancellationReason } = req.body;
        const cancelledBy = req.userId;
        const booking = await Booking_1.default.findById(id);
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ message: 'Booking is already cancelled' });
        }
        // Update booking status
        booking.status = 'cancelled';
        booking.cancelledBy = cancelledBy;
        booking.cancelledAt = new Date();
        booking.cancellationReason = cancellationReason;
        await booking.save();
        // Send cancellation email
        await (0, emailService_1.sendBookingCancellationEmail)(booking, cancellationReason);
        res.json({
            success: true,
            message: 'Booking cancelled successfully',
            booking
        });
    }
    catch (error) {
        console.error('Cancel booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.cancelBooking = cancelBooking;
//# sourceMappingURL=bookingController.js.map