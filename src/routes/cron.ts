import express from 'express';
import { sendReminderEmails, testReminderEmails } from '../controllers/cronController';
import { authenticate, authorize } from '../middleware/auth';

const router = express.Router();

// Protected routes for cron jobs
router.post('/send-reminders', authenticate, authorize('admin'), sendReminderEmails);
router.post('/test-reminders', authenticate, authorize('admin'), testReminderEmails);

export default router;
