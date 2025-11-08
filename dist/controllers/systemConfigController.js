"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAllSystemConfigs = exports.updateSystemConfig = exports.getSystemConfig = void 0;
const express_validator_1 = require("express-validator");
const SystemConfig_1 = __importDefault(require("../models/SystemConfig"));
const getSystemConfig = async (req, res) => {
    try {
        const { type } = req.params;
        const config = await SystemConfig_1.default.findOne({ type, isActive: true });
        if (!config) {
            // Return default config if not found
            const defaultConfigs = {
                footer: {
                    companyName: "Booking Calendar",
                    companyDescription: "智慧且便利的諮詢預約系統",
                    email: "info@bookingcalendar.com",
                    phone: "0123 456 789",
                    address: "越南胡志明市第一郡 ABC 路 123 號",
                    services: ["諮詢預約", "24/7 支援", "自動化報告"],
                    support: ["使用指南", "FAQ", "聯絡支援"],
                    showFooter: true
                },
                email_template: {
                    bookingConfirmationSubject: "諮詢預約確認",
                    bookingConfirmationContent: `
            <h2>諮詢預約確認</h2>
            <p>您好 {{customerName}}，</p>
            <p>我們已收到您的諮詢預約，詳細資訊如下：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              <li><strong>Email：</strong> {{customerEmail}}</li>
              {{#if customerPhone}}<li><strong>電話：</strong> {{customerPhone}}</li>{{/if}}
            </ul>
            <p>我們將與您聯繫以確認行程。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                    bookingReminderSubject: "諮詢預約提醒",
                    bookingReminderContent: `
            <h2>諮詢預約提醒</h2>
            <p>您好 {{customerName}}，</p>
            <p>這是提醒您明日的諮詢預約：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
            <p>請準備好相關資訊以利諮詢順利進行。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                    bookingCancellationSubject: "取消諮詢預約",
                    bookingCancellationContent: `
            <h2>取消諮詢預約</h2>
            <p>您好 {{customerName}}，</p>
            <p>您的諮詢預約已被取消：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if cancellationReason}}<li><strong>取消原因：</strong> {{cancellationReason}}</li>{{/if}}
            </ul>
            <p>若您想重新預約，請與我們聯繫。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                    adminNewBookingSubject: "新預約待確認",
                    adminNewBookingContent: `
            <h2>新的諮詢預約</h2>
            <p>有一筆新的諮詢預約等待確認：</p>
            <ul>
              <li><strong>客戶姓名：</strong> {{customerName}}</li>
              <li><strong>Email：</strong> {{customerEmail}}</li>
              {{#if customerPhone}}<li><strong>電話：</strong> {{customerPhone}}</li>{{/if}}
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if notes}}<li><strong>備註：</strong> {{notes}}</li>{{/if}}
            </ul>
          `,
                    adminBookingConfirmedSubject: "預約已確認",
                    adminBookingConfirmedContent: `
            <h2>諮詢預約已確認</h2>
            <p>與客戶 {{customerName}} 的行程已確認。</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
          `,
                    adminBookingCancelledSubject: "預約已取消",
                    adminBookingCancelledContent: `
            <h2>諮詢預約已取消</h2>
            <p>與客戶 {{customerName}} 的行程已取消。</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if cancellationReason}}<li><strong>取消原因：</strong> {{cancellationReason}}</li>{{/if}}
            </ul>
          `,
                    userBookingConfirmedSubject: "您的預約已確認",
                    userBookingConfirmedContent: `
            <h2>諮詢預約已確認</h2>
            <p>您好 {{customerName}}，</p>
            <p>您的諮詢預約已確認：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
            <p>期待與您見面！</p>
          `
                },
                general: {
                    siteName: "Booking Calendar",
                    siteDescription: "諮詢預約系統",
                    timezone: "Asia/Ho_Chi_Minh",
                    reminderTime: "09:00",
                    reminderHoursBefore: 24
                }
            };
            return res.json({
                success: true,
                config: defaultConfigs[type] || {}
            });
        }
        res.json({
            success: true,
            config: config.config
        });
    }
    catch (error) {
        console.error('Get system config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getSystemConfig = getSystemConfig;
const updateSystemConfig = async (req, res) => {
    try {
        const errors = (0, express_validator_1.validationResult)(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { type } = req.params;
        const { config } = req.body;
        let systemConfig = await SystemConfig_1.default.findOne({ type });
        if (!systemConfig) {
            systemConfig = new SystemConfig_1.default({ type, config });
        }
        else {
            systemConfig.config = config;
        }
        await systemConfig.save();
        res.json({
            success: true,
            config: systemConfig.config
        });
    }
    catch (error) {
        console.error('Update system config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.updateSystemConfig = updateSystemConfig;
const getAllSystemConfigs = async (req, res) => {
    try {
        const configs = await SystemConfig_1.default.find({ isActive: true });
        // Default configs (mirror of getSystemConfig defaults)
        const defaultConfigs = {
            footer: {
                companyName: "Booking Calendar",
                companyDescription: "智慧且便利的諮詢預約系統",
                email: "info@bookingcalendar.com",
                phone: "0123 456 789",
                address: "越南胡志明市第一郡 ABC 路 123 號",
                support: ["使用指南", "FAQ", "聯絡支援"]
            },
            email_template: {
                bookingConfirmationSubject: "諮詢預約確認",
                bookingConfirmationContent: `
            <h2>諮詢預約確認</h2>
            <p>您好 {{customerName}}，</p>
            <p>我們已收到您的諮詢預約，詳細資訊如下：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              <li><strong>Email：</strong> {{customerEmail}}</li>
              {{#if customerPhone}}<li><strong>電話：</strong> {{customerPhone}}</li>{{/if}}
            </ul>
            <p>我們將與您聯繫以確認行程。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                bookingReminderSubject: "諮詢預約提醒",
                bookingReminderContent: `
            <h2>諮詢預約提醒</h2>
            <p>您好 {{customerName}}，</p>
            <p>這是提醒您明日的諮詢預約：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
            <p>請準備好相關資訊以利諮詢順利進行。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                bookingCancellationSubject: "取消諮詢預約",
                bookingCancellationContent: `
            <h2>取消諮詢預約</h2>
            <p>您好 {{customerName}}，</p>
            <p>您的諮詢預約已被取消：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if cancellationReason}}<li><strong>取消原因：</strong> {{cancellationReason}}</li>{{/if}}
            </ul>
            <p>若您想重新預約，請與我們聯繫。</p>
            <p>敬上，<br>諮詢團隊</p>
          `,
                adminNewBookingSubject: "新預約待確認",
                adminNewBookingContent: `
            <h2>新的諮詢預約</h2>
            <p>有一筆新的諮詢預約等待確認：</p>
            <ul>
              <li><strong>客戶姓名：</strong> {{customerName}}</li>
              <li><strong>Email：</strong> {{customerEmail}}</li>
              {{#if customerPhone}}<li><strong>電話：</strong> {{customerPhone}}</li>{{/if}}
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if notes}}<li><strong>備註：</strong> {{notes}}</li>{{/if}}
            </ul>
          `,
                adminBookingConfirmedSubject: "預約已確認",
                adminBookingConfirmedContent: `
            <h2>諮詢預約已確認</h2>
            <p>與客戶 {{customerName}} 的行程已確認。</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
          `,
                adminBookingCancelledSubject: "預約已取消",
                adminBookingCancelledContent: `
            <h2>諮詢預約已取消</h2>
            <p>與客戶 {{customerName}} 的行程已取消。</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
              {{#if cancellationReason}}<li><strong>取消原因：</strong> {{cancellationReason}}</li>{{/if}}
            </ul>
          `,
                userBookingConfirmedSubject: "您的預約已確認",
                userBookingConfirmedContent: `
            <h2>諮詢預約已確認</h2>
            <p>您好 {{customerName}}，</p>
            <p>您的諮詢預約已確認：</p>
            <ul>
              <li><strong>日期：</strong> {{bookingDate}}</li>
              <li><strong>時間：</strong> {{timeSlot}}</li>
            </ul>
            <p>期待與您見面！</p>
          `
            },
            general: {
                siteName: "Booking Calendar",
                siteDescription: "諮詢預約系統",
                timezone: "Asia/Ho_Chi_Minh",
                reminderTime: "09:00",
                reminderHoursBefore: 24
            }
        };
        const result = {
            footer: { ...defaultConfigs.footer, ...(configs.find(c => c.type === 'footer')?.config || {}) },
            email_template: { ...defaultConfigs.email_template, ...(configs.find(c => c.type === 'email_template')?.config || {}) },
            general: { ...defaultConfigs.general, ...(configs.find(c => c.type === 'general')?.config || {}) }
        };
        res.json({
            success: true,
            configs: result
        });
    }
    catch (error) {
        console.error('Get all system configs error:', error);
        res.status(500).json({ message: 'Server error' });
    }
};
exports.getAllSystemConfigs = getAllSystemConfigs;
//# sourceMappingURL=systemConfigController.js.map