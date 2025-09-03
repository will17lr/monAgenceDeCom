import nodemailer from "nodemailer";
import "dotenv/config";

//test de récupération des variables
console.log(process.env.EMAIL_USER);

// Nodemailer: Configuration du transporter SMTP
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === "true",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export default async function sendEmail({ to, subject, html }) {
  try {
    const info = await transporter.sendMail({
      from: `"Branlos" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });
    console.log("Email envoyé avec succès", info.messageId);
  } catch (error) {
    console.error("Erreur d'envoi :", error);
    throw new Error("Erreur lors de l'envoi de l'email");
  }
}

// Nodemailer: Vérification de la connexion SMTP
transporter.verify((error, success) => {
  if (error) {
    console.error("Erreur SMTP :", error);
  } else {
    console.log("Serveur SMTP prêt à envoyer des emails");
  }
});
