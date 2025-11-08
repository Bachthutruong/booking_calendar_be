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
        bookingDate.setHours(0, 0, 0, 0);
        const dayOfWeek = bookingDate.getDay();
        const dateEnd = new Date(bookingDate);
        dateEnd.setHours(23, 59, 59, 999);
        console.log('[TimeSlots] Incoming request', { date, dayOfWeek });
        // Priority 1: Specific date rule (highest priority)
        let matchedRule = await TimeSlot_1.default.findOne({
            ruleType: 'specific',
            specificDate: {
                $gte: bookingDate,
                $lt: dateEnd
            },
            isActive: true
        });
        if (!matchedRule) {
            // Priority 2: Weekday rule
            matchedRule = await TimeSlot_1.default.findOne({
                ruleType: 'weekday',
                dayOfWeek,
                isActive: true
            });
        }
        if (!matchedRule) {
            // Priority 3: All-days rule
            matchedRule = await TimeSlot_1.default.findOne({
                ruleType: 'all',
                isActive: true
            });
        }
        // If no rule found or rule has empty timeRanges (closed day), return empty
        if (!matchedRule || !matchedRule.timeRanges || matchedRule.timeRanges.length === 0) {
            console.log('[TimeSlots] No rule or closed day', { dayOfWeek });
            return res.json({ success: true, timeSlots: [] });
        }
        // Get existing bookings for the date
        const existingBookings = await Booking_1.default.find({
            bookingDate: {
                $gte: bookingDate,
                $lt: dateEnd
            },
            status: { $in: ['pending', 'confirmed'] }
        });
        // Build available slots from timeRanges
        const availableSlots = matchedRule.timeRanges.map((range) => {
            const slotBookings = existingBookings.filter(booking => booking.timeSlot === range.startTime);
            return {
                id: `${matchedRule._id}-${range.startTime}-${range.endTime}`,
                startTime: range.startTime,
                endTime: range.endTime,
                maxBookings: range.maxBookings,
                currentBookings: slotBookings.length
            };
        }).filter((slot) => slot.maxBookings > 0 && slot.currentBookings < slot.maxBookings);
        console.log('[TimeSlots] Available results', { dayOfWeek, total: availableSlots.length, times: availableSlots.map((s) => `${s.startTime}-${s.endTime}`) });
        res.json({
            success: true,
            timeSlots: availableSlots
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
        // Accept both "HH:mm" and "HH:mm-HH:mm" formats
        const timeSlotStr = String(timeSlot || '').trim();
        const hasEnd = timeSlotStr.includes('-');
        const rangeStart = hasEnd ? timeSlotStr.split('-')[0].trim() : timeSlotStr;
        const rangeEnd = hasEnd ? timeSlotStr.split('-')[1].trim() : undefined;
        const startTime = rangeStart; // we store only startTime in Booking
        const bookingDateObj = new Date(bookingDate);
        bookingDateObj.setHours(0, 0, 0, 0);
        const dayOfWeek = bookingDateObj.getDay();
        const dateEnd = new Date(bookingDateObj);
        dateEnd.setHours(23, 59, 59, 999);
        // Find matching rule (priority: specific > weekday > all)
        let matchedRule = await TimeSlot_1.default.findOne({
            ruleType: 'specific',
            specificDate: {
                $gte: bookingDateObj,
                $lt: dateEnd
            },
            isActive: true
        });
        if (!matchedRule) {
            matchedRule = await TimeSlot_1.default.findOne({
                ruleType: 'weekday',
                dayOfWeek,
                isActive: true
            });
        }
        if (!matchedRule) {
            matchedRule = await TimeSlot_1.default.findOne({
                ruleType: 'all',
                isActive: true
            });
        }
        if (!matchedRule || !matchedRule.timeRanges || matchedRule.timeRanges.length === 0) {
            return res.status(400).json({ message: 'Time slot not available' });
        }
        // Find matching timeRange
        const matchedRange = matchedRule.timeRanges.find((r) => {
            if (rangeEnd)
                return r.startTime === rangeStart && r.endTime === rangeEnd;
            return r.startTime === rangeStart;
        });
        if (!matchedRange) {
            return res.status(400).json({ message: 'Time slot not available' });
        }
        // Check availability
        const existingBookings = await Booking_1.default.countDocuments({
            bookingDate: {
                $gte: bookingDateObj,
                $lt: dateEnd
            },
            timeSlot: startTime,
            status: { $in: ['pending', 'confirmed'] }
        });
        if (existingBookings >= matchedRange.maxBookings) {
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
        // Extract email, name, phone from customFields nếu không có trong trường trực tiếp
        let finalEmail = customerEmail;
        let finalName = customerName;
        let finalPhone = customerPhone;
        if (customFields && customFields.length > 0) {
            const allFields = await CustomField_1.default.find({ isActive: true }).sort({ order: 1 });
            const valueById = {};
            customFields.forEach((f) => {
                valueById[f.fieldId] = f.value;
            });
            for (const field of allFields) {
                const value = valueById[String(field._id)];
                if (value) {
                    // Tìm email field
                    if (!finalEmail && (field.name === 'email' || field.type === 'email')) {
                        finalEmail = String(value).trim().toLowerCase();
                    }
                    // Tìm name field
                    if (!finalName && (field.name === 'customer_name' || field.name === 'name' || field.name === 'full_name')) {
                        finalName = String(value).trim();
                    }
                    // Tìm phone field
                    if (!finalPhone && (field.name === 'customer_phone' || field.name === 'phone' || field.type === 'phone')) {
                        finalPhone = String(value).trim();
                    }
                }
            }
        }
        // Create booking
        const booking = new Booking_1.default({
            customerName: finalName,
            customerEmail: finalEmail,
            customerPhone: finalPhone,
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
        const { page = 1, limit = 10, status, date, search, range, startDate, endDate } = req.query;
        const skip = (Number(page) - 1) * Number(limit);
        let filter = {};
        if (status && status !== 'all')
            filter.status = status;
        // Support date range filter (for month filtering) - ưu tiên hơn date filter
        if (startDate && endDate) {
            const start = new Date(startDate);
            start.setHours(0, 0, 0, 0);
            const end = new Date(endDate);
            end.setHours(23, 59, 59, 999);
            filter.bookingDate = {
                $gte: start,
                $lte: end
            };
        }
        else if (date) {
            // Single date filter (chỉ dùng nếu không có startDate/endDate)
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
            // Chỉ force confirmed nếu không có status được chỉ định
            // Nếu status === 'all', cho phép xem tất cả trạng thái
            if (!status) {
                filter.status = 'confirmed';
            }
            // Nếu status === 'all', không thêm filter.status để xem tất cả
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