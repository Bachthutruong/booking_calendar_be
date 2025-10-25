require('dotenv').config();
const mongoose = require('mongoose');

console.log('=== KIỂM TRA MONGODB CONNECTION ===');
console.log('MONGODB_URI:', process.env.MONGODB_URI ? '***' + process.env.MONGODB_URI.slice(-20) : 'undefined');

mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB kết nối thành công!');
    process.exit(0);
  })
  .catch((error) => {
    console.log('❌ Lỗi kết nối MongoDB:', error.message);
    process.exit(1);
  });
