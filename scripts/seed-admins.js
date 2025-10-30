require('dotenv').config();
const mongoose = require('mongoose');
const User = require('../dist/models/User').default;

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/booking_calendar';
  await mongoose.connect(uri, { dbName: undefined });
  const emails = [
    process.env.TEST_ADMIN_EMAIL_1 || 'admin1@example.com',
    process.env.TEST_ADMIN_EMAIL_2 || 'admin2@example.com',
  ];
  for (const email of emails) {
    const exists = await User.findOne({ email });
    if (!exists) {
      await User.create({ email, password: 'P@ssw0rd!1', name: email.split('@')[0], role: 'admin', isActive: true });
      console.log('🆕 Created admin:', email);
    } else {
      console.log('ℹ️ Exists admin:', email);
    }
  }
  await mongoose.disconnect();
  console.log('✅ Done');
}

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});


