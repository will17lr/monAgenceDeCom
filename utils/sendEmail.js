import nodemailer from "nodemailer";

const dryRun = process.env.EMAIL_DRY_RUN === "true";

const transporter = dryRun
  ? nodemailer.createTransport({ streamTransport: true, buffer: true })
  : nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
    });

export default async function sendEmail({ to, subject, html, text }) {
  const info = await transporter.sendMail({
    from: `"${process.env.EMAIL_FROM_NAME}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
    text,
  });

  if (dryRun) console.log("📧 [DEV PREVIEW] HTML:\n", html);
  else console.log("✅ Email envoyé, id:", info.messageId);
}
