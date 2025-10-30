"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cancelBooking = exports.updateBookingStatus = exports.getBookingById = exports.getBookings = exports.createBooking = exports.getPublicCustomFields = exports.getAvailableTimeSlots = void 0;
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
        let timeSlots = [];
        console.log('[TimeSlots] Incoming request', { date, dayOfWeek });
        // Priority 1: Specific date slots (highest priority)
        const specificDateSlots = await TimeSlot_1.default.find({
            specificDate: {
                $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
                $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
            },
            isActive: true
        }).sort({ startTime: 1 });
        console.log('[TimeSlots] Count specificDateSlots', { count: specificDateSlots.length });
        if (specificDateSlots.length > 0) {
            timeSlots = specificDateSlots;
        }
        else {
            // Hard stop: if there is an explicit closed-day sentinel, return empty
            const closedSentinel = await TimeSlot_1.default.countDocuments({ dayOfWeek, isActive: true, maxBookings: 0 });
            if (closedSentinel > 0) {
                console.log('[TimeSlots] Closed-day sentinel detected, returning empty', { dayOfWeek });
                return res.json({ success: true, timeSlots: [] });
            }
            // Pre-calc counts for debug
            const weekdayExplicitCountPre = await TimeSlot_1.default.countDocuments({ dayOfWeek, isActive: true, ruleType: 'weekday' });
            const legacyCountPre = await TimeSlot_1.default.countDocuments({ dayOfWeek, isActive: true, ruleType: { $exists: false }, specificDate: { $exists: false } });
            const allDaysCountPre = await TimeSlot_1.default.countDocuments({ dayOfWeek, isActive: true, ruleType: 'all' });
            console.log('[TimeSlots] Counts', { weekdayExplicitCountPre, legacyCountPre, allDaysCountPre });
            // Priority 2: Explicit weekday rules only (do NOT treat legacy as weekday)
            const weekdayExplicitCount = await TimeSlot_1.default.countDocuments({ dayOfWeek, isActive: true, ruleType: 'weekday' });
            if (weekdayExplicitCount > 0) {
                timeSlots = await TimeSlot_1.default.find({ dayOfWeek, isActive: true, ruleType: 'weekday' }).sort({ startTime: 1 });
                console.log('[TimeSlots] Using explicit weekday rules', { dayOfWeek, count: timeSlots.length });
            }
            else {
                // Fallback: legacy (no ruleType) or explicit all-days
                const legacy = await TimeSlot_1.default.find({ dayOfWeek, isActive: true, ruleType: { $exists: false } }).sort({ startTime: 1 });
                if (legacy.length > 0) {
                    timeSlots = legacy;
                    console.log('[TimeSlots] Using legacy rules (treated as ALL)', { dayOfWeek, count: timeSlots.length });
                }
                else {
                    timeSlots = await TimeSlot_1.default.find({ dayOfWeek, isActive: true, ruleType: 'all' }).sort({ startTime: 1 });
                    console.log('[TimeSlots] Using all-days rules', { dayOfWeek, count: timeSlots.length });
                }
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
        const availableSlots = slotsWithBookings.filter(slot => slot.maxBookings > 0 && slot.currentBookings < slot.maxBookings);
        console.log('[TimeSlots] Available results', { dayOfWeek, total: availableSlots.length, times: availableSlots.map(s => `${s.startTime}-${s.endTime}`) });
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
// Public: Get active custom fields for booking form
const getPublicCustomFields = async (req, res) => {
    try {
        const customFields = await CustomField_1.default.find({ isActive: true }).sort({ order: 1 });
        res.json({ success: true, customFields });
    }
    catch (error) {
        console.error('Get public custom fields error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getPublicCustomFields = getPublicCustomFields;
// Helper: enrich a booking document with full custom field definitions
const enrichBookingWithCustomFields = async (booking) => {
    const defs = await CustomField_1.default.find().sort({ order: 1 });
    const valueById = {};
    (booking.customFields || []).forEach((f) => {
        valueById[f.fieldId] = f.value;
    });
    const enriched = defs.map((d) => ({
        fieldId: String(d._id),
        name: d.name,
        label: d.label,
        type: d.type,
        required: d.required,
        isActive: d.isActive,
        value: valueById[String(d._id)] ?? ''
    }));
    return {
        ...booking.toObject(),
        customFields: enriched
    };
};
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
        // Validate required custom fields (check against ALL active required fields)
        const activeRequired = await CustomField_1.default.find({ required: true, isActive: true });
        for (const field of activeRequired) {
            const provided = (customFields || []).find((f) => f.fieldId === String(field._id));
            if (!provided || provided.value === undefined || provided.value === null || provided.value === '' || (Array.isArray(provided.value) && provided.value.length === 0)) {
                return res.status(400).json({ message: `Field ${field.label} is required` });
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
        const enriched = await enrichBookingWithCustomFields(booking);
        res.status(201).json({ success: true, booking: enriched });
    }
    catch (error) {
        console.error('Create booking error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.createBooking = createBooking;
const getBookings = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, date, search, range } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        let filter = {};
        if (status && status !== 'all')
            filter.status = status;
        if (date) {
            const dateObj = new Date(date);
            filter.bookingDate = {
                $gte: new Date(dateObj.setHours(0, 0, 0, 0)),
                $lt: new Date(dateObj.setHours(23, 59, 59, 999))
            };
        }
        // Range filter support
        if (range === 'last7') {
            const now = new Date();
            const sevenDaysAgo = new Date(now);
            sevenDaysAgo.setDate(now.getDate() - 7);
            filter.bookingDate = {
                ...(filter.bookingDate || {}),
                $gte: new Date(sevenDaysAgo.setHours(0, 0, 0, 0))
            };
            // If no explicit status provided, default to confirmed in last7 range
            if (!status || status === 'all') {
                filter.status = 'confirmed';
            }
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
            .sort({ bookingDate: -1, createdAt: -1 })
            .populate('cancelledBy', 'name email')
            .skip(skip)
            .limit(Number(limit));
        const total = await Booking_1.default.countDocuments(filter);
        const enrichedBookings = await Promise.all(bookings.map((b) => enrichBookingWithCustomFields(b)));
        res.json({
            success: true,
            bookings: enrichedBookings,
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
        const booking = await Booking_1.default.findById(id).populate('cancelledBy', 'name email');
        if (!booking) {
            return res.status(404).json({ message: 'Booking not found' });
        }
        const enriched = await enrichBookingWithCustomFields(booking);
        res.json({ success: true, booking: enriched });
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
        // Khi xác nhận: gửi email cho user và cho các admin khác
        if (status === 'confirmed' && previousStatus !== 'confirmed') {
            await (0, emailService_1.sendBookingConfirmedEmails)(booking, req.userId);
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
        // Send cancellation email (notify other admins and the user)
        await (0, emailService_1.sendBookingCancellationEmail)(booking, cancellationReason, req.userId);
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