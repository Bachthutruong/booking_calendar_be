require('dotenv').config();
const { Resend } = require('resend');

// Kiểm tra cấu hình email
const isEmailConfigured = () => {
  return process.env.RESEND_API_KEY;
};

console.log('=== KIỂM TRA CẤU HÌNH RESEND ===');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? '***' + process.env.RESEND_API_KEY.slice(-4) : 'undefined');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_TO:', process.env.EMAIL_TO);
console.log('isEmailConfigured:', isEmailConfigured());

if (!isEmailConfigured()) {
  console.log('❌ Resend API Key chưa được cấu hình');
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);

console.log('\n=== TEST GỬI EMAIL VỚI RESEND ===');

resend.emails.send({
  from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  to: process.env.EMAIL_TO || 'vuduybachvp@gmail.com',
  subject: 'Test Email - Booking Calendar với Resend',
  html: `
    <h2>🎉 Test Email thành công!</h2>
    <p>Chúc mừng! Email đã được gửi thành công qua <strong>Resend</strong>.</p>
    <ul>
      <li><strong>From:</strong> ${process.env.EMAIL_FROM || 'onboarding@resend.dev'}</li>
      <li><strong>To:</strong> ${process.env.EMAIL_TO || 'vuduybachvp@gmail.com'}</li>
      <li><strong>Service:</strong> Resend</li>
    </ul>
    <p>Hệ thống đặt lịch của bạn đã sẵn sàng gửi email!</p>
  `
}).then((data) => {
  console.log('✅ Email đã được gửi thành công!');
  console.log('Message ID:', data.id);
  console.log('Status:', data.status);
}).catch((error) => {
  console.log('❌ Lỗi gửi email:', error.message);
  console.log('Error details:', error);
});
