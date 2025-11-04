import mongoose, { Document, Schema } from 'mongoose';

export interface ITimeRange {
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
  maxBookings: number; // per range
}

export interface ITimeSlot extends Document {
  ruleType: 'all' | 'weekday' | 'specific';
  dayOfWeek?: number; // when ruleType = 'weekday'
  specificDate?: Date; // when ruleType = 'specific'
  timeRanges: ITimeRange[]; // empty array means closed day
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const TimeSlotSchema = new Schema<ITimeSlot>({
  ruleType: {
    type: String,
    enum: ['all', 'weekday', 'specific'],
    required: true
  },
  dayOfWeek: {
    type: Number,
    min: 0,
    max: 6
  },
  specificDate: {
    type: Date
  },
  timeRanges: [{
    startTime: { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    endTime:   { type: String, required: true, match: /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/ },
    maxBookings: { type: Number, required: true, min: 0, default: 1 }
  }],
  isActive: { type: Boolean, default: true }
}, {
  timestamps: true
});

// Indexes
TimeSlotSchema.index({ ruleType: 1, dayOfWeek: 1, isActive: 1 });
TimeSlotSchema.index({ specificDate: 1, isActive: 1 });

export default mongoose.model<ITimeSlot>('TimeSlot', TimeSlotSchema);
