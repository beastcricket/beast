const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Check if email service is configured
const isEmailConfigured = () => {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return !!(user && pass && user.length > 0 && pass.length > 0);
};

// Create transporter with Gmail SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
    pass: process.env.EMAIL_PASS || 'gdgzafbzoyjmgrxx',
  },
  tls: { rejectUnauthorized: false },
});

// Verify transporter on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service verification failed:', error.message);
  } else {
    console.log('✅ Email service ready - connected to Gmail SMTP');
    console.log('📧 Sending emails from:', process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com');
  }
});

// Branded email HTML wrapper
const wrap = (title, body) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#04040a;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0">
<tr><td align="center" style="padding:40px 20px;">
<table width="580" cellpadding="0" cellspacing="0" style="background:#0f172a;border-radius:16px;overflow:hidden;border:1px solid rgba(245,158,11,0.25);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#f59e0b,#d97706);padding:32px;text-align:center;">
    <h1 style="margin:0;color:#000;font-size:24px;font-weight:900;letter-spacing:-0.5px;">🏏 BEAST CRICKET AUCTION</h1>
    <p style="margin:6px 0 0;color:rgba(0,0,0,0.6);font-size:13px;">Premium IPL-Style Auction Platform</p>
  </td></tr>

  <!-- Body -->
  <tr><td style="padding:36px 32px;">
    <h2 style="color:#f59e0b;font-size:20px;margin:0 0 16px;">${title}</h2>
    ${body}
  </td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.08);text-align:center;">
    <p style="color:#475569;font-size:12px;margin:0;">© 2026 Beast Cricket Auction. This is an automated email — please do not reply.</p>
  </td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  try {
    if (!isEmailConfigured()) {
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const url = `${baseUrl}/verify-email?token=${token}`;

    const body = `
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hello <strong style="color:#f59e0b;">${name}</strong>,
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
        Welcome to Beast Cricket Auction! Click the button below to verify your email and activate your account.
      </p>
      <p style="text-align:center;margin:0 0 24px;">
        <a href="${url}"
          style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);
                 color:#000;padding:14px 36px;border-radius:10px;
                 text-decoration:none;font-weight:700;font-size:16px;">
          ✅ Verify My Email
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">
        If the button doesn't work, copy and paste this link into your browser:
      </p>
      <p style="color:#f59e0b;font-size:12px;word-break:break-all;margin:0 0 16px;">${url}</p>
      <p style="color:#475569;font-size:12px;margin:0;">⏱ This link expires in <strong>24 hours</strong>.</p>
    `;

    const result = await transporter.sendMail({
      from: `"Beast Cricket Auction" <${process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com'}>`,
      to: email,
      subject: '🏏 Verify Your Beast Cricket Account',
      html: wrap('Verify Your Email', body),
    });

    console.log('✅ Verification email sent successfully to:', email);
    console.log('📧 Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Failed to send verification email:', error.message);
    throw error;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, token) => {
  try {
    if (!isEmailConfigured()) {
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';
    const url = `${baseUrl}/reset-password?token=${token}`;

    const body = `
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 16px;">
        Hello <strong style="color:#f59e0b;">${name}</strong>,
      </p>
      <p style="color:#94a3b8;font-size:15px;line-height:1.7;margin:0 0 24px;">
        We received a request to reset your password. Click below to create a new one.
        If you didn't request this, you can safely ignore this email.
      </p>
      <p style="text-align:center;margin:0 0 24px;">
        <a href="${url}"
          style="display:inline-block;background:linear-gradient(135deg,#f59e0b,#d97706);
                 color:#000;padding:14px 36px;border-radius:10px;
                 text-decoration:none;font-weight:700;font-size:16px;">
          🔐 Reset My Password
        </a>
      </p>
      <p style="color:#64748b;font-size:13px;margin:0 0 8px;">Link not working? Copy and paste:</p>
      <p style="color:#f59e0b;font-size:12px;word-break:break-all;margin:0 0 16px;">${url}</p>
      <p style="color:#475569;font-size:12px;margin:0;">⏱ This link expires in <strong>1 hour</strong>.</p>
    `;

    const result = await transporter.sendMail({
      from: `"Beast Cricket Auction" <${process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com'}>`,
      to: email,
      subject: '🏏 Reset Your Beast Cricket Password',
      html: wrap('Reset Your Password', body),
    });

    console.log('✅ Password reset email sent successfully to:', email);
    console.log('📧 Message ID:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw error;
  }
};

module.exports = { isEmailConfigured, sendVerificationEmail, sendPasswordResetEmail, transporter };
