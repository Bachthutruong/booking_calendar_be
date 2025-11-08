import mongoose, { Document, Schema } from 'mongoose';

export type FieldType = 'text' | 'textarea' | 'email' | 'phone' | 'select' | 'checkbox' | 'radio' | 'date' | 'number';

export interface IFieldOption {
  label: string;
  value: string;
}

export interface ICustomField extends Document {
  name: string;
  label: string;
  type: FieldType;
  required: boolean;
  placeholder?: string;
  options?: IFieldOption[]; // For select, radio, checkbox
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    min?: number;
    max?: number;
  };
  order: number;
  isActive: boolean;
  isDefault: boolean; // Field mặc định không thể xóa
  showInTable?: boolean; // Hiển thị trong bảng danh sách booking (optional)
  createdAt: Date;
  updatedAt: Date;
}

const FieldOptionSchema = new Schema<IFieldOption>({
  label: {
    type: String,
    required: true
  },
  value: {
    type: String,
    required: true
  }
});

const CustomFieldSchema = new Schema<ICustomField>({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  label: {
    type: String,
    required: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['text', 'textarea', 'email', 'phone', 'select', 'checkbox', 'radio', 'date', 'number'],
    required: true
  },
  required: {
    type: Boolean,
    default: false
  },
  placeholder: {
    type: String,
    trim: true
  },
  options: [FieldOptionSchema],
  validation: {
    minLength: Number,
    maxLength: Number,
    pattern: String,
    min: Number,
    max: Number
  },
  order: {
    type: Number,
    required: true,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isDefault: {
    type: Boolean,
    default: false
  },
  showInTable: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index for ordering
CustomFieldSchema.index({ order: 1, isActive: 1 });

export default mongoose.model<ICustomField>('CustomField', CustomFieldSchema);
