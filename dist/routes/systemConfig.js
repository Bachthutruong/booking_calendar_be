"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const express_validator_1 = require("express-validator");
const systemConfigController_1 = require("../controllers/systemConfigController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Validation rules
const updateConfigValidation = [
    (0, express_validator_1.body)('config').isObject().withMessage('Config must be an object')
];
// Public routes (for frontend to get configs)
router.get('/:type', systemConfigController_1.getSystemConfig);
// Protected routes (admin only)
router.get('/', auth_1.authenticate, (0, auth_1.authorize)('admin'), systemConfigController_1.getAllSystemConfigs);
router.put('/:type', auth_1.authenticate, (0, auth_1.authorize)('admin'), updateConfigValidation, systemConfigController_1.updateSystemConfig);
exports.default = router;
//# sourceMappingURL=systemConfig.js.map