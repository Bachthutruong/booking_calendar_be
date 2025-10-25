import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeSlot extends Document {
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  startTime: string; // Format: "HH:mm"
  endTime: string; // Format: "HH:mm"
  isActive: boolean;
  isWeekend: boolean; // true for Saturday (6) and Sunday (0)
  specificDate?: Date; // For specific date overrides
  maxBookings: number;
  currentBookings: number;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  dayOfWeek: {
    type: Number,
    required: true,
    min: 0,
    max: 6
  },
  startTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  endTime: {
    type: String,
    required: true,
    match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isWeekend: {
    type: Boolean,
    default: false
  },
  specificDate: {
    type: Date
  },
  maxBookings: {
    type: Number,
    default: 1,
    min: 1
  },
  currentBookings: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// Index for efficient queries
TimeSlotSchema.index({ dayOfWeek: 1, isActive: 1 });
TimeSlotSchema.index({ specificDate: 1, isActive: 1 });

export default mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);
