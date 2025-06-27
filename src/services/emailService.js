import nodemailer from 'nodemailer';

// Create transporter
const createTransporter = () => {
  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT,
    secure: process.env.EMAIL_PORT === '465', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
};

/**
 * Send OTP email
 * @param {string} email - Recipient email
 * @param {string} otp - 6-digit OTP
 * @param {string} type - OTP type (email_verification, password_reset, etc.)
 * @returns {Promise<Object>} Email send result
 */
export const sendOTPEmail = async (email, otp, type = 'email_verification') => {
  const transporter = createTransporter();
  
  let subject, htmlContent;
  
  switch (type) {
    case 'email_verification':
      subject = 'Verify Your Email - BankLens';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; margin: 0;">BankLens</h1>
            <p style="color: #6b7280; margin: 10px 0;">Your Financial Consciousness</p>
          </div>
          
          <div style="background: #1f2937; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; text-align: center;">Verify Your Email</h2>
            <p style="color: #d1d5db; margin: 0 0 20px 0; text-align: center;">
              Use this verification code to complete your account setup:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #14b8a6, #06b6d4);
                color: white;
                font-size: 32px;
                font-weight: bold;
                padding: 20px 40px;
                border-radius: 12px;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              ">
                ${otp}
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 BankLens. Financial consciousness for the future.</p>
          </div>
        </div>
      `;
      break;
      
    case 'password_reset':
      subject = 'Reset Your Passcode - BankLens';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; margin: 0;">BankLens</h1>
            <p style="color: #6b7280; margin: 10px 0;">Your Financial Consciousness</p>
          </div>
          
          <div style="background: #1f2937; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; text-align: center;">Reset Your Passcode</h2>
            <p style="color: #d1d5db; margin: 0 0 20px 0; text-align: center;">
              Use this verification code to reset your passcode:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #ef4444, #f97316);
                color: white;
                font-size: 32px;
                font-weight: bold;
                padding: 20px 40px;
                border-radius: 12px;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              ">
                ${otp}
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
              This code will expire in 10 minutes. If you didn't request this code, please ignore this email.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 BankLens. Financial consciousness for the future.</p>
          </div>
        </div>
      `;
      break;
      
    default:
      subject = 'Verification Code - BankLens';
      htmlContent = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #14b8a6; margin: 0;">BankLens</h1>
            <p style="color: #6b7280; margin: 10px 0;">Your Financial Consciousness</p>
          </div>
          
          <div style="background: #1f2937; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
            <h2 style="color: #ffffff; margin: 0 0 20px 0; text-align: center;">Verification Code</h2>
            <p style="color: #d1d5db; margin: 0 0 20px 0; text-align: center;">
              Your verification code is:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <div style="
                display: inline-block;
                background: linear-gradient(135deg, #14b8a6, #06b6d4);
                color: white;
                font-size: 32px;
                font-weight: bold;
                padding: 20px 40px;
                border-radius: 12px;
                letter-spacing: 8px;
                font-family: 'Courier New', monospace;
              ">
                ${otp}
              </div>
            </div>
            
            <p style="color: #9ca3af; font-size: 14px; text-align: center; margin: 0;">
              This code will expire in 10 minutes.
            </p>
          </div>
          
          <div style="text-align: center; color: #6b7280; font-size: 12px;">
            <p>© 2025 BankLens. Financial consciousness for the future.</p>
          </div>
        </div>
      `;
  }

  const mailOptions = {
    from: process.env.EMAIL_FROM || 'BankLens <noreply@banklens.com>',
    to: email,
    subject: subject,
    html: htmlContent,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ OTP email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send OTP email to ${email}:`, error);
    throw new Error('Failed to send verification email');
  }
};

/**
 * Send welcome email
 * @param {string} email - Recipient email
 * @param {string} firstName - User's first name
 * @returns {Promise<Object>} Email send result
 */
export const sendWelcomeEmail = async (email, firstName = 'there') => {
  const transporter = createTransporter();
  
  const mailOptions = {
    from: process.env.EMAIL_FROM || 'BankLens <noreply@banklens.com>',
    to: email,
    subject: 'Welcome to BankLens! 🎉',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #14b8a6; margin: 0;">BankLens</h1>
          <p style="color: #6b7280; margin: 10px 0;">Your Financial Consciousness</p>
        </div>
        
        <div style="background: #1f2937; border-radius: 12px; padding: 30px; margin-bottom: 20px;">
          <h2 style="color: #ffffff; margin: 0 0 20px 0; text-align: center;">Welcome to BankLens! 🎉</h2>
          <p style="color: #d1d5db; margin: 0 0 20px 0;">
            Hi ${firstName},
          </p>
          <p style="color: #d1d5db; margin: 0 0 20px 0;">
            Welcome to BankLens! Your account has been successfully created and your financial consciousness is now activated.
          </p>
          
          <div style="background: #374151; border-radius: 8px; padding: 20px; margin: 20px 0;">
            <h3 style="color: #14b8a6; margin: 0 0 15px 0;">What's Next?</h3>
            <ul style="color: #d1d5db; margin: 0; padding-left: 20px;">
              <li>Connect your Nigerian bank accounts</li>
              <li>Start experiencing intelligent financial insights</li>
              <li>Meet NairaWise, your AI financial assistant</li>
              <li>Track your spending patterns and get personalized recommendations</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/dashboard" 
               style="
                 display: inline-block;
                 background: linear-gradient(135deg, #14b8a6, #06b6d4);
                 color: white;
                 text-decoration: none;
                 padding: 15px 30px;
                 border-radius: 8px;
                 font-weight: bold;
                 font-size: 16px;
               ">
              Start Your Journey
            </a>
          </div>
        </div>
        
        <div style="text-align: center; color: #6b7280; font-size: 12px;">
          <p>© 2025 BankLens. Financial consciousness for the future.</p>
        </div>
      </div>
    `,
  };

  try {
    const result = await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${email}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error(`❌ Failed to send welcome email to ${email}:`, error);
    throw new Error('Failed to send welcome email');
  }
}; 