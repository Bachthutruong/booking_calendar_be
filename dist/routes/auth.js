"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const authController_1 = require("../controllers/authController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation rules
const registerValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').isLength({ min: 6 }),
    (0, express_validator_1.body)('name').notEmpty().trim(),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('vi-VN')
];
const loginValidation = [
    (0, express_validator_1.body)('email').isEmail().normalizeEmail(),
    (0, express_validator_1.body)('password').notEmpty()
];
const updateProfileValidation = [
    (0, express_validator_1.body)('name').optional().notEmpty().trim(),
    (0, express_validator_1.body)('phone').optional().isMobilePhone('vi-VN')
];
const changePasswordValidation = [
    (0, express_validator_1.body)('currentPassword').notEmpty(),
    (0, express_validator_1.body)('newPassword').isLength({ min: 6 })
];
// Routes
router.post('/register', registerValidation, authController_1.register);
router.post('/login', loginValidation, authController_1.login);
router.get('/profile', auth_1.authenticate, authController_1.getProfile);
router.put('/profile', auth_1.authenticate, updateProfileValidation, authController_1.updateProfile);
router.put('/change-password', auth_1.authenticate, changePasswordValidation, authController_1.changePassword);
exports.default = router;
//# sourceMappingURL=auth.js.map