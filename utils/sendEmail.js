// utils/sendEmail.js
import nodemailer from "nodemailer";
import "dotenv/config";

// test de recupération des variables d'environnement
console.log(process.env.EMAIL_USER);

// Configuration du transporteur SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT, 10),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
});

export default async function sendEmail({ to, subject, html, text, attachments }) {
  const from = `"${process.env.EMAIL_FROM_NAME || "monAgenceDeCom"}" <${process.env.EMAIL_USER}>`;
  const info = await transporter.sendMail({ from, to, subject, html, text, attachments });
  return info;
}

// Nodemailer: Vérification de la connexion SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur SMTP :", error);
  } else {
    console.log("Serveur SMTP prêt à envoyer des emails");
  }
});
