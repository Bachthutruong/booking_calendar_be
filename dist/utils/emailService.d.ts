export declare const sendBookingConfirmationEmail: (booking: any) => Promise<void>;
export declare const sendBookingReminderEmail: (booking: any) => Promise<void>;
export declare const sendBookingCancellationEmail: (booking: any, cancellationReason?: string, excludeAdminId?: string) => Promise<void>;
export declare const sendBookingConfirmedEmails: (booking: any, actorAdminId?: string) => Promise<void>;
//# sourceMappingURL=emailService.d.ts.map