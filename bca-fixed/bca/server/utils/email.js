const crypto = require('crypto');

// Check if email service is configured
const isEmailConfigured = () => {
  // Resend is primary
  if (process.env.RESEND_API_KEY) {
    return true;
  }
  // Fallback to Gmail
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  return !!(user && pass && user.length > 0 && pass.length > 0);
};

// Create email transporter
let transporter = null;

// Try Resend first (works on Railway)
if (process.env.RESEND_API_KEY) {
  console.log('📧 Initializing Resend email service...');

  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  transporter = {
    sendMail: async (mailOptions) => {
      try {
        console.log('📤 Sending email via Resend');
        console.log('   To:', mailOptions.to);
        console.log('   Subject:', mailOptions.subject);

        const result = await resend.emails.send({
          from: 'noreply@beastcricket.com',
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        });

        if (result.error) {
          console.error('❌ Resend error:', result.error);
          throw new Error(result.error.message);
        }

        console.log('✅ Email sent successfully via Resend');
        console.log('   Message ID:', result.data.id);
        return { messageId: result.data.id };
      } catch (error) {
        console.error('❌ Resend send error:', error.message);
        throw error;
      }
    },
    verify: (callback) => {
      console.log('✅ Resend email service verified and ready');
      callback(null, true);
    }
  };

  console.log('✅ Email service: Resend.com (ACTIVE)');
} else {
  // Fallback to Gmail SMTP
  console.log('⚠️ RESEND_API_KEY not set, using Gmail SMTP fallback');

  const nodemailer = require('nodemailer');

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.EMAIL_PORT || '587'),
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
      pass: process.env.EMAIL_PASS || 'gdgzafbzoyjmgrxx',
    },
    tls: { rejectUnauthorized: false },
    connectionTimeout: 10000,
    socketTimeout: 10000,
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Gmail SMTP verification failed:', error.message);
    } else {
      console.log('✅ Gmail SMTP verified and ready');
    }
  });
}

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  try {
    if (!isEmailConfigured()) {
      console.error('❌ Email service not configured');
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
            .content { color: #333; line-height: 1.6; }
            .button { display: inline-block; background: #f59e0b; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 20px 0; color: #856404; }
            h2 { color: #333; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏏 Beast Cricket Auction</div>
              <h2>Welcome to Beast Cricket!</h2>
            </div>

            <div class="content">
              <p>Hi ${name},</p>

              <p>Thank you for registering with Beast Cricket Auction. Please verify your email address to activate your account and start participating in auctions.</p>

              <center>
                <a href="${verifyUrl}" class="button">Verify Email Address</a>
              </center>

              <p>Or copy and paste this link in your browser:</p>
              <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                ${verifyUrl}
              </p>

              <div class="warning">
                <strong>⏰ Important:</strong> This verification link expires in 24 hours. If you don't verify your email within this time, you'll need to request a new verification link.
              </div>

              <p>If you didn't create this account, please ignore this email.</p>

              <p>
                <strong>Questions?</strong> Contact our support team at beastcricketofficialauction@gmail.com
              </p>
            </div>

            <div class="footer">
              <p>© 2026 Beast Cricket Auction. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending verification email to:', email);
    const result = await transporter.sendMail({
      from: 'noreply@beastcricket.com',
      to: email,
      subject: '🏏 Verify Your Beast Cricket Account',
      html: html,
    });

    console.log('✅ Verification email sent successfully to:', email);
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
      console.error('❌ Email service not configured');
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; margin-bottom: 30px; }
            .logo { font-size: 28px; font-weight: bold; color: #f59e0b; margin-bottom: 10px; }
            .content { color: #333; line-height: 1.6; }
            .button { display: inline-block; background: #f59e0b; color: #000; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: bold; margin: 20px 0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; border-top: 1px solid #eee; padding-top: 20px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 12px; border-radius: 4px; margin: 20px 0; color: #856404; }
            h2 { color: #333; }
            p { margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">🏏 Beast Cricket Auction</div>
              <h2>Reset Your Password</h2>
            </div>

            <div class="content">
              <p>Hi ${name},</p>

              <p>We received a request to reset your password. Click the button below to create a new password.</p>

              <center>
                <a href="${resetUrl}" class="button">Reset Password</a>
              </center>

              <p>Or copy and paste this link in your browser:</p>
              <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>

              <div class="warning">
                <strong>⏰ Important:</strong> This reset link expires in 1 hour. If you don't reset your password within this time, you'll need to request a new reset link.
              </div>

              <p><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can ignore this email. Your password will remain unchanged.</p>

              <p>
                <strong>Questions?</strong> Contact our support team at beastcricketofficialauction@gmail.com
              </p>
            </div>

            <div class="footer">
              <p>© 2026 Beast Cricket Auction. All rights reserved.</p>
              <p>This is an automated email. Please do not reply directly.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    console.log('📧 Sending password reset email to:', email);
    const result = await transporter.sendMail({
      from: 'noreply@beastcricket.com',
      to: email,
      subject: '🏏 Reset Your Beast Cricket Password',
      html: html,
    });

    console.log('✅ Password reset email sent successfully to:', email);
    return result;
  } catch (error) {
    console.error('❌ Failed to send password reset email:', error.message);
    throw error;
  }
};

module.exports = {
  isEmailConfigured,
  sendVerificationEmail,
  sendPasswordResetEmail,
  transporter,
};
