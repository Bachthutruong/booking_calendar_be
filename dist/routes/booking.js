"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const bookingController_1 = require("../controllers/bookingController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation rules
const createBookingValidation = [
    (0, express_validator_1.body)('bookingDate').isISO8601(),
    (0, express_validator_1.body)('timeSlot').isString(),
    (0, express_validator_1.body)('customFields').isArray()
];
const updateStatusValidation = [
    (0, express_validator_1.body)('status').isIn(['pending', 'confirmed', 'cancelled', 'completed'])
];
const cancelBookingValidation = [
    (0, express_validator_1.body)('cancellationReason').optional().trim()
];
// Public routes
router.get('/time-slots/:date', bookingController_1.getAvailableTimeSlots);
router.post('/', createBookingValidation, bookingController_1.createBooking);
// Protected routes
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('admin', 'staff'), bookingController_1.getBookings);
router.get('/:id', auth_1.authenticate, (0, auth_1.authorize)('admin', 'staff'), bookingController_1.getBookingById);
router.put('/:id/status', auth_1.authenticate, (0, auth_1.authorize)('admin', 'staff'), updateStatusValidation, bookingController_1.updateBookingStatus);
router.put('/:id/cancel', auth_1.authenticate, (0, auth_1.authorize)('admin', 'staff'), cancelBookingValidation, bookingController_1.cancelBooking);
exports.default = router;
//# sourceMappingURL=booking.js.map