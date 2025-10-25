import express from 'express';
import { body, param } from 'express-validator';
import { 
  getTimeSlots, 
  createTimeSlot, 
  updateTimeSlot, 
  deleteTimeSlot,
  getCustomFields,
  createCustomField,
  updateCustomField,
  deleteCustomField,
  getUsers,
  createUser,
  updateUser,
  deleteUser
} from '../controllers/adminController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// All routes require admin authentication
router.use(authenticate);
router.use(authorize('admin'));

// Time slots validation
const timeSlotValidation = [
  body('type').isIn(['all', 'weekend', 'specific']),
  body('timeSlots').isArray().notEmpty(),
  body('timeSlots.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('timeSlots.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('maxBookings').isInt({ min: 1 }),
  body('isActive').isBoolean(),
  body('specificDate').optional().isISO8601()
];

// Custom fields validation
const customFieldValidation = [
  body('name').notEmpty().trim(),
  body('label').notEmpty().trim(),
  body('type').isIn(['text', 'textarea', 'email', 'phone', 'select', 'checkbox', 'radio', 'date', 'number']),
  body('required').optional().isBoolean(),
  body('placeholder').optional().trim(),
  body('order').optional().isInt({ min: 0 }),
  body('isActive').optional().isBoolean()
];

// User validation
const userValidation = [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('name').notEmpty().trim(),
  body('role').isIn(['admin', 'staff', 'customer']),
  body('phone').optional().isMobilePhone('vi-VN')
];

// Time slots routes
router.get('/time-slots', getTimeSlots);
router.post('/time-slots', timeSlotValidation, createTimeSlot);
router.put('/time-slots/:id', timeSlotValidation, updateTimeSlot);
router.delete('/time-slots/:id', deleteTimeSlot);

// Custom fields routes
router.get('/custom-fields', getCustomFields);
router.post('/custom-fields', customFieldValidation, createCustomField);
router.put('/custom-fields/:id', customFieldValidation, updateCustomField);
router.delete('/custom-fields/:id', deleteCustomField);

// Users routes
router.get('/users', getUsers);
router.post('/users', userValidation, createUser);
router.put('/users/:id', userValidation, updateUser);
router.delete('/users/:id', deleteUser);

export default router;
