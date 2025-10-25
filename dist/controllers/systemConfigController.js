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
                    companyDescription: "Hệ thống đặt lịch tư vấn thông minh và tiện lợi",
                    email: "info@bookingcalendar.com",
                    phone: "0123 456 789",
                    address: "123 Đường ABC, Quận 1, TP.HCM",
                    services: ["Đặt lịch tư vấn", "Hỗ trợ 24/7", "Báo cáo tự động"],
                    support: ["Hướng dẫn sử dụng", "FAQ", "Liên hệ hỗ trợ"]
                },
                email_template: {
                    bookingConfirmationSubject: "Xác nhận đặt lịch tư vấn",
                    bookingConfirmationContent: `
            <h2>Xác nhận đặt lịch tư vấn</h2>
            <p>Xin chào {{customerName}},</p>
            <p>Chúng tôi đã nhận được yêu cầu đặt lịch tư vấn của bạn với thông tin sau:</p>
            <ul>
              <li><strong>Ngày:</strong> {{bookingDate}}</li>
              <li><strong>Giờ:</strong> {{timeSlot}}</li>
              <li><strong>Email:</strong> {{customerEmail}}</li>
              {{#if customerPhone}}<li><strong>Số điện thoại:</strong> {{customerPhone}}</li>{{/if}}
            </ul>
            <p>Chúng tôi sẽ liên hệ lại với bạn để xác nhận lịch hẹn.</p>
            <p>Trân trọng,<br>Đội ngũ tư vấn</p>
          `,
                    bookingReminderSubject: "Nhắc nhở lịch tư vấn",
                    bookingReminderContent: `
            <h2>Nhắc nhở lịch tư vấn</h2>
            <p>Xin chào {{customerName}},</p>
            <p>Đây là email nhắc nhở về lịch tư vấn của bạn vào ngày mai:</p>
            <ul>
              <li><strong>Ngày:</strong> {{bookingDate}}</li>
              <li><strong>Giờ:</strong> {{timeSlot}}</li>
            </ul>
            <p>Vui lòng chuẩn bị sẵn sàng cho buổi tư vấn.</p>
            <p>Trân trọng,<br>Đội ngũ tư vấn</p>
          `,
                    bookingCancellationSubject: "Hủy lịch tư vấn",
                    bookingCancellationContent: `
            <h2>Hủy lịch tư vấn</h2>
            <p>Xin chào {{customerName}},</p>
            <p>Lịch tư vấn của bạn đã bị hủy:</p>
            <ul>
              <li><strong>Ngày:</strong> {{bookingDate}}</li>
              <li><strong>Giờ:</strong> {{timeSlot}}</li>
              {{#if cancellationReason}}<li><strong>Lý do hủy:</strong> {{cancellationReason}}</li>{{/if}}
            </ul>
            <p>Vui lòng liên hệ với chúng tôi nếu bạn muốn đặt lịch mới.</p>
            <p>Trân trọng,<br>Đội ngũ tư vấn</p>
          `
                },
                general: {
                    siteName: "Booking Calendar",
                    siteDescription: "Hệ thống đặt lịch tư vấn",
                    timezone: "Asia/Ho_Chi_Minh",
                    reminderTime: "09:00"
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
        const result = {
            footer: configs.find(c => c.type === 'footer')?.config || {},
            email_template: configs.find(c => c.type === 'email_template')?.config || {},
            general: configs.find(c => c.type === 'general')?.config || {}
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