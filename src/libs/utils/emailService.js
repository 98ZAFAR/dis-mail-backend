const nodemailer = require("nodemailer");

/**
 * Email Service
 * Handles sending emails including OTP verification
 */

// Create transporter
const createTransporter = () => {
  // For development: Use ethereal email or your SMTP service
  // For production: Use actual SMTP service (Gmail, SendGrid, AWS SES, etc.)
  
  const config = {
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  };

  return nodemailer.createTransport(config);
};

/**
 * Send OTP email for password change verification
 * @param {string} email - Recipient email address
 * @param {string} otp - 6-digit OTP code
 * @param {string} userName - User's full name
 */
const sendPasswordChangeOTP = async (email, otp, userName) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME || "Disposable Mail"}" <${
        process.env.SMTP_FROM_MAIL || process.env.SMTP_USER
      }>`,
      to: email,
      subject: "Password Change Verification - OTP Code",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #667eea; margin: 20px 0; border-radius: 8px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .footer { text-align: center; margin-top: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Password Change Verification</h1>
            </div>
            <div class="content">
              <p>Hello <strong>${userName}</strong>,</p>
              <p>You have requested to change your password. Please use the following One-Time Password (OTP) to verify your identity:</p>
              
              <div class="otp-box">${otp}</div>
              
              <p><strong>This OTP is valid for 10 minutes.</strong></p>
              
              <div class="warning">
                <strong>⚠️ Security Notice:</strong><br>
                If you did not request a password change, please ignore this email and ensure your account is secure. Consider changing your password immediately if you suspect unauthorized access.
              </div>
              
              <p>For your security:</p>
              <ul>
                <li>Never share this OTP with anyone</li>
                <li>Our team will never ask for your OTP</li>
                <li>This OTP can only be used once</li>
              </ul>
              
              <p>Best regards,<br><strong>Disposable Mail Team</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Hello ${userName},

You have requested to change your password. Please use the following One-Time Password (OTP) to verify your identity:

OTP: ${otp}

This OTP is valid for 10 minutes.

⚠️ Security Notice:
If you did not request a password change, please ignore this email and ensure your account is secure.

For your security:
- Never share this OTP with anyone
- Our team will never ask for your OTP
- This OTP can only be used once

Best regards,
Disposable Mail Team
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[OTP Email Sent] ${email} - Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending OTP email:", error);
    return { success: false, error: error.message };
  }
};

/**
 * Send test email (for testing configuration)
 */
const sendTestEmail = async (email) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER,
      to: email,
      subject: "Test Email - SMTP Configuration",
      html: "<h1>SMTP Configuration Test</h1><p>If you receive this email, your SMTP configuration is working correctly!</p>",
    };

    const info = await transporter.sendMail(mailOptions);
    console.log(`[Test Email Sent] ${email} - Message ID: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending test email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendPasswordChangeOTP,
  sendTestEmail,
};
