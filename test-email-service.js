require('dotenv').config();
const { sendBookingConfirmationEmail } = require('./dist/utils/emailService');

console.log('=== KIỂM TRA EMAIL SERVICE ===');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '***' + process.env.RESEND_API_KEY.slice(-4) : 'undefined');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);

// Test data
const testBooking = {
  customerName: 'Test User',
  customerEmail: 'vuduybachvp@gmail.com',
  customerPhone: '0123456789',
  bookingDate: new Date(),
  timeSlot: '09:00-10:00',
  notes: 'Test booking'
};

console.log('\n=== TEST GỬI EMAIL QUA EMAIL SERVICE ===');

sendBookingConfirmationEmail(testBooking)
  .then(() => {
    console.log('✅ Email service hoạt động bình thường!');
  })
  .catch((error) => {
    console.log('❌ Lỗi email service:', error.message);
  });
