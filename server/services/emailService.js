const nodemailer = require('nodemailer');

// Strip spaces from Gmail App Password if copy-pasted directly as "xxxx xxxx xxxx xxxx"
const smtpPassClean = process.env.SMTP_PASS ? process.env.SMTP_PASS.replace(/\s+/g, '') : '';

// Create a reusable transporter using Gmail SMTP
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,
    pass: smtpPassClean,
  },
});

// Verify SMTP connection configuration on startup
transporter.verify((error, success) => {
  if (error) {
    console.error('❌ Gmail SMTP Connection/Authentication Failed:');
    console.error(error);
  } else {
    console.log('✅ Gmail SMTP Connection is ready and verified.');
  }
});

const FROM = process.env.SMTP_FROM || `"ShowCase" <${process.env.SMTP_USER}>`;

const EmailService = {
  /**
   * Send the email-verification link to a newly registered user.
   */
  async sendVerificationEmail(toEmail, username, verifyLink) {
    const mailOptions = {
      from: FROM,
      to: toEmail,
      subject: '✅ Verify your ShowCase account',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #3b82f6, #8b5cf6); padding: 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 1.6rem; font-weight: 700; color: #ffffff;">ShowCase</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 0.95rem;">Career Portfolio Builder</p>
          </div>

          <div style="padding: 36px 32px;">
            <h2 style="margin: 0 0 12px; font-size: 1.3rem;">Hey ${username}, welcome aboard! 👋</h2>
            <p style="color: #94a3b8; line-height: 1.7; margin: 0 0 28px;">
              Thanks for signing up. Click the button below to verify your email address and activate your account.
            </p>

            <div style="text-align: center; margin: 0 0 28px;">
              <a href="${verifyLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: #ffffff;
                        text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600;
                        font-size: 1rem; letter-spacing: 0.02em;">
                Verify My Email
              </a>
            </div>

            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.6; margin: 0;">
              Or copy and paste this link into your browser:<br/>
              <a href="${verifyLink}" style="color: #818cf8; word-break: break-all;">${verifyLink}</a>
            </p>
          </div>

          <div style="background: #1e293b; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; color: #475569; font-size: 0.8rem;">
              This link expires in 24 hours. If you didn't create an account, you can safely ignore this email.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  },

  /**
   * Send a password-reset link.
   */
  async sendPasswordResetEmail(toEmail, username, resetLink) {
    const mailOptions = {
      from: FROM,
      to: toEmail,
      subject: '🔑 Reset your ShowCase password',
      html: `
        <div style="font-family: Inter, Arial, sans-serif; max-width: 560px; margin: 0 auto; background: #0f172a; color: #f8fafc; border-radius: 12px; overflow: hidden;">
          <div style="background: linear-gradient(135deg, #ef4444, #b91c1c); padding: 32px; text-align: center;">
            <h1 style="margin: 0; font-size: 1.6rem; font-weight: 700; color: #ffffff;">ShowCase</h1>
            <p style="margin: 8px 0 0; color: rgba(255,255,255,0.85); font-size: 0.95rem;">Password Reset Request</p>
          </div>

          <div style="padding: 36px 32px;">
            <h2 style="margin: 0 0 12px; font-size: 1.3rem;">Hi ${username},</h2>
            <p style="color: #94a3b8; line-height: 1.7; margin: 0 0 28px;">
              We received a request to reset your password. Click the button below — the link is valid for <strong>30 minutes</strong>.
            </p>

            <div style="text-align: center; margin: 0 0 28px;">
              <a href="${resetLink}"
                 style="display: inline-block; background: linear-gradient(135deg, #ef4444, #b91c1c); color: #ffffff;
                        text-decoration: none; padding: 14px 36px; border-radius: 8px; font-weight: 600;
                        font-size: 1rem; letter-spacing: 0.02em;">
                Reset My Password
              </a>
            </div>

            <p style="color: #64748b; font-size: 0.85rem; line-height: 1.6; margin: 0;">
              Or copy and paste this link:<br/>
              <a href="${resetLink}" style="color: #f87171; word-break: break-all;">${resetLink}</a>
            </p>
          </div>

          <div style="background: #1e293b; padding: 20px 32px; text-align: center;">
            <p style="margin: 0; color: #475569; font-size: 0.8rem;">
              If you didn't request a password reset, please ignore this email — your password won't change.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
  },
};

module.exports = EmailService;
