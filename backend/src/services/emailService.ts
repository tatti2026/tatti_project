import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

interface SendResetEmailOptions {
  to: string;
  resetUrl: string;
  userName?: string;
  role?: string;
}

export interface SendResetEmailResult {
  delivered: boolean;
  error?: string;
  previewUrl?: string;
  devResetUrl?: string;
}

let transporter: Transporter | null = null;
let etherealTransporter: Transporter | null = null;
let etherealAccountInfo: any = null;

/**
 * Returns true if the minimum SMTP environment variables are configured.
 */
export function isEmailConfigured(): boolean {
  if (process.env.RESEND_API_KEY) return true;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const service = process.env.SMTP_SERVICE;

  if (service && user && pass) return true;
  if (host && user && pass) return true;
  return false;
}

/**
 * Gets or creates an Ethereal test transporter for local development.
 */
async function getOrCreateEtherealTransporter(): Promise<Transporter | null> {
  if (etherealTransporter) return etherealTransporter;

  try {
    const testAccount = await nodemailer.createTestAccount();
    etherealAccountInfo = testAccount;
    etherealTransporter = nodemailer.createTransport({
      host: testAccount.smtp.host,
      port: testAccount.smtp.port,
      secure: testAccount.smtp.secure,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
    console.log(`[EMAIL SERVICE] Initialized Ethereal test mailbox (${testAccount.user}) for local development.`);
    return etherealTransporter;
  } catch (err: any) {
    console.warn('[EMAIL SERVICE] Could not create Ethereal test account:', err.message);
    return null;
  }
}

/**
 * Verifies connection and credentials with the configured email provider.
 */
export async function verifyEmailConfiguration(): Promise<{ ok: boolean; provider: string; message: string }> {
  const mailTransporter = getTransporter();
  const provider = process.env.RESEND_API_KEY
    ? 'resend'
    : process.env.SMTP_SERVICE || (process.env.SMTP_HOST ? 'smtp' : 'none');

  if (!mailTransporter) {
    if (process.env.NODE_ENV !== 'production') {
      return {
        ok: true,
        provider: 'ethereal-dev',
        message: 'Development mode active: local test email capture is enabled.',
      };
    }
    return {
      ok: false,
      provider,
      message: 'Email provider is not configured. Please set SMTP credentials or RESEND_API_KEY.',
    };
  }

  try {
    await mailTransporter.verify();
    return {
      ok: true,
      provider,
      message: 'Email service connection verified successfully.',
    };
  } catch (err: any) {
    return {
      ok: false,
      provider,
      message: `Email provider verification failed: ${err.message}`,
    };
  }
}

/**
 * Initializes and caches the nodemailer transporter.
 */
function getTransporter(): Transporter | null {
  if (transporter) return transporter;

  if (!isEmailConfigured()) {
    return null;
  }

  if (process.env.RESEND_API_KEY) {
    transporter = nodemailer.createTransport({
      host: 'smtp.resend.com',
      port: 465,
      secure: true,
      auth: {
        user: 'resend',
        pass: process.env.RESEND_API_KEY,
      },
    });
    return transporter;
  }

  const service = process.env.SMTP_SERVICE;
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (service) {
    transporter = nodemailer.createTransport({
      service,
      auth: { user, pass },
    });
  } else {
    transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    });
  }

  return transporter;
}

/**
 * Sends a password reset email with PSYCARE branding and secure link.
 */
