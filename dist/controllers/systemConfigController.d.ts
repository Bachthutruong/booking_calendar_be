import { Request, Response } from 'express';
export declare const getSystemConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const updateSystemConfig: (req: Request, res: Response) => Promise<Response<any, Record<string, any>> | undefined>;
export declare const getAllSystemConfigs: (req: Request, res: Response) => Promise<void>;
//# sourceMappingURL=systemConfigController.d.ts.map