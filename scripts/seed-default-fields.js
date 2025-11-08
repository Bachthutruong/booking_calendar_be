require('dotenv').config();
const mongoose = require('mongoose');
const CustomField = require('../dist/models/CustomField').default;

async function run() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/booking_calendar';
  await mongoose.connect(uri, { dbName: undefined });
  
  const defaultFields = [
    {
      name: 'customer_name',
      label: 'Họ và tên',
      type: 'text',
      required: true,
      placeholder: 'Nhập họ và tên của bạn',
      order: 1,
      isActive: true,
      isDefault: true
    },
    {
      name: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      placeholder: 'example@email.com',
      order: 2,
      isActive: true,
      isDefault: true
    },
    {
      name: 'customer_phone',
      label: 'Số điện thoại',
      type: 'phone',
      required: true,
      placeholder: 'Nhập số điện thoại',
      order: 3,
      isActive: true,
      isDefault: true
    }
  ];

  for (const field of defaultFields) {
    const exists = await CustomField.findOne({ name: field.name });
    if (!exists) {
      await CustomField.create(field);
      console.log('🆕 Created default field:', field.name, '-', field.label);
    } else {
      // Luôn update để đảm bảo field mặc định có đầy đủ thuộc tính
      exists.isDefault = true;
      exists.required = field.required;
      exists.isActive = true;
      exists.label = field.label;
      exists.type = field.type;
      exists.placeholder = field.placeholder;
      exists.order = field.order;
      await exists.save();
      console.log('🔄 Updated field to default:', field.name, '-', field.label, '- isDefault:', exists.isDefault);
    }
  }
  
  // Đảm bảo tất cả field mặc định đều có isDefault = true
  const allDefaultFields = await CustomField.find({ name: { $in: ['customer_name', 'email', 'customer_phone'] } });
  for (const field of allDefaultFields) {
    if (!field.isDefault) {
      field.isDefault = true;
      await field.save();
      console.log('✅ Set isDefault = true for:', field.name);
    }
  }
  
  await mongoose.disconnect();
  console.log('✅ Done seeding default fields');
}

run().catch(async (e) => {
  console.error(e);
  try { await mongoose.disconnect(); } catch {}
  process.exit(1);
});

