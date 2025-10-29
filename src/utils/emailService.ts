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
    `
  };
  
  return defaultTemplates[type as keyof typeof defaultTemplates] || '';
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

    // Gửi email cho admin (sử dụng EMAIL_TO từ .env)
    const adminEmailHtml = `
      <h2>Đặt lịch tư vấn mới</h2>
      <p>Có một đặt lịch tư vấn mới:</p>
      <ul>
        <li><strong>Tên khách hàng:</strong> ${booking.customerName}</li>
        <li><strong>Email:</strong> ${booking.customerEmail}</li>
        <li><strong>Số điện thoại:</strong> ${booking.customerPhone || 'Không có'}</li>
        <li><strong>Ngày:</strong> ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</li>
        <li><strong>Giờ:</strong> ${booking.timeSlot}</li>
        ${booking.notes ? `<li><strong>Ghi chú:</strong> ${booking.notes}</li>` : ''}
      </ul>
      <p>Vui lòng kiểm tra và xác nhận lịch hẹn này.</p>
    `;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: process.env.EMAIL_TO || 'vuduybachvp@gmail.com',
      subject: 'Đặt lịch tư vấn mới',
      html: adminEmailHtml
    });
    
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

    // Email to admin
    const adminEmailHtml = `
      <h2>Nhắc nhở lịch tư vấn</h2>
      <p>Lịch tư vấn với khách hàng ${booking.customerName} sẽ diễn ra vào ngày mai:</p>
      <ul>
        <li><strong>Tên khách hàng:</strong> ${booking.customerName}</li>
        <li><strong>Email:</strong> ${booking.customerEmail}</li>
        <li><strong>Ngày:</strong> ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</li>
        <li><strong>Giờ:</strong> ${booking.timeSlot}</li>
      </ul>
      <p>Vui lòng chuẩn bị cho buổi tư vấn này.</p>
    `;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: process.env.EMAIL_TO || 'vuduybachvp@gmail.com',
      subject: 'Nhắc nhở lịch tư vấn',
      html: adminEmailHtml
    });
  } catch (error) {
    console.error('Send booking reminder email error:', error);
  }
};

export const sendBookingCancellationEmail = async (booking: any, cancellationReason?: string) => {
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

    // Email to admin
    const adminEmailHtml = `
      <h2>Hủy lịch tư vấn</h2>
      <p>Lịch tư vấn đã bị hủy:</p>
      <ul>
        <li><strong>Tên khách hàng:</strong> ${booking.customerName}</li>
        <li><strong>Email:</strong> ${booking.customerEmail}</li>
        <li><strong>Ngày:</strong> ${new Date(booking.bookingDate).toLocaleDateString('vi-VN')}</li>
        <li><strong>Giờ:</strong> ${booking.timeSlot}</li>
        ${cancellationReason ? `<li><strong>Lý do hủy:</strong> ${cancellationReason}</li>` : ''}
      </ul>
    `;

    await resend.emails.send({
      from: process.env.EMAIL_FROM || 'onboarding@resend.dev',
      to: process.env.EMAIL_TO || 'vuduybachvp@gmail.com',
      subject: 'Hủy lịch tư vấn',
      html: adminEmailHtml
    });
  } catch (error) {
    console.error('Send booking cancellation email error:', error);
  }
};