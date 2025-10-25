import express from 'express';
import { body, param } from 'express-validator';
import { 
  getSystemConfig, 
  updateSystemConfig, 
  getAllSystemConfigs 
} from '../controllers/systemConfigController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Validation rules
const updateConfigValidation = [
  body('config').isObject().withMessage('Config must be an object')
];

// Public routes (for frontend to get configs)
router.get('/:type', getSystemConfig);

// Protected routes (admin only)
router.get('/', authenticate, authorize('admin'), getAllSystemConfigs);
router.put('/:type', authenticate, authorize('admin'), updateConfigValidation, updateSystemConfig);

export default router;
