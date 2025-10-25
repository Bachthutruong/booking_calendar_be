require('dotenv').config();

console.log('=== KIỂM TRA ENVIRONMENT ===');
console.log('RESEND_API_KEY:', process.env.RESEND_API_KEY ? 'Có' : 'Không');
console.log('EMAIL_FROM:', process.env.EMAIL_FROM);
console.log('EMAIL_TO:', process.env.EMAIL_TO);

// Test Resend trực tiếp
const { Resend } = require('resend');
const resend = new Resend(process.env.RESEND_API_KEY);

console.log('\n=== TEST RESEND TRỰC TIẾP ===');

resend.emails.send({
  from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
  to: process.env.EMAIL_TO || 'vuduybachvp@gmail.com',
  subject: 'Test Email - Final Check',
  html: '<h2>Test thành công!</h2><p>Email service hoạt động bình thường.</p>'
}).then((data) => {
  console.log('✅ Resend hoạt động:', data);
}).catch((error) => {
  console.log('❌ Resend lỗi:', error.message);
});
