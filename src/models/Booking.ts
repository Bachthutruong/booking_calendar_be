import mongoose, { Document, Schema } from 'mongoose';

export interface IBookingFieldValue {
  fieldId: string;
  value: any;
}

export interface IBooking extends Document {
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  bookingDate: Date;
  timeSlot: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  reminderSent: boolean;
  cancelledBy?: mongoose.Types.ObjectId;
  cancelledAt?: Date;
  cancellationReason?: string;
  customFields: IBookingFieldValue[];
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const BookingFieldValueSchema = new Schema<IBookingFieldValue>({
  fieldId: {
    type: String,
    required: true
  },
  value: {
    type: Schema.Types.Mixed,
    required: true
  }
});

const BookingSchema = new Schema<IBooking>({
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerEmail: {
    type: String,
    required: true,
    trim: true,
    lowercase: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  bookingDate: {
    type: Date,
    required: true
  },
  timeSlot: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed'],
    default: 'pending'
  },
  reminderSent: {
    type: Boolean,
    default: false
  },
  cancelledBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  cancelledAt: {
    type: Date
  },
  cancellationReason: {
    type: String,
    trim: true
  },
  customFields: [BookingFieldValueSchema],
  notes: {
    type: String,
    trim: true
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
BookingSchema.index({ bookingDate: 1, timeSlot: 1 });
BookingSchema.index({ customerEmail: 1 });
BookingSchema.index({ status: 1 });
BookingSchema.index({ createdAt: -1 });

export default mongoose.model<IBooking>('Booking', BookingSchema);