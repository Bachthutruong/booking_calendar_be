import mongoose, { Document, Schema } from 'mongoose';

export interface ISystemConfig extends Document {
  type: 'footer' | 'email_template' | 'general' | 'success_page';
  config: {
    // Footer config
    companyName?: string;
    companyDescription?: string;
    email?: string;
    phone?: string;
    address?: string;
    services?: string[];
    support?: string[];
    showFooter?: boolean; // Control footer visibility
    
    // Email template config
    bookingConfirmationSubject?: string;
    bookingConfirmationContent?: string;
    bookingReminderSubject?: string;
    bookingReminderContent?: string;
    bookingCancellationSubject?: string;
    bookingCancellationContent?: string;
    // Admin notification templates
    adminNewBookingSubject?: string;
    adminNewBookingContent?: string;
    adminBookingConfirmedSubject?: string;
    adminBookingConfirmedContent?: string;
    adminBookingCancelledSubject?: string;
    adminBookingCancelledContent?: string;
    // User template when admin confirms (can reuse bookingConfirmationSubject/Content if not provided)
    userBookingConfirmedSubject?: string;
    userBookingConfirmedContent?: string;
    
    // General config
    siteName?: string;
    siteDescription?: string;
    timezone?: string;
    reminderTime?: string; // Time to send reminders (e.g., "09:00")
    reminderHoursBefore?: number; // Number of hours before start time to send auto reminder
  };
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const SystemConfigSchema = new Schema<ISystemConfig>({
  type: {
    type: String,
    enum: ['footer', 'email_template', 'general', 'success_page'],
    required: true
  },
  config: {
    type: Schema.Types.Mixed,
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient queries
SystemConfigSchema.index({ type: 1, isActive: 1 });

export default mongoose.model<ISystemConfig>('SystemConfig', SystemConfigSchema);
