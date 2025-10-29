import mongoose, { Document } from 'mongoose';
export interface IBookingFieldValue {
    fieldId: string;
    value: any;
}
export interface IBooking extends Document {
    customerName?: string;
    customerEmail?: string;
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
declare const _default: mongoose.Model<IBooking, {}, {}, {}, mongoose.Document<unknown, {}, IBooking, {}, {}> & IBooking & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=Booking.d.ts.map