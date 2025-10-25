"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cronController_1 = require("../controllers/cronController");
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Protected routes for cron jobs
router.post('/send-reminders', auth_1.authenticate, (0, auth_1.authorize)('admin'), cronController_1.sendReminderEmails);
router.post('/test-reminders', auth_1.authenticate, (0, auth_1.authorize)('admin'), cronController_1.testReminderEmails);
exports.default = router;
//# sourceMappingURL=cron.js.map