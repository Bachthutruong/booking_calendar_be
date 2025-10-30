import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Booking from '../models/Booking';
import TimeSlot from '../models/TimeSlot';
import CustomField from '../models/CustomField';
import { sendBookingConfirmationEmail, sendBookingReminderEmail, sendBookingCancellationEmail, sendBookingConfirmedEmails } from '../utils/emailService';
import { IUser } from '../models/User';

// Extend Express Request interface
interface AuthRequest extends Request {
  userId?: string;
  user?: IUser;
}

export const getAvailableTimeSlots = async (req: Request, res: Response) => {
  try {
    const { date } = req.params;
    const bookingDate = new Date(date);
    const dayOfWeek = bookingDate.getDay();

    let timeSlots = [];

    console.log('[TimeSlots] Incoming request', { date, dayOfWeek })

    // Priority 1: Specific date slots (highest priority)
    const specificDateSlots = await TimeSlot.find({
      specificDate: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      isActive: true
    }).sort({ startTime: 1 });

    console.log('[TimeSlots] Count specificDateSlots', { count: specificDateSlots.length })

    if (specificDateSlots.length > 0) {
      timeSlots = specificDateSlots;
    } else {
      // Hard stop: if there is an explicit closed-day sentinel, return empty
      const closedSentinel = await TimeSlot.countDocuments({ dayOfWeek, isActive: true, maxBookings: 0 })
      if (closedSentinel > 0) {
        console.log('[TimeSlots] Closed-day sentinel detected, returning empty', { dayOfWeek })
        return res.json({ success: true, timeSlots: [] })
      }

      // Pre-calc counts for debug
      const weekdayExplicitCountPre = await TimeSlot.countDocuments({ dayOfWeek, isActive: true, ruleType: 'weekday' })
      const legacyCountPre = await TimeSlot.countDocuments({ dayOfWeek, isActive: true, ruleType: { $exists: false }, specificDate: { $exists: false } })
      const allDaysCountPre = await TimeSlot.countDocuments({ dayOfWeek, isActive: true, ruleType: 'all' })
      console.log('[TimeSlots] Counts', { weekdayExplicitCountPre, legacyCountPre, allDaysCountPre })

      // Priority 2: Explicit weekday rules only (do NOT treat legacy as weekday)
      const weekdayExplicitCount = await TimeSlot.countDocuments({ dayOfWeek, isActive: true, ruleType: 'weekday' })
      if (weekdayExplicitCount > 0) {
        timeSlots = await TimeSlot.find({ dayOfWeek, isActive: true, ruleType: 'weekday' }).sort({ startTime: 1 })
        console.log('[TimeSlots] Using explicit weekday rules', { dayOfWeek, count: timeSlots.length })
      } else {
        // Fallback: legacy (no ruleType) or explicit all-days
        const legacy = await TimeSlot.find({ dayOfWeek, isActive: true, ruleType: { $exists: false } }).sort({ startTime: 1 })
        if (legacy.length > 0) {
          timeSlots = legacy
          console.log('[TimeSlots] Using legacy rules (treated as ALL)', { dayOfWeek, count: timeSlots.length })
        } else {
          timeSlots = await TimeSlot.find({ dayOfWeek, isActive: true, ruleType: 'all' }).sort({ startTime: 1 })
          console.log('[TimeSlots] Using all-days rules', { dayOfWeek, count: timeSlots.length })
        }
      }
    }

    // Get existing bookings for the date
    const existingBookings = await Booking.find({
      bookingDate: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      status: { $in: ['pending', 'confirmed'] }
    });

    // Calculate current bookings for each slot
    const slotsWithBookings = timeSlots.map(slot => {
      const slotBookings = existingBookings.filter(booking => 
        booking.timeSlot === slot.startTime
      );
      return {
        ...slot.toObject(),
        currentBookings: slotBookings.length
      };
    });

    // Filter available slots
    const availableSlots = slotsWithBookings.filter(slot => 
      slot.maxBookings > 0 && slot.currentBookings < slot.maxBookings
    );
    console.log('[TimeSlots] Available results', { dayOfWeek, total: availableSlots.length, times: availableSlots.map(s => `${s.startTime}-${s.endTime}`) })

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
  } catch (error) {
    console.error('Get available time slots error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Public: Get active custom fields for booking form
export const getPublicCustomFields = async (req: Request, res: Response) => {
  try {
    const customFields = await CustomField.find({ isActive: true }).sort({ order: 1 });
    res.json({ success: true, customFields });
  } catch (error) {
    console.error('Get public custom fields error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Helper: enrich a booking document with full custom field definitions
const enrichBookingWithCustomFields = async (booking: any) => {
  const defs = await CustomField.find().sort({ order: 1 });
  const valueById: Record<string, any> = {};
  (booking.customFields || []).forEach((f: any) => {
    valueById[f.fieldId] = f.value;
  });
  const enriched = defs.map((d: any) => ({
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

export const createBooking = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { customerName, customerEmail, customerPhone, bookingDate, timeSlot, customFields, notes } = req.body;

    // Extract start time from timeSlot (format: "09:00-10:00" -> "09:00")
    const startTime = timeSlot.split('-')[0];
    
    // Check if slot is still available
    const slot = await TimeSlot.findOne({ startTime, isActive: true });
    if (!slot) {
      return res.status(400).json({ message: 'Time slot not available' });
    }

    const bookingDateObj = new Date(bookingDate);
    const existingBookings = await Booking.countDocuments({
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
    const activeRequired = await CustomField.find({ required: true, isActive: true });
    for (const field of activeRequired) {
      const provided = (customFields || []).find((f: any) => f.fieldId === String(field._id));
      if (!provided || provided.value === undefined || provided.value === null || provided.value === '' || (Array.isArray(provided.value) && provided.value.length === 0)) {
        return res.status(400).json({ message: `Field ${field.label} is required` });
      }
    }

    // Create booking
    const booking = new Booking({
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
    await sendBookingConfirmationEmail(booking);

    const enriched = await enrichBookingWithCustomFields(booking);
    res.status(201).json({ success: true, booking: enriched });
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, date, search, range } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter: any = {};
    if (status && status !== 'all') filter.status = status;
    if (date) {
      const dateObj = new Date(date as string);
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

    const bookings = await Booking.find(filter)
      .sort({ bookingDate: -1, createdAt: -1 })
      .populate('cancelledBy', 'name email')
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

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
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id).populate('cancelledBy', 'name email');

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const enriched = await enrichBookingWithCustomFields(booking);
    res.json({ success: true, booking: enriched });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBookingStatus = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    const previousStatus = booking.status;
    booking.status = status;
    await booking.save();

    // Khi xác nhận: gửi email cho user và cho các admin khác
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      await sendBookingConfirmedEmails(booking, req.userId);
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const cancelBooking = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { cancellationReason } = req.body;
    const cancelledBy = req.userId;
    
    const booking = await Booking.findById(id);
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }
    
    if (booking.status === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }
    
    // Update booking status
    booking.status = 'cancelled';
    booking.cancelledBy = cancelledBy as any;
    booking.cancelledAt = new Date();
    booking.cancellationReason = cancellationReason;
    await booking.save();
    
    // Send cancellation email (notify other admins and the user)
    await sendBookingCancellationEmail(booking, cancellationReason, req.userId);
    
    res.json({
      success: true,
      message: 'Booking cancelled successfully',
      booking
    });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};