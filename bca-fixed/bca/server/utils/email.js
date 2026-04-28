const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Check if email service is configured
const isEmailConfigured = () => {
  // Try Resend first
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
        console.log('📤 Sending email via Resend to:', mailOptions.to);
        
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
  
  console.log('✅ Email service: Resend.com');
} else {
  // Fallback to Gmail SMTP
  console.log('⚠️ RESEND_API_KEY not set, using Gmail SMTP');
  
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER || 'beastcricketofficialauction@gmail.com',
      pass: process.env.EMAIL_PASS || 'gdgzafbzoyjmgrxx',
    },
    tls: { rejectUnauthorized: false },
  });

  transporter.verify((error, success) => {
    if (error) {
      console.error('❌ Gmail SMTP error:', error.message);
    } else {
      console.log('✅ Gmail SMTP ready');
    }
  });
}

// Send verification email
const sendVerificationEmail = async (email, name, token) => {
  try {
    if (!isEmailConfigured()) {
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const verifyUrl = `${baseUrl}/verify-email?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
            <h2 style="color: #f59e0b; text-align: center;">🏏 Beast Cricket Auction</h2>
            <p>Hi ${name},</p>
            <p>Thank you for registering. Please verify your email address:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verifyUrl}" style="background: #f59e0b; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Verify Email</a>
            </div>
            <p>Or copy this link: ${verifyUrl}</p>
            <p style="color: #999; font-size: 12px;">This link expires in 24 hours.</p>
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
      throw new Error('Email service not configured');
    }

    const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
            <h2 style="color: #f59e0b; text-align: center;">🏏 Beast Cricket Auction</h2>
            <p>Hi ${name},</p>
            <p>We received a request to reset your password. Click below to create a new password:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${resetUrl}" style="background: #f59e0b; color: #000; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold;">Reset Password</a>
            </div>
            <p>Or copy this link: ${resetUrl}</p>
            <p style="color: #999; font-size: 12px;">This link expires in 1 hour.</p>
            <p style="color: #999; font-size: 12px;">If you didn't request this, ignore this email.</p>
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
