import { Request, Response } from 'express';
import Booking from '../models/Booking';
import { sendBookingReminderEmail } from '../utils/emailService';

export const sendReminderEmails = async (req: Request, res: Response) => {
  try {
    // Get tomorrow's date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const dayAfter = new Date(tomorrow);
    dayAfter.setHours(23, 59, 59, 999);

    // Find all confirmed bookings for tomorrow
    const bookings = await Booking.find({
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
        await sendBookingReminderEmail(booking);
        successCount++;
        console.log(`Reminder email sent for booking ${booking._id}`);
      } catch (error) {
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
