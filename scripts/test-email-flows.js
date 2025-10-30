require('dotenv').config();
const mongoose = require('mongoose');
const Booking = require('../dist/models/Booking').default;
const User = require('../dist/models/User').default;
const SystemConfig = require('../dist/models/SystemConfig').default;
const {
  sendBookingConfirmationEmail,
  sendBookingConfirmedEmails,
  sendBookingCancellationEmail,
  sendBookingReminderEmail,
} = require('../dist/utils/emailService');

async function connect() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/booking_calendar';
  await mongoose.connect(uri, { dbName: undefined });
  console.log('✅ Connected MongoDB');
}

async function ensureAdmins() {
  const emails = [
    process.env.TEST_ADMIN_EMAIL_1 || 'admin1@example.com',
    process.env.TEST_ADMIN_EMAIL_2 || 'admin2@example.com',
  ];
  const admins = [];
  for (const email of emails) {
    let u = await User.findOne({ email });
    if (!u) {
      u = await User.create({
        email,
        password: 'P@ssw0rd!1',
        name: email.split('@')[0],
        role: 'admin',
        isActive: true,
      });
      console.log('🆕 Created admin:', email);
    }
    admins.push(u);
  }
  return admins;
}

async function upsertGeneralConfig(overrides = {}) {
  let cfg = await SystemConfig.findOne({ type: 'general' });
  if (!cfg) cfg = new SystemConfig({ type: 'general', config: {} });
  cfg.config = {
    siteName: 'Booking Calendar',
    siteDescription: 'Test',
    timezone: 'Asia/Ho_Chi_Minh',
    reminderTime: '09:00',
    reminderHoursBefore: 24,
    ...(cfg.config || {}),
    ...overrides,
  };
  await cfg.save();
  console.log('✅ General config saved');
}

function mkBookingData(date = new Date(), timeSlot = '09:00') {
  return {
    customerName: 'Test User',
    customerEmail: process.env.TEST_CUSTOMER_EMAIL || 'customer@example.com',
    customerPhone: '0123456789',
    bookingDate: date,
    timeSlot,
    status: 'pending',
    customFields: [],
    notes: 'Flow test',
  };
}

async function run() {
  await connect();
  const admins = await ensureAdmins();

  // 1) Create pending booking and send initial confirmation (customer + admins notified)
  const b1 = await Booking.create(mkBookingData());
  await sendBookingConfirmationEmail(b1);
  console.log('✅ Sent initial confirmation (create booking)');

  // 2) Confirm booking (notify user + other admins)
  b1.status = 'confirmed';
  await b1.save();
  await sendBookingConfirmedEmails(b1, String(admins[0]._id));
  console.log('✅ Sent confirmed emails (user + other admins)');

  // 3) Send reminder email (simulate separate trigger)
  await sendBookingReminderEmail(b1);
  console.log('✅ Sent reminder email');

  // 4) Cancel booking by admin[0] (notify user + other admins)
  b1.status = 'cancelled';
  b1.cancellationReason = 'Test reason';
  await b1.save();
  await sendBookingCancellationEmail(b1, 'Test reason', String(admins[0]._id));
  console.log('✅ Sent cancellation emails');

  // 5) Reminder window test: set reminderHoursBefore = 0 and booking at current minute
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  await upsertGeneralConfig({ reminderHoursBefore: 0 });
  const b2 = await Booking.create(mkBookingData(new Date(now.setSeconds(0, 0)), `${hh}:${mm}`));
  b2.status = 'confirmed';
  await b2.save();
  console.log('✅ Prepared booking for immediate reminder window test');

  console.log('\n🎉 Flow tests executed. Check your inboxes for emails.');
  await mongoose.disconnect();
}

run().catch(async (e) => {
  console.error('❌ Test flow error:', e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});


