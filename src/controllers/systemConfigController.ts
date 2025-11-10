import { Request, Response } from 'express';
import { validationResult } from 'express-validator';
import SystemConfig from '../models/SystemConfig';
import { invalidateEmailTransporter } from '../utils/emailService';

export const getSystemConfig = async (req: Request, res: Response) => {
  try {
    const { type } = req.params;
    
    const config = await SystemConfig.findOne({ type, isActive: true });
    
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
        email_config: {
          EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
          EMAIL_PORT: process.env.EMAIL_PORT || '587',
          EMAIL_USER: process.env.EMAIL_USER || '',
          EMAIL_PASS: process.env.EMAIL_PASS || '',
          EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || ''
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
        config: defaultConfigs[type as keyof typeof defaultConfigs] || {}
      });
    }

    res.json({
      success: true,
      config: config.config
    });
  } catch (error) {
    console.error('Get system config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const updateSystemConfig = async (req: Request, res: Response) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { type } = req.params;
    const { config } = req.body;

    let systemConfig = await SystemConfig.findOne({ type });
    
    if (!systemConfig) {
      systemConfig = new SystemConfig({ type, config });
    } else {
      systemConfig.config = config;
    }

    await systemConfig.save();

    // Nếu cập nhật email_config, vô hiệu hóa transporter cache
    if (type === 'email_config') {
      await invalidateEmailTransporter();
    }

    res.json({
      success: true,
      config: systemConfig.config
    });
  } catch (error) {
    console.error('Update system config error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

export const getAllSystemConfigs = async (req: Request, res: Response) => {
  try {
    const configs = await SystemConfig.find({ isActive: true });

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
      email_config: {
        EMAIL_HOST: process.env.EMAIL_HOST || 'smtp.gmail.com',
        EMAIL_PORT: process.env.EMAIL_PORT || '587',
        EMAIL_USER: process.env.EMAIL_USER || '',
        EMAIL_PASS: process.env.EMAIL_PASS || '',
        EMAIL_FROM: process.env.EMAIL_FROM || process.env.EMAIL_USER || ''
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
    } as any;

    const result = {
      footer: { ...defaultConfigs.footer, ...(configs.find(c => c.type === 'footer')?.config || {}) },
      email_template: { ...defaultConfigs.email_template, ...(configs.find(c => c.type === 'email_template')?.config || {}) },
      general: { ...defaultConfigs.general, ...(configs.find(c => c.type === 'general')?.config || {}) },
      email_config: { ...defaultConfigs.email_config, ...(configs.find(c => c.type === 'email_config')?.config || {}) }
    };

    res.json({
      success: true,
      configs: result
    });
  } catch (error) {
    console.error('Get all system configs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
