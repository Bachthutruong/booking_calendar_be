"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendBookingConfirmedEmails = exports.sendBookingCancellationEmail = exports.sendBookingReminderEmail = exports.sendBookingConfirmationEmail = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const nodemailer_1 = __importDefault(require("nodemailer"));
const User_1 = __importDefault(require("../models/User"));
const SystemConfig_1 = __importDefault(require("../models/SystemConfig"));
const CustomField_1 = __importDefault(require("../models/CustomField"));
// Load environment variables (đảm bảo được load trước khi sử dụng)
dotenv_1.default.config();
// Kiểm tra cấu hình email SMTP
const isEmailConfigured = () => {
    const hasConfig = !!(process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS);
    // Log để debug
    if (!hasConfig) {
        console.log('[EMAIL] ⚠️ Email chưa được cấu hình. Kiểm tra các biến môi trường:');
        console.log('[EMAIL] EMAIL_HOST:', process.env.EMAIL_HOST ? '✓' : '✗');
        console.log('[EMAIL] EMAIL_USER:', process.env.EMAIL_USER ? '✓' : '✗');
        console.log('[EMAIL] EMAIL_PASS:', process.env.EMAIL_PASS ? '✓' : '✗');
        console.log('[EMAIL] EMAIL_PORT:', process.env.EMAIL_PORT || '587 (default)');
    }
    else {
        console.log('[EMAIL] ✅ Email đã được cấu hình:', {
            host: process.env.EMAIL_HOST,
            port: process.env.EMAIL_PORT || '587',
            user: process.env.EMAIL_USER
        });
    }
    return hasConfig;
};
// Tạo transporter SMTP (tạo mỗi lần để đảm bảo env vars được load)
const createTransporter = () => {
    if (!isEmailConfigured()) {
        return null;
    }
    try {
        const transporter = nodemailer_1.default.createTransport({
            host: process.env.EMAIL_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.EMAIL_PORT || '587'),
            secure: false, // true for 465, false for other ports
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        console.log('[EMAIL] ✅ Transporter SMTP đã được tạo thành công');
        return transporter;
    }
    catch (error) {
        console.error('[EMAIL] ❌ Lỗi tạo transporter SMTP:', error?.message || error);
        return null;
    }
};
// Tạo transporter khi module được load
let transporter = createTransporter();
// Helper để lấy transporter (tạo lại nếu cần)
const getTransporter = () => {
    if (!transporter) {
        transporter = createTransporter();
    }
    return transporter;
};
// Helper: Gửi email qua SMTP
const sendEmail = async (to, subject, html, from) => {
    const currentTransporter = getTransporter();
    if (!currentTransporter) {
        throw new Error('Email transporter chưa được cấu hình. Vui lòng kiểm tra EMAIL_HOST, EMAIL_USER, EMAIL_PASS trong file .env');
    }
    const emailFrom = from || process.env.EMAIL_FROM || process.env.EMAIL_USER || 'noreply@example.com';
    return await currentTransporter.sendMail({
        from: emailFrom,
        to: to,
        subject: subject,
        html: html
    });
};
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
// Helper: Extract email, name, phone from customFields
const extractCustomerInfoFromCustomFields = async (booking) => {
    let email = booking.customerEmail;
    let name = booking.customerName;
    let phone = booking.customerPhone;
    // Nếu không có trong trường trực tiếp, tìm trong customFields
    if (!email || !name || !phone) {
        const customFields = await CustomField_1.default.find({ isActive: true }).sort({ order: 1 });
        const valueById = {};
        (booking.customFields || []).forEach((f) => {
            valueById[f.fieldId] = f.value;
        });
        for (const field of customFields) {
            const value = valueById[String(field._id)];
            if (value) {
                // Tìm email field
                if (!email && (field.name === 'email' || field.type === 'email')) {
                    email = String(value).trim().toLowerCase();
                }
                // Tìm name field
                if (!name && (field.name === 'customer_name' || field.name === 'name' || field.name === 'full_name')) {
                    name = String(value).trim();
                }
                // Tìm phone field
                if (!phone && (field.name === 'customer_phone' || field.name === 'phone' || field.type === 'phone')) {
                    phone = String(value).trim();
                }
            }
        }
    }
    return { email, name, phone };
};
const sendBookingConfirmationEmail = async (booking) => {
    try {
        const currentTransporter = getTransporter();
        if (!isEmailConfigured() || !currentTransporter) {
            console.log('[EMAIL] 電子郵件未設定，略過發送確認郵件。');
            console.log('[EMAIL] Vui lòng kiểm tra file backend/.env có các biến: EMAIL_HOST, EMAIL_USER, EMAIL_PASS');
            return;
        }
        // Extract customer info từ customFields nếu không có trong trường trực tiếp
        const { email, name, phone } = await extractCustomerInfoFromCustomFields(booking);
        const customerEmail = email || booking.customerEmail;
        const customerName = name || booking.customerName;
        const customerPhone = phone || booking.customerPhone;
        console.log('[EMAIL] Bắt đầu gửi email xác nhận booking:', {
            bookingId: booking._id,
            customerEmail,
            customerName,
            customerPhone,
            hasCustomFields: !!(booking.customFields && booking.customFields.length > 0)
        });
        const subject = await getEmailTemplate('bookingConfirmationSubject');
        const content = await getEmailTemplate('bookingConfirmationContent');
        const variables = {
            customerName,
            customerEmail,
            customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot,
            notes: booking.notes
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        // Gửi email cho khách hàng (nếu có email)
        if (customerEmail) {
            try {
                console.log('[EMAIL] Đang gửi email cho khách hàng:', customerEmail);
                const customerResult = await sendEmail(customerEmail, subject, customerEmailHtml);
                console.log('[EMAIL] ✅ Email khách hàng đã gửi thành công:', {
                    email: customerEmail,
                    messageId: customerResult.messageId
                });
            }
            catch (customerError) {
                console.error('[EMAIL] ❌ Lỗi gửi email cho khách hàng:', {
                    email: customerEmail,
                    error: customerError?.message || customerError,
                    details: customerError
                });
            }
        }
        else {
            console.log('[EMAIL] ⚠️ Khách hàng không có email, bỏ qua gửi email xác nhận');
        }
        // Gửi email cho tất cả admin và staff
        const adminSubject = await getEmailTemplate('adminNewBookingSubject');
        const adminContent = await getEmailTemplate('adminNewBookingContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const admins = await User_1.default.find({ role: { $in: ['admin', 'staff'] }, isActive: true }).select('email name role');
        const adminEmails = admins.map((u) => u.email).filter(Boolean);
        console.log('[EMAIL] Tìm thấy admin/staff:', {
            total: admins.length,
            emails: adminEmails,
            details: admins.map((u) => ({ email: u.email, name: u.name, role: u.role }))
        });
        if (adminEmails.length > 0) {
            let successCount = 0;
            let errorCount = 0;
            // Gửi từng email riêng lẻ với delay để tránh rate limit
            for (let i = 0; i < adminEmails.length; i++) {
                const adminEmail = adminEmails[i];
                // Thêm delay 500ms giữa các email để tránh rate limit
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                try {
                    console.log('[EMAIL] Đang gửi email cho admin/staff:', adminEmail, `(${i + 1}/${adminEmails.length})`);
                    const adminResult = await sendEmail(adminEmail, adminSubject || '新的諮詢預約', adminHtml);
                    successCount++;
                    console.log('[EMAIL] ✅ Email admin/staff đã gửi thành công:', {
                        email: adminEmail,
                        messageId: adminResult.messageId
                    });
                }
                catch (adminError) {
                    errorCount++;
                    console.error('[EMAIL] ❌ Lỗi gửi email cho admin/staff:', {
                        email: adminEmail,
                        error: adminError?.message || adminError,
                        details: adminError
                    });
                }
            }
            console.log('[EMAIL] 📊 Tổng kết gửi email admin/staff:', {
                total: adminEmails.length,
                success: successCount,
                failed: errorCount
            });
        }
        else {
            console.log('[EMAIL] ⚠️ Không tìm thấy admin/staff nào để gửi email');
        }
        console.log('[EMAIL] ✅ Hoàn tất quá trình gửi email xác nhận booking');
    }
    catch (error) {
        console.error('[EMAIL] ❌ Lỗi nghiêm trọng khi gửi email xác nhận:', {
            error: error?.message || error,
            stack: error?.stack,
            details: error
        });
    }
};
exports.sendBookingConfirmationEmail = sendBookingConfirmationEmail;
const sendBookingReminderEmail = async (booking) => {
    try {
        const currentTransporter = getTransporter();
        if (!isEmailConfigured() || !currentTransporter) {
            console.log('[EMAIL] 電子郵件未設定，略過發送提醒郵件。');
            return;
        }
        // Extract customer info từ customFields nếu không có trong trường trực tiếp
        const { email, name, phone } = await extractCustomerInfoFromCustomFields(booking);
        const customerEmail = email || booking.customerEmail;
        const customerName = name || booking.customerName;
        const customerPhone = phone || booking.customerPhone;
        console.log('[EMAIL] Bắt đầu gửi email reminder booking:', {
            bookingId: booking._id,
            customerEmail
        });
        const subject = await getEmailTemplate('bookingReminderSubject');
        const content = await getEmailTemplate('bookingReminderContent');
        const variables = {
            customerName,
            customerEmail,
            customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        if (customerEmail) {
            try {
                console.log('[EMAIL] Đang gửi email reminder cho khách hàng:', customerEmail);
                const customerResult = await sendEmail(customerEmail, subject, customerEmailHtml);
                console.log('[EMAIL] ✅ Email reminder khách hàng đã gửi thành công:', {
                    email: customerEmail,
                    messageId: customerResult.messageId
                });
            }
            catch (customerError) {
                console.error('[EMAIL] ❌ Lỗi gửi email reminder cho khách hàng:', {
                    email: customerEmail,
                    error: customerError?.message || customerError
                });
            }
        }
        // Email to all admins and staff as well
        const admins = await User_1.default.find({ role: { $in: ['admin', 'staff'] }, isActive: true }).select('email');
        const adminEmails = admins.map((u) => u.email).filter(Boolean);
        if (adminEmails.length > 0) {
            let successCount = 0;
            let errorCount = 0;
            for (let i = 0; i < adminEmails.length; i++) {
                const adminEmail = adminEmails[i];
                // Thêm delay 500ms giữa các email để tránh rate limit
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                try {
                    console.log('[EMAIL] Đang gửi email reminder cho admin/staff:', adminEmail, `(${i + 1}/${adminEmails.length})`);
                    const adminResult = await sendEmail(adminEmail, subject, customerEmailHtml);
                    successCount++;
                    console.log('[EMAIL] ✅ Email reminder admin/staff đã gửi thành công:', {
                        email: adminEmail,
                        messageId: adminResult.messageId
                    });
                }
                catch (adminError) {
                    errorCount++;
                    console.error('[EMAIL] ❌ Lỗi gửi email reminder cho admin/staff:', {
                        email: adminEmail,
                        error: adminError?.message || adminError
                    });
                }
            }
            console.log('[EMAIL] 📊 Tổng kết gửi email reminder admin/staff:', {
                total: adminEmails.length,
                success: successCount,
                failed: errorCount
            });
        }
    }
    catch (error) {
        console.error('[EMAIL] ❌ Lỗi nghiêm trọng khi gửi email reminder:', {
            error: error?.message || error,
            details: error
        });
    }
};
exports.sendBookingReminderEmail = sendBookingReminderEmail;
const sendBookingCancellationEmail = async (booking, cancellationReason, excludeAdminId) => {
    try {
        const currentTransporter = getTransporter();
        if (!isEmailConfigured() || !currentTransporter) {
            console.log('[EMAIL] 電子郵件未設定，略過發送取消郵件。');
            return;
        }
        // Extract customer info từ customFields nếu không có trong trường trực tiếp
        const { email, name, phone } = await extractCustomerInfoFromCustomFields(booking);
        const customerEmail = email || booking.customerEmail;
        const customerName = name || booking.customerName;
        const customerPhone = phone || booking.customerPhone;
        console.log('[EMAIL] Bắt đầu gửi email hủy booking:', {
            bookingId: booking._id,
            customerEmail,
            excludeAdminId
        });
        const subject = await getEmailTemplate('bookingCancellationSubject');
        const content = await getEmailTemplate('bookingCancellationContent');
        const variables = {
            customerName,
            customerEmail,
            customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot,
            cancellationReason: cancellationReason
        };
        const customerEmailHtml = replaceTemplateVariables(content, variables);
        if (customerEmail) {
            try {
                console.log('[EMAIL] Đang gửi email hủy cho khách hàng:', customerEmail);
                const customerResult = await sendEmail(customerEmail, subject, customerEmailHtml);
                console.log('[EMAIL] ✅ Email hủy khách hàng đã gửi thành công:', {
                    email: customerEmail,
                    messageId: customerResult.messageId
                });
            }
            catch (customerError) {
                console.error('[EMAIL] ❌ Lỗi gửi email hủy cho khách hàng:', {
                    email: customerEmail,
                    error: customerError?.message || customerError
                });
            }
        }
        // Email to all admins and staff (exclude actor if provided)
        const adminSubject = await getEmailTemplate('adminBookingCancelledSubject');
        const adminContent = await getEmailTemplate('adminBookingCancelledContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const adminQuery = { role: { $in: ['admin', 'staff'] }, isActive: true };
        const admins = await User_1.default.find(adminQuery).select('email _id');
        const adminEmails = admins
            .filter((u) => !excludeAdminId || String(u._id) !== String(excludeAdminId))
            .map((u) => u.email)
            .filter(Boolean);
        console.log('[EMAIL] Admin/staff nhận email hủy:', {
            total: admins.length,
            emails: adminEmails,
            excludeAdminId
        });
        if (adminEmails.length > 0) {
            let successCount = 0;
            let errorCount = 0;
            for (let i = 0; i < adminEmails.length; i++) {
                const adminEmail = adminEmails[i];
                // Thêm delay 500ms giữa các email để tránh rate limit
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                try {
                    console.log('[EMAIL] Đang gửi email hủy cho admin/staff:', adminEmail, `(${i + 1}/${adminEmails.length})`);
                    const adminResult = await sendEmail(adminEmail, adminSubject || '取消諮詢預約', adminHtml);
                    successCount++;
                    console.log('[EMAIL] ✅ Email hủy admin/staff đã gửi thành công:', {
                        email: adminEmail,
                        messageId: adminResult.messageId
                    });
                }
                catch (adminError) {
                    errorCount++;
                    console.error('[EMAIL] ❌ Lỗi gửi email hủy cho admin/staff:', {
                        email: adminEmail,
                        error: adminError?.message || adminError
                    });
                }
            }
            console.log('[EMAIL] 📊 Tổng kết gửi email hủy admin/staff:', {
                total: adminEmails.length,
                success: successCount,
                failed: errorCount
            });
        }
    }
    catch (error) {
        console.error('[EMAIL] ❌ Lỗi nghiêm trọng khi gửi email hủy:', {
            error: error?.message || error,
            details: error
        });
    }
};
exports.sendBookingCancellationEmail = sendBookingCancellationEmail;
const sendBookingConfirmedEmails = async (booking, actorAdminId) => {
    try {
        const currentTransporter = getTransporter();
        if (!isEmailConfigured() || !currentTransporter) {
            console.log('[EMAIL] 電子郵件未設定，略過核准後的確認郵件。');
            return;
        }
        // Extract customer info từ customFields nếu không có trong trường trực tiếp
        const { email, name, phone } = await extractCustomerInfoFromCustomFields(booking);
        const customerEmail = email || booking.customerEmail;
        const customerName = name || booking.customerName;
        const customerPhone = phone || booking.customerPhone;
        console.log('[EMAIL] Bắt đầu gửi email xác nhận booking:', {
            bookingId: booking._id,
            customerEmail,
            actorAdminId
        });
        const variables = {
            customerName,
            customerEmail,
            customerPhone,
            bookingDate: new Date(booking.bookingDate).toLocaleDateString('zh-TW'),
            timeSlot: booking.timeSlot
        };
        // Send to user
        const userSubject = (await getEmailTemplate('userBookingConfirmedSubject')) || (await getEmailTemplate('bookingConfirmationSubject'));
        const userContent = (await getEmailTemplate('userBookingConfirmedContent')) || (await getEmailTemplate('bookingConfirmationContent'));
        const userHtml = replaceTemplateVariables(userContent, variables);
        if (customerEmail) {
            try {
                console.log('[EMAIL] Đang gửi email xác nhận cho khách hàng:', customerEmail);
                const userResult = await sendEmail(customerEmail, userSubject, userHtml);
                console.log('[EMAIL] ✅ Email xác nhận khách hàng đã gửi thành công:', {
                    email: customerEmail,
                    messageId: userResult.messageId
                });
            }
            catch (userError) {
                console.error('[EMAIL] ❌ Lỗi gửi email xác nhận cho khách hàng:', {
                    email: customerEmail,
                    error: userError?.message || userError
                });
            }
        }
        // Notify other admins and staff
        const adminSubject = await getEmailTemplate('adminBookingConfirmedSubject');
        const adminContent = await getEmailTemplate('adminBookingConfirmedContent');
        const adminHtml = replaceTemplateVariables(adminContent, variables);
        const admins = await User_1.default.find({ role: { $in: ['admin', 'staff'] }, isActive: true }).select('email _id');
        const adminEmails = admins
            .filter((u) => !actorAdminId || String(u._id) !== String(actorAdminId))
            .map((u) => u.email)
            .filter(Boolean);
        console.log('[EMAIL] Admin/staff nhận email xác nhận:', {
            total: admins.length,
            emails: adminEmails,
            actorAdminId
        });
        if (adminEmails.length > 0) {
            let successCount = 0;
            let errorCount = 0;
            for (let i = 0; i < adminEmails.length; i++) {
                const adminEmail = adminEmails[i];
                // Thêm delay 500ms giữa các email để tránh rate limit
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
                try {
                    console.log('[EMAIL] Đang gửi email xác nhận cho admin/staff:', adminEmail, `(${i + 1}/${adminEmails.length})`);
                    const adminResult = await sendEmail(adminEmail, adminSubject || '預約已確認', adminHtml);
                    successCount++;
                    console.log('[EMAIL] ✅ Email xác nhận admin/staff đã gửi thành công:', {
                        email: adminEmail,
                        messageId: adminResult.messageId
                    });
                }
                catch (adminError) {
                    errorCount++;
                    console.error('[EMAIL] ❌ Lỗi gửi email xác nhận cho admin/staff:', {
                        email: adminEmail,
                        error: adminError?.message || adminError
                    });
                }
            }
            console.log('[EMAIL] 📊 Tổng kết gửi email xác nhận admin/staff:', {
                total: adminEmails.length,
                success: successCount,
                failed: errorCount
            });
        }
    }
    catch (error) {
        console.error('[EMAIL] ❌ Lỗi nghiêm trọng khi gửi email xác nhận:', {
            error: error?.message || error,
            details: error
        });
    }
};
exports.sendBookingConfirmedEmails = sendBookingConfirmedEmails;
//# sourceMappingURL=emailService.js.map