import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { sendBookingReminderEmail } from '../utils/emailService';
import SystemConfig from '../models/SystemConfig';

export const sendReminderEmails = async (req: Request, res: Response) => {
  try {
    // Load reminder hours from config (default 24)
    const generalCfg = await SystemConfig.findOne({ type: 'general', isActive: true });
    const reminderHours = Number((generalCfg?.config as any)?.reminderHoursBefore ?? 24);
    const now = new Date();
    const target = new Date(now.getTime() + reminderHours * 60 * 60 * 1000);

    // We will find confirmed bookings whose start datetime equals target date+timeSlot within a small window
    const startOfTargetDay = new Date(target);
    startOfTargetDay.setHours(0, 0, 0, 0);
    const endOfTargetDay = new Date(target);
    endOfTargetDay.setHours(23, 59, 59, 999);

    const dayBookings = await Booking.find({
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
        const [h, m] = startStr.split(':').map((x: string) => parseInt(x, 10));
        const bookingStart = new Date(booking.bookingDate);
        bookingStart.setHours(h || 0, m || 0, 0, 0);
        // If bookingStart matches target within 5 minutes
        const diffMs = Math.abs(bookingStart.getTime() - target.getTime());
        const withinWindow = diffMs <= 5 * 60 * 1000;
        if (withinWindow) {
          await sendBookingReminderEmail(booking);
          successCount++;
          console.log(`Reminder email sent for booking ${booking._id}`);
        }
      } catch (error) {
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
  } catch (error) {
    console.error('Send reminder emails error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

export const testReminderEmails = async (req: Request, res: Response) => {
  try {
    // Get all confirmed bookings for testing
    const bookings = await Booking.find({
      status: 'confirmed'
    }).limit(5); // Limit to 5 for testing

    let successCount = 0;
    let errorCount = 0;

    // Send reminder emails
    for (const booking of bookings) {
      try {
        await sendBookingReminderEmail(booking);
        successCount++;
        console.log(`Test reminder email sent for booking ${booking._id}`);
      } catch (error) {
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
  } catch (error) {
    console.error('Test reminder emails error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
