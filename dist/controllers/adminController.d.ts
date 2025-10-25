import { Request, Response } from 'express';
import { IUser } from '../models/User';
interface AuthRequest extends Request {
    userId?: string;
    user?: IUser;
}
export declare const getTimeSlots: (req: Request, res: Response) => Promise<void>;
export declare const createTimeSlot: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateTimeSlot: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteTimeSlot: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getCustomFields: (req: Request, res: Response) => Promise<void>;
export declare const createCustomField: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateCustomField: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteCustomField: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getUsers: (req: Request, res: Response) => Promise<void>;
export declare const createUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateUser: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const deleteUser: (req: AuthRequest, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export {};
//# sourceMappingURL=adminController.d.ts.map