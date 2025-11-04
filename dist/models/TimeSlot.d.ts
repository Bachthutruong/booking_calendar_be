import mongoose, { Document } from 'mongoose';
export interface ITimeRange {
    startTime: string;
    endTime: string;
    maxBookings: number;
}
export interface ITimeSlot extends Document {
    ruleType: 'all' | 'weekday' | 'specific';
    dayOfWeek?: number;
    specificDate?: Date;
    timeRanges: ITimeRange[];
    isActive: boolean;
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