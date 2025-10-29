import express from 'express';
import { body, param } from 'express-validator';
import { 
  getAvailableTimeSlots, 
  createBooking, 
  getBookings, 
  getBookingById, 
  updateBookingStatus,
  cancelBooking,
  getPublicCustomFields
} from '../controllers/bookingController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Validation rules
const createBookingValidation = [
  body('bookingDate').isISO8601(),
  body('timeSlot').isString(),
  body('customFields').isArray()
];

const updateStatusValidation = [
  body('status').isIn(['pending', 'confirmed', 'cancelled', 'completed'])
];

const cancelBookingValidation = [
  body('cancellationReason').optional().trim()
];

// Public routes
router.get('/time-slots/:date', getAvailableTimeSlots);
router.get('/custom-fields', getPublicCustomFields);
router.post('/', createBookingValidation, createBooking);

// Protected routes
router.get('/', authenticate, authorize('admin', 'staff'), getBookings);
router.get('/:id', authenticate, authorize('admin', 'staff'), getBookingById);
router.put('/:id/status', authenticate, authorize('admin', 'staff'), updateStatusValidation, updateBookingStatus);
router.put('/:id/cancel', authenticate, authorize('admin', 'staff'), cancelBookingValidation, cancelBooking);

export default router;
