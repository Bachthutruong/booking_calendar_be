"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const adminController_1 = require("../controllers/adminController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// All routes require admin authentication
router.use(auth_1.authenticate);
router.use((0, auth_1.authorize)('admin'));
// Time slots validation
const timeSlotValidation = [
    (0, express_validator_1.body)('type').isIn(['all', 'weekend', 'specific']),
    (0, express_validator_1.body)('timeSlots').isArray().notEmpty(),
    (0, express_validator_1.body)('timeSlots.*.startTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    (0, express_validator_1.body)('timeSlots.*.endTime').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
    (0, express_validator_1.body)('maxBookings').isInt({ min: 1 }),
    (0, express_validator_1.body)('isActive').isBoolean(),
    (0, express_validator_1.body)('specificDate').optional().isISO8601()
];
// Custom fields validation
const customFieldValidation = [
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('label').notEmpty().trim(),
    (0, express_validator_1.body)('type').isIn(['text', 'textarea', 'email', 'phone', 'select', 'checkbox', 'radio', 'date', 'number']),
    (0, express_validator_1.body)('required').optional().isBoolean(),
    (0, express_validator_1.body)('placeholder').optional().trim(),
    (0, express_validator_1.body)('order').optional().isInt({ min: 0 }),
    (0, express_validator_1.body)('isActive').optional().isBoolean()
];
// User validation
const userValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('role').isIn(['admin', 'staff', 'customer']),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('vi-VN')
];
// Time slots routes
router.get('/time-slots', adminController_1.getTimeSlots);
router.post('/time-slots', timeSlotValidation, adminController_1.createTimeSlot);
router.put('/time-slots/:id', timeSlotValidation, adminController_1.updateTimeSlot);
router.delete('/time-slots/:id', adminController_1.deleteTimeSlot);
// Custom fields routes
router.get('/custom-fields', adminController_1.getCustomFields);
router.post('/custom-fields', customFieldValidation, adminController_1.createCustomField);
router.put('/custom-fields/:id', customFieldValidation, adminController_1.updateCustomField);
router.delete('/custom-fields/:id', adminController_1.deleteCustomField);
// Users routes
router.get('/users', adminController_1.getUsers);
router.post('/users', userValidation, adminController_1.createUser);
router.put('/users/:id', userValidation, adminController_1.updateUser);
router.delete('/users/:id', adminController_1.deleteUser);
exports.default = router;
//# sourceMappingURL=admin.js.map