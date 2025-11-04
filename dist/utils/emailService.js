"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmedEmails = exports.sendBookingCancellationEmail = exports.sendBookingReminderEmail = exports.sendBookingConfirmationEmail = void 0;
const resend_1 = require("resend");
const User_1 = __importDefault(require("../models/User"));
const SystemConfig_1 = __importDefault(require("../models/SystemConfig"));
// 檢查電子郵件設定
const isEmailConfigured = () => {
    return process.env.RESEND_API_KEY || 're_QqaMiRDg_97ff4nmbPHUFRrC2ghLAoU5R';
};
const resend = isEmailConfigured() ? new resend_1.Resend(process.env.RESEND_API_KEY || 're_QqaMiRDg_97ff4nmbPHUFRrC2ghLAoU5R') : null;
const getEmailTemplate = async (type) => {
    // 預設模板（不需要 MongoDB）
    const defaultTemplates = {
        bookingConfirmationSubject: '諮詢預約確認',
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
        bookingReminderSubject: '諮詢預約提醒',
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
        bookingCancellationSubject: '取消諮詢預約',
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
        // Admin defaults
        adminNewBookingSubject: '新預約待確認',
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
        adminBookingConfirmedSubject: '預約已確認',
        adminBookingConfirmedContent: `
      <h2>諮詢預約已確認</h2>
      <p>與客戶 {{customerName}} 的行程已確認。</p>
      <ul>
        <li><strong>日期：</strong> {{bookingDate}}</li>
        <li><strong>時間：</strong> {{timeSlot}}</li>
      </ul>
    `,
        adminBookingCancelledSubject: '預約已取消',
        adminBookingCancelledContent: `
      <h2>諮詢預約已取消</h2>
      <p>與客戶 {{customerName}} 的行程已取消。</p>
      <ul>
        <li><strong>日期：</strong> {{bookingDate}}</li>
        <li><strong>時間：</strong> {{timeSlot}}</li>
        {{#if cancellationReason}}<li><strong>取消原因：</strong> {{cancellationReason}}</li>{{/if}}
      </ul>
    `,
        userBookingConfirmedSubject: '您的預約已確認',
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
    };
    // Try load from DB config overrides
    try {
        const cfg = await SystemConfig_1.default.findOne({ type: 'email_template', isActive: true });
        const fromDb = (cfg?.config || {});
        return fromDb[type] || defaultTemplates[type] || '';
    }
    catch {
        return defaultTemplates[type] || '';
    }
};
const replaceTemplateVariables = (template, variables) => {
    let result = template;
    Object.keys(variables).forEach(key => {
        const regex = new RegExp(`{{${key}}}`, 'g');
        result = result.replace(regex, variables[key] || '');
    });
    // Handle conditional blocks
    result = result.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, condition, content) => {
        return variables[condition] ? content : '';
    });
    return result;
};
const sendBookingConfirmationEmail = async (booking) => {
    try {
        if (!isEmailConfigured() || !resend) {
            console.log('電子郵件未設定，略過發送確認郵件。');
            return;
        }
        const subject = await getEmailTemplate('bookingConfirmationSubject');
        const content = await getEmailTemplate('bookingConfirmationContent');
        const variables = {
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        // Gửi email cho khách hàng (nếu có email)
        if (booking.customerEmail) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: booking.customerEmail,
                subject: subject,
                html: customerEmailHtml
            });
        }
        // Gửi email cho tất cả admin
        const adminSubject = await getEmailTemplate('adminNewBookingSubject');
        const adminContent = await getEmailTemplate('adminNewBookingContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const admins = await User_1.default.find({ role: 'admin', isActive: true }).select('email');
        const adminEmails = admins.map((u) => u.email).filter(Boolean);
        if (adminEmails.length > 0) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: adminEmails,
                subject: adminSubject || '新的諮詢預約',
                html: adminHtml
            });
        }
        console.log('確認郵件已透過 Resend 成功寄出');
    }
    catch (error) {
        console.error('Send booking confirmation email error:', error);
    }
};
exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
const sendBookingReminderEmail = async (booking) => {
    try {
        if (!isEmailConfigured() || !resend) {
            console.log('電子郵件未設定，略過發送提醒郵件。');
            return;
        }
        const subject = await getEmailTemplate('bookingReminderSubject');
        const content = await getEmailTemplate('bookingReminderContent');
        const variables = {
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        if (booking.customerEmail) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: booking.customerEmail,
                subject: subject,
                html: customerEmailHtml
            });
        }
        // Email to all admins as well
        const admins = await User_1.default.find({ role: 'admin', isActive: true }).select('email');
        const adminEmails = admins.map((u) => u.email).filter(Boolean);
        if (adminEmails.length > 0) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: adminEmails,
                subject: await getEmailTemplate('bookingReminderSubject'),
                html: customerEmailHtml
            });
        }
    }
    catch (error) {
        console.error('Send booking reminder email error:', error);
    }
};
exports.sendBookingReminderEmail = sendBookingReminderEmail;
const sendBookingCancellationEmail = async (booking, cancellationReason, excludeAdminId) => {
    try {
        if (!isEmailConfigured() || !resend) {
            console.log('電子郵件未設定，略過發送取消郵件。');
            return;
        }
        const subject = await getEmailTemplate('bookingCancellationSubject');
        const content = await getEmailTemplate('bookingCancellationContent');
        const variables = {
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot,
            cancellationReason: cancellationReason
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        if (booking.customerEmail) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: booking.customerEmail,
                subject: subject,
                html: customerEmailHtml
            });
        }
        // Email to all admins (exclude actor if provided)
        const adminSubject = await getEmailTemplate('adminBookingCancelledSubject');
        const adminContent = await getEmailTemplate('adminBookingCancelledContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const adminQuery = { role: 'admin', isActive: true };
        const admins = await User_1.default.find(adminQuery).select('email _id');
        const adminEmails = admins
            .filter((u) => !excludeAdminId || String(u._id) !== String(excludeAdminId))
            .map((u) => u.email)
            .filter(Boolean);
        if (adminEmails.length > 0) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: adminEmails,
                subject: adminSubject || '取消諮詢預約',
                html: adminHtml
            });
        }
    }
    catch (error) {
        console.error('Send booking cancellation email error:', error);
    }
};
exports.sendBookingCancellationEmail = sendBookingCancellationEmail;
const sendBookingConfirmedEmails = async (booking, actorAdminId) => {
    try {
        if (!isEmailConfigured() || !resend) {
            console.log('電子郵件未設定，略過核准後的確認郵件。');
            return;
        }
        const variables = {
            customerName: booking.customerName,
            customerEmail: booking.customerEmail,
            customerPhone: booking.customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot
        };
        // Send to user
        const userSubject = (await getEmailTemplate('userBookingConfirmedSubject')) || (await getEmailTemplate('bookingConfirmationSubject'));
        const userContent = (await getEmailTemplate('userBookingConfirmedContent')) || (await getEmailTemplate('bookingConfirmationContent'));
        const userHtml = replaceTemplateVariables(userContent, variables);
        if (booking.customerEmail) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: booking.customerEmail,
                subject: userSubject,
                html: userHtml
            });
        }
        // Notify other admins
        const adminSubject = await getEmailTemplate('adminBookingConfirmedSubject');
        const adminContent = await getEmailTemplate('adminBookingConfirmedContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const admins = await User_1.default.find({ role: 'admin', isActive: true }).select('email _id');
        const adminEmails = admins
            .filter((u) => !actorAdminId || String(u._id) !== String(actorAdminId))
            .map((u) => u.email)
            .filter(Boolean);
        if (adminEmails.length > 0) {
            await resend.emails.send({
                from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
                to: adminEmails,
                subject: adminSubject || '預約已確認',
                html: adminHtml
            });
        }
    }
    catch (error) {
        console.error('Send booking confirmed emails error:', error);
    }
};
exports.sendBookingConfirmedEmails = sendBookingConfirmedEmails;
//# sourceMappingURL=emailService.js.map