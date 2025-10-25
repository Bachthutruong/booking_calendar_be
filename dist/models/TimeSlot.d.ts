import mongoose, { Document } from 'mongoose';
export interface ITimeSlot extends Document {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    isActive: boolean;
    isWeekend: boolean;
    specificDate?: Date;
    maxBookings: number;
    currentBookings: number;
    createdAt: Date;
    updatedAt: Date;
}
declare const _default: mongoose.Model<ITimeSlot, {}, {}, {}, mongoose.Document<unknown, {}, ITimeSlot, {}, {}> & ITimeSlot & Required<{
    _id: unknown;
}> & {
    __v: number;
}, any>;
export default _default;
//# sourceMappingURL=TimeSlot.d.ts.map