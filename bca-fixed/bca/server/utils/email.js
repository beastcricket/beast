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
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
    pass: process.env.EMAIL_PASS || 'gdgzafbzoyjmgrxx',
  },
});

// Verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Email service verification failed:', error.message);
  } else {
    console.log('✅ Email service ready - Gmail SMTP connected');
    console.log('📧 Sending emails from:', process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com');
  }
});

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
    
    console.log('📧 Sending verification email to:', email);
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
      to: email,
      subject: '🏏 Verify Your Beast Cricket Account',
      html: html,
    });

    console.log('✅ Verification email sent to:', email);
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
    
    console.log('📧 Sending password reset email to:', email);
    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
      to: email,
      subject: '🏏 Reset Your Beast Cricket Password',
      html: html,
    });

    console.log('✅ Password reset email sent to:', email);
    console.log('📧 Message ID:', result.messageId);
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
