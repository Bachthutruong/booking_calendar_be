import mongoose, { Document } from 'mongoose';
export interface ISystemConfig extends Document {
    type: 'footer' | 'email_template' | 'general' | 'success_page';
    config: {
        companyName?: string;
        companyDescription?: string;
        email?: string;
        phone?: string;
        address?: string;
        services?: string[];
        support?: string[];
        bookingConfirmationSubject?: string;
        bookingConfirmationContent?: string;
        bookingReminderSubject?: string;
        bookingReminderContent?: string;
        bookingCancellationSubject?: string;
        bookingCancellationContent?: string;
        adminNewBookingSubject?: string;
        adminNewBookingContent?: string;
        adminBookingConfirmedSubject?: string;
        adminBookingConfirmedContent?: string;
        adminBookingCancelledSubject?: string;
        adminBookingCancelledContent?: string;
        userBookingConfirmedSubject?: string;
        userBookingConfirmedContent?: string;
        siteName?: string;
        siteDescription?: string;
        timezone?: string;
        reminderTime?: string;
        reminderHoursBefore?: number;
    };
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ISystemConfig, {}, {}, {}, mongoose.Document<unknown, {}, ISystemConfig, {}, {}> & ISystemConfig & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=SystemConfig.d.ts.map