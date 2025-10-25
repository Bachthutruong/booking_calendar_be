import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import Booking from '../models/Booking';
import TimeSlot from '../models/TimeSlot';
import CustomField from '../models/CustomField';
import { sendBookingConfirmationEmail, sendBookingReminderEmail, sendBookingCancellationEmail } from '../utils/emailService';
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
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    let timeSlots = [];

    // Priority 1: Specific date slots (highest priority)
    const specificDateSlots = await TimeSlot.find({
      specificDate: {
        $gte: new Date(bookingDate.setHours(0, 0, 0, 0)),
        $lt: new Date(bookingDate.setHours(23, 59, 59, 999))
      },
      isActive: true
    }).sort({ startTime: 1 });

    if (specificDateSlots.length > 0) {
      timeSlots = specificDateSlots;
    } else {
      // Priority 2: Weekend slots (if it's weekend)
      if (isWeekend) {
        const weekendSlots = await TimeSlot.find({
          dayOfWeek,
          isWeekend: true,
          isActive: true
        }).sort({ startTime: 1 });

        if (weekendSlots.length > 0) {
          timeSlots = weekendSlots;
        } else {
          // Priority 3: All days slots (fallback)
          timeSlots = await TimeSlot.find({
            dayOfWeek,
            isWeekend: false,
            isActive: true
          }).sort({ startTime: 1 });
        }
      } else {
        // Priority 3: All days slots (for weekdays)
        timeSlots = await TimeSlot.find({
          dayOfWeek,
          isWeekend: false,
          isActive: true
        }).sort({ startTime: 1 });
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
      slot.currentBookings < slot.maxBookings
    );

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

    // Validate custom fields
    const customFieldIds = customFields?.map((field: any) => field.fieldId) || [];
    const requiredFields = await CustomField.find({
      _id: { $in: customFieldIds },
      required: true,
      isActive: true
    });

    for (const field of requiredFields) {
      const fieldValue = customFields?.find((f: any) => f.fieldId === (field._id as any).toString());
      if (!fieldValue || !fieldValue.value) {
        return res.status(400).json({ 
          message: `Field ${field.label} is required` 
        });
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
  } catch (error) {
    console.error('Create booking error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookings = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 10, status, date, search } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    let filter: any = {};
    if (status) filter.status = status;
    if (date) {
      const dateObj = new Date(date as string);
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

    const bookings = await Booking.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));

    const total = await Booking.countDocuments(filter);

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
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getBookingById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const booking = await Booking.findById(id);

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    res.json({
      success: true,
      booking
    });
  } catch (error) {
    console.error('Get booking by ID error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateBookingStatus = async (req: Request, res: Response) => {
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

    // Send confirmation email when status changes to 'confirmed'
    if (status === 'confirmed' && previousStatus !== 'confirmed') {
      await sendBookingConfirmationEmail(booking);
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
    
    // Send cancellation email
    await sendBookingCancellationEmail(booking, cancellationReason);
    
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