require('dotenv').config();
const { sendBookingConfirmationEmail } = require('./dist/utils/emailService');

console.log('=== DEBUG EMAIL SERVICE ===');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '***' + process.env.RESEND_API_KEY.slice(-4) : 'undefined');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_TO:', process.env.EMAIL_TO);

// Test data
const testBooking = {
  customerName: 'Test User',
  customerEmail: 'vuduybachvp@gmail.com',
  customerPhone: '0123456789',
  bookingDate: new Date(),
  timeSlot: '09:00',
  notes: 'Test booking'
};

console.log('\n=== TEST GỬI EMAIL ===');

sendBookingConfirmationEmail(testBooking)
  .then(() => {
    console.log('✅ Email service hoạt động!');
  })
  .catch((error) => {
    console.log('❌ Lỗi:', error.message);
  });
