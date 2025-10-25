import { Request, Response } from 'express';
import { IUser } from '../models/User';
interface AuthRequest extends Request {
    userId?: string;
    user?: IUser;
}
export declare const getAvailableTimeSlots: (req: Request, res: Response) => Promise<void>;
export declare const createBooking: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getBookings: (req: Request, res: Response) => Promise<void>;
export declare const getBookingById: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateBookingStatus: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const cancelBooking: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=bookingController.d.ts.map