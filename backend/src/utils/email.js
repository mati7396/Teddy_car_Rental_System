const nodemailer = require('nodemailer');

const getFromAddress = () => {
  if (process.env.EMAIL_FROM) return process.env.EMAIL_FROM;
  if (process.env.SMTP_USER) return process.env.SMTP_USER;
  return 'no-reply@teddyrental.com';
};

const isConfiguredSmtp = () => {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !port) return false;
  if (host === 'smtp.example.com') return false;
  if (user === 'your_smtp_username') return false;
  if (pass === 'your_smtp_password') return false;
  return true;
};

let transporterPromise = null;
const createTransporter = async () => {
  if (isConfiguredSmtp()) {
    try {
      const secure = process.env.SMTP_SECURE === 'true' || Number(process.env.SMTP_PORT) === 465;
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: Number(process.env.SMTP_PORT),
        secure,
        auth: process.env.SMTP_USER && process.env.SMTP_PASS
          ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
          : undefined
      });

      await transporter.verify();
      console.log('SMTP transporter verified successfully.');
      return transporter;
    } catch (error) {
      console.error('SMTP transporter verification failed:', error.message);
      throw error;
    }
  }

  console.warn('SMTP is not configured. Using local stream transport to log email payload to console.');
  return nodemailer.createTransport({
    streamTransport: true,
    buffer: true,
    newline: 'unix'
  });
};

const getTransporter = async () => {
  if (!transporterPromise) {
    transporterPromise = createTransporter().catch((error) => {
      transporterPromise = null;
      throw error;
    });
  }
  return transporterPromise;
};

const sendEmail = async ({ to, subject, text, html }) => {
  try {
    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: getFromAddress(),
      to,
      subject,
      text,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl(info);
    console.log('Email sent:', {
      to,
      subject,
      messageId: info.messageId,
      previewUrl: previewUrl || null
    });

    if (!previewUrl && info.message) {
      console.log('Local email transport message preview:\n', info.message.toString());
    }

    return info;
  } catch (error) {
    console.error('Email send failed:', {
      to,
      subject,
      error: error.message
    });
    throw error;
  }
};

const sendPasswordResetEmail = async ({ to, code }) => {
  const subject = 'Teddy Car Rental - Password Reset Code';
  const text = `Your password reset code is ${code}. It will expire in 1 hour.`;
  const html = `
    <p>Hello,</p>
    <p>Your password reset code is <strong>${code}</strong>.</p>
    <p>This code will expire in 1 hour. If you did not request this change, please ignore this email.</p>
    <p>Thank you,<br/>Teddy Car Rental Team</p>
  `;

  await sendEmail({ to, subject, text, html });
};

module.exports = {
  sendPasswordResetEmail
};