export async function sendPasswordResetEmail({
  to,
  resetUrl,
  userName,
  role,
}: SendResetEmailOptions): Promise<SendResetEmailResult> {
  let mailTransporter = getTransporter();
  let isDevFallback = false;

  // If email provider is NOT configured:
  if (!mailTransporter) {
    if (process.env.NODE_ENV !== 'production') {
      isDevFallback = true;
      mailTransporter = await getOrCreateEtherealTransporter();
      if (!mailTransporter) {
        console.log(`\n======================================================`);
        console.log(`[DEV LOCAL TESTING] Password reset link for ${to}:`);
        console.log(`🔗 Reset Link: ${resetUrl}`);
        console.log(`======================================================\n`);
        return {
          delivered: true,
          devResetUrl: resetUrl,
        };
      }
    } else {
      console.warn(
        '[EMAIL SERVICE WARNING] SMTP is not configured. Email was NOT dispatched.\n' +
        'To enable live email delivery, please configure the following in your .env or Railway environment:\n' +
        '  SMTP_HOST (e.g. smtp.gmail.com or smtp.resend.com)\n' +
        '  SMTP_PORT (e.g. 587 or 465)\n' +
        '  SMTP_USER (your SMTP username / email)\n' +
        '  SMTP_PASS (your SMTP app password / token)\n' +
        '  EMAIL_FROM (e.g. "PSY CARE <no-reply@psycare.edu>")'
      );
      return {
        delivered: false,
        error: 'SMTP service is not configured on the server.',
      };
    }
  }

  const fromAddress = process.env.EMAIL_FROM || '"PSY CARE" <no-reply@psycare.edu>';
  const greeting = userName ? `Hello ${userName},` : 'Hello,';
  const roleLabel = role ? ` (${role.charAt(0).toUpperCase() + role.slice(1)} Portal)` : '';

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your PSY CARE Password</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 0;
      background-color: #FFF7ED;
      color: #172554;
    }
    .wrapper {
      max-width: 580px;
      margin: 30px auto;
      background-color: #ffffff;
      border: 1px solid #FED7AA;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 4px 20px rgba(245, 158, 11, 0.08);
    }
    .header {
      background: linear-gradient(135deg, #0B1F3A 0%, #172554 100%);
      padding: 32px 24px;
      text-align: center;
      color: #ffffff;
    }
    .brand-title {
      font-size: 24px;
      font-weight: 800;
      letter-spacing: -0.5px;
      margin: 0;
    }
    .brand-subtitle {
      font-size: 13px;
      color: #94A3B8;
      margin-top: 4px;
    }
    .content {
      padding: 36px 32px;
      line-height: 1.6;
    }
    .greeting {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
      color: #172554;
    }
    .text {
      font-size: 14px;
      color: #475569;
      margin-bottom: 24px;
    }
    .btn-container {
      text-align: center;
      margin: 32px 0;
    }
    .btn {
      display: inline-block;
      background-color: #1D4ED8;
      color: #ffffff !important;
      text-decoration: none;
      font-weight: 600;
      font-size: 15px;
      padding: 13px 32px;
      border-radius: 10px;
      box-shadow: 0 2px 8px rgba(29, 78, 216, 0.25);
    }
    .info-box {
      background-color: #FFF1E5;
      border: 1px solid #FFCC99;
      border-radius: 10px;
      padding: 14px 18px;
      font-size: 12px;
      color: #9A3412;
      margin-bottom: 24px;
    }
    .fallback {
      font-size: 12px;
      color: #64748B;
      word-break: break-all;
      background: #F8FAFC;
      padding: 12px;
      border-radius: 8px;
      border: 1px solid #E2E8F0;
    }
    .footer {
      border-top: 1px solid #FED7AA;
      background-color: #FFF7ED;
      padding: 20px 32px;
      text-align: center;
      font-size: 12px;
      color: #64748B;
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="brand-title">PSY CARE</div>
      <div class="brand-subtitle">Mental Well-being & Career Guidance Portal${roleLabel}</div>
    </div>
    <div class="content">
      <div class="greeting">${greeting}</div>
      <p class="text">
        We received a request to reset the password associated with your PSY CARE account.
        Click the button below to choose a new, secure password:
      </p>
      <div class="btn-container">
        <a href="${resetUrl}" class="btn" target="_blank" rel="noopener noreferrer">Reset Password</a>
      </div>
      <div class="info-box">
        <strong>Important:</strong> This password reset link is valid for <strong>1 hour</strong> and can only be used once.
      </div>
      <p class="text" style="font-size: 13px; color: #64748B;">
        If you did not request this password reset, you can safely ignore this email. Your existing password will remain completely secure.
      </p>
      <p style="font-size: 12px; color: #94A3B8; margin-top: 24px; margin-bottom: 6px;">
        If the button above does not work, copy and paste this URL into your web browser:
      </p>
      <div class="fallback">${resetUrl}</div>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} PSY CARE. All rights reserved.<br>
      This is an automated security email. Please do not reply directly to this message.
    </div>
  </div>
</body>
</html>
  `.trim();

  const textContent = `
PSY CARE - Password Reset Request${roleLabel}

${greeting}

We received a request to reset your PSY CARE account password.
Please open the following link in your browser to set a new password:

${resetUrl}

NOTE: This link is valid for 1 hour and can only be used once.

If you did not request this password reset, please ignore this email. Your password will not change.

--
PSY CARE Team
  `.trim();

  try {
    const info = await mailTransporter.sendMail({
      from: fromAddress,
      to,
      subject: 'Reset Your PSY CARE Password',
      text: textContent,
      html: htmlContent,
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`\n======================================================`);
    console.log(`[EMAIL SERVICE] Password reset email processed for ${to}`);
    console.log(`🔗 Reset Link: ${resetUrl}`);
    if (previewUrl) {
      console.log(`📧 Test Email Preview URL: ${previewUrl}`);
    }
    console.log(`======================================================\n`);

    return {
      delivered: true,
      previewUrl: previewUrl || undefined,
      devResetUrl: isDevFallback ? resetUrl : undefined,
    };
  } catch (err: any) {
    console.error('[EMAIL SERVICE ERROR] Failed to send email via SMTP:', err.message);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`\n======================================================`);
      console.log(`[DEV LOCAL FALLBACK] Reset link for ${to}:`);
      console.log(`🔗 Reset Link: ${resetUrl}`);
      console.log(`======================================================\n`);
      return {
        delivered: true,
        devResetUrl: resetUrl,
      };
    }
    return { delivered: false, error: err.message };
  }
}
