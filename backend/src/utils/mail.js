import nodemailer from 'nodemailer';

export async function sendOtp(email, otp) {
  if (!process.env.SMTP_HOST) {
    console.log(`OTP for ${email}: ${otp}`);
    return;
  }
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
  await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@toyxona.local',
    to: email,
    subject: 'To’yxona platformasi OTP',
    text: `Tasdiqlash kodingiz: ${otp}`
  });
}
