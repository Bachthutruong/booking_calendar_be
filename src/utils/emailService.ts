import { Resend } from 'resend';
import Booking from '../models/Booking';
import User from '../models/User';
import SystemConfig from '../models/SystemConfig';

// Kiểm tra cấu hình email
const isEmailConfigured = () => {
  return process.env.RESEND_API_KEY || 're_QqaMiRDg_97ff4nmbPHUFRrC2ghLAoU5R';
};

const resend = isEmailConfigured() ? new Resend(process.env.RESEND_API_KEY || 're_QqaMiRDg_97ff4nmbPHUFRrC2ghLAoU5R') : null;

const getEmailTemplate = async (type: string) => {
  // Default templates - không cần MongoDB
  const defaultTemplates = {
    bookingConfirmationSubject: 'Xác nhận đặt lịch tư vấn',
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
    bookingReminderSubject: 'Nhắc nhở lịch tư vấn',
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
    bookingCancellationSubject: 'Hủy lịch tư vấn',
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
   `,
    // Admin defaults
    adminNewBookingSubject: 'Đặt lịch mới cần xác nhận',
    adminNewBookingContent: `
      <h2>Đặt lịch tư vấn mới</h2>
      <p>Có một đặt lịch tư vấn mới cần được xác nhận:</p>
      <ul>
        <li><strong>Tên khách hàng:</strong> {{customerName}}</li>
        <li><strong>Email:</strong> {{customerEmail}}</li>
        {{#if customerPhone}}<li><strong>Số điện thoại:</strong> {{customerPhone}}</li>{{/if}}
        <li><strong>Ngày:</strong> {{bookingDate}}</li>
        <li><strong>Giờ:</strong> {{timeSlot}}</li>
        {{#if notes}}<li><strong>Ghi chú:</strong> {{notes}}</li>{{/if}}
      </ul>
    `,
    adminBookingConfirmedSubject: 'Lịch đã được xác nhận',
    adminBookingConfirmedContent: `
      <h2>Lịch tư vấn đã được xác nhận</h2>
      <p>Lịch với khách hàng {{customerName}} đã được xác nhận.</p>
      <ul>
        <li><strong>Ngày:</strong> {{bookingDate}}</li>
        <li><strong>Giờ:</strong> {{timeSlot}}</li>
      </ul>
    `,
    adminBookingCancelledSubject: 'Lịch đã bị hủy',
    adminBookingCancelledContent: `
      <h2>Lịch tư vấn đã bị hủy</h2>
      <p>Lịch với khách hàng {{customerName}} đã bị hủy.</p>
      <ul>
        <li><strong>Ngày:</strong> {{bookingDate}}</li>
        <li><strong>Giờ:</strong> {{timeSlot}}</li>
        {{#if cancellationReason}}<li><strong>Lý do hủy:</strong> {{cancellationReason}}</li>{{/if}}
      </ul>
    `,
    userBookingConfirmedSubject: 'Lịch của bạn đã được xác nhận',
    userBookingConfirmedContent: `
      <h2>Lịch tư vấn đã được xác nhận</h2>
      <p>Xin chào {{customerName}},</p>
      <p>Lịch tư vấn của bạn đã được xác nhận:</p>
      <ul>
        <li><strong>Ngày:</strong> {{bookingDate}}</li>
        <li><strong>Giờ:</strong> {{timeSlot}}</li>
      </ul>
      <p>Hẹn gặp bạn!</p>
    `
  } as Record<string, string>;

  // Try load from DB config overrides
  try {
    const cfg = await SystemConfig.findOne({ type: 'email_template', isActive: true });
    const fromDb = (cfg?.config || {}) as Record<string, string>;
    return (fromDb[type] as string) || (defaultTemplates[type] as string) || '';
  } catch {
    return (defaultTemplates[type] as string) || '';
  }
};

const replaceTemplateVariables = (template: string, variables: Record<string, any>) => {
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

export const sendBookingConfirmationEmail = async (booking: any) => {
  try {
    if (!isEmailConfigured() || !resend) {
      console.log('Email không được cấu hình. Bỏ qua gửi email xác nhận.');
      return;
    }

    const subject = await getEmailTemplate('bookingConfirmationSubject');
    const content = await getEmailTemplate('bookingConfirmationContent');
    
    const variables = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      bookingDate: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
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
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    const adminEmails = admins.map((u: any) => u.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: adminEmails,
        subject: adminSubject || 'Đặt lịch tư vấn mới',
        html: adminHtml
      });
    }
    
    console.log('Email xác nhận đã được gửi thành công qua Resend');
  } catch (error) {
    console.error('Send booking confirmation email error:', error);
  }
};

export const sendBookingReminderEmail = async (booking: any) => {
  try {
    if (!isEmailConfigured() || !resend) {
      console.log('Email không được cấu hình. Bỏ qua gửi email nhắc nhở.');
      return;
    }

    const subject = await getEmailTemplate('bookingReminderSubject');
    const content = await getEmailTemplate('bookingReminderContent');
    
    const variables = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      bookingDate: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
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
    const admins = await User.find({ role: 'admin', isActive: true }).select('email');
    const adminEmails = admins.map((u: any) => u.email).filter(Boolean);
    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: adminEmails,
        subject: await getEmailTemplate('bookingReminderSubject'),
        html: customerEmailHtml
      });
    }
  } catch (error) {
    console.error('Send booking reminder email error:', error);
  }
};

export const sendBookingCancellationEmail = async (booking: any, cancellationReason?: string, excludeAdminId?: string) => {
  try {
    if (!isEmailConfigured() || !resend) {
      console.log('Email không được cấu hình. Bỏ qua gửi email hủy lịch.');
      return;
    }

    const subject = await getEmailTemplate('bookingCancellationSubject');
    const content = await getEmailTemplate('bookingCancellationContent');
    
    const variables = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      bookingDate: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
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
    const adminQuery: any = { role: 'admin', isActive: true };
    const admins = await User.find(adminQuery).select('email _id');
    const adminEmails = admins
      .filter((u: any) => !excludeAdminId || String(u._id) !== String(excludeAdminId))
      .map((u: any) => u.email)
      .filter(Boolean);
    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: adminEmails,
        subject: adminSubject || 'Hủy lịch tư vấn',
        html: adminHtml
      });
    }
  } catch (error) {
    console.error('Send booking cancellation email error:', error);
  }
};

export const sendBookingConfirmedEmails = async (booking: any, actorAdminId?: string) => {
  try {
    if (!isEmailConfigured() || !resend) {
      console.log('Email không được cấu hình. Bỏ qua gửi email xác nhận sau khi duyệt.');
      return;
    }

    const variables = {
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      bookingDate: new Date(booking.bookingDate).toLocaleDateString('vi-VN'),
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
    const admins = await User.find({ role: 'admin', isActive: true }).select('email _id');
    const adminEmails = admins
      .filter((u: any) => !actorAdminId || String(u._id) !== String(actorAdminId))
      .map((u: any) => u.email)
      .filter(Boolean);
    if (adminEmails.length > 0) {
      await resend.emails.send({
        from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
        to: adminEmails,
        subject: adminSubject || 'Lịch đã được xác nhận',
        html: adminHtml
      });
    }
  } catch (error) {
    console.error('Send booking confirmed emails error:', error);
  }
};