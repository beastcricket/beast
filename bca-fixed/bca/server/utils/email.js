const crypto = require('crypto');

// Check if email service is configured
const isEmailConfigured = () => {
  // Try Resend first
  if (process.env.RESEND_API_KEY) {
    return true;
  }
  // Fallback to other services
  return !!(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

// Create email transporter
let transporter = null;

// Try Resend first (works on Railway)
if (process.env.RESEND_API_KEY) {
  const { Resend } = require('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);

  transporter = {
    sendMail: async (mailOptions) => {
      try {
        console.log('📤 Sending email via Resend to:', mailOptions.to);
        const result = await resend.emails.send({
          from: mailOptions.from || 'noreply@beastcricket.com',
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        });

        if (result.error) {
          throw new Error(result.error.message);
        }

        console.log('✅ Email sent via Resend:', result.data.id);
        return { messageId: result.data.id };
      } catch (error) {
        console.error('❌ Resend error:', error.message);
        throw error;
      }
    },
    verify: (callback) => {
      console.log('✅ Resend email service ready');
      callback(null, true);
    }
  };

  console.log('✅ Email service configured with Resend');
} else {
  // Fallback: Use a simple HTTP-based email service
  transporter = {
    sendMail: async (mailOptions) => {
      try {
        console.log('📤 Sending email via HTTP service to:', mailOptions.to);

        // Use a free email API like Mailgun, SendGrid, or similar
        // For now, we'll use a simple implementation
        const nodemailer = require('nodemailer');

        // Create a test account (for development)
        const testAccount = await nodemailer.createTestAccount();

        const transporter2 = nodemailer.createTransport({
          host: 'smtp.ethereal.email',
          port: 587,
          secure: false,
          auth: {
            user: testAccount.user,
            pass: testAccount.pass,
          },
        });

        const result = await transporter2.sendMail({
          from: mailOptions.from || 'noreply@beastcricket.com',
          to: mailOptions.to,
          subject: mailOptions.subject,
          html: mailOptions.html,
        });

        console.log('✅ Email sent via Ethereal:', result.messageId);
        console.log('📧 Preview URL:', nodemailer.getTestMessageUrl(result));

        return { messageId: result.messageId };
      } catch (error) {
        console.error('❌ Email service error:', error.message);
        throw error;
      }
    },
    verify: (callback) => {
      console.log('✅ Email service ready');
      callback(null, true);
    }
  };
}

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  try {
    if (!isEmailConfigured()) {
      console.warn('⚠️ Email service not configured, skipping verification email');
      return { messageId: 'skipped' };
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

              <p>Thank you for registering with Beast Cricket Auction. Please verify your email address to activate your account.</p>

              <center>
                <a href="${verifyUrl}" class="button">Verify Email Address</a>
              </center>

              <p>Or copy and paste this link:</p>
              <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                ${verifyUrl}
              </p>

              <div class="warning">
                <strong>⏰ Important:</strong> This link expires in 24 hours.
              </div>

              <p>If you didn't create this account, please ignore this email.</p>
            </div>

            <div class="footer">
              <p>© 2026 Beast Cricket Auction. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: 'noreply@beastcricket.com',
      to: email,
      subject: '🏏 Verify Your Beast Cricket Account',
      html: html,
    });

    console.log('✅ Verification email sent to:', email);
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
      console.warn('⚠️ Email service not configured, skipping password reset email');
      return { messageId: 'skipped' };
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

              <p>Or copy and paste this link:</p>
              <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 12px;">
                ${resetUrl}
              </p>

              <div class="warning">
                <strong>⏰ Important:</strong> This link expires in 1 hour.
              </div>

              <p><strong>Didn't request this?</strong> If you didn't ask to reset your password, you can ignore this email.</p>
            </div>

            <div class="footer">
              <p>© 2026 Beast Cricket Auction. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    const result = await transporter.sendMail({
      from: 'noreply@beastcricket.com',
      to: email,
      subject: '🏏 Reset Your Beast Cricket Password',
      html: html,
    });

    console.log('✅ Password reset email sent to:', email);
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
