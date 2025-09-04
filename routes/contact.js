// routes/contact.js
import { Router } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import sendEmail from "../utils/sendEmail.js";

const router = Router();

// ===== Anti-doublon simple (idempotence par entête) =====
const processed = new Map();
setInterval(() => {
  const now = Date.now();
  for (const [k, t] of processed) {
    if (now - t > 2 * 60_000) processed.delete(k); // expire après 2 min
  }
}, 60_000);

const norm = (s = "") => s.trim().toLowerCase();

// ===== Multer (uploads/) =====
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, "uploads"),
  filename: (_req, file, cb) => {
    const ts   = Date.now();
    const ext  = path.extname(file.originalname || "");
    const base = path.basename(file.originalname || "pj", ext).replace(/[^\w.-]+/g, "_");
    cb(null, `${ts}_${base}${ext}`);
  },
});
const fileFilter = (_req, file, cb) => {
  const ok = ["application/pdf", "image/jpeg", "image/png"].includes(file.mimetype);
  cb(ok ? null : new Error("Extension non autorisée (pdf, jpg, png uniquement)"), ok);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 Mo
}).single("attachment");

// ===== POST /api/contact =====
router.post("/api/contact", (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        return res.status(400).json({ ok: false, message: err.message });
      }

      // Idempotency guard
      const key = req.get("X-Idempotency-Key");
      if (key) {
        if (processed.has(key)) {
          return res.json({ ok: true, dedup: true });
        }
        processed.set(key, Date.now());
      }

      const { name, email, message } = req.body;
      if (!name || !email || !message) {
        return res.status(400).json({ ok: false, message: "Champs requis manquants." });
      }

      // Pièce jointe
      const attachments = [];
      if (req.file) {
        attachments.push({
          filename: req.file.originalname || req.file.filename,
          path: req.file.path,
        });
      }

      // Destinataire admin + toggle accusé
      const TO       = process.env.CONTACT_TO || process.env.EMAIL_USER;
      const SEND_ACK = String(process.env.CONTACT_SEND_ACK ?? "true").toLowerCase() === "true";

      // 1) Mail vers l’admin
      await sendEmail({
        to: TO,
        subject: `📬 Nouveau message de contact — ${name}`,
        html: `
          <h2>Nouveau message</h2>
          <p><b>Nom:</b> ${name}</p>
          <p><b>Email:</b> ${email}</p>
          <p><b>Message:</b><br/>${message.replace(/\n/g, "<br>")}</p>
        `,
        attachments,
      });

      // 2) Accusé de réception (optionnel)
      if (SEND_ACK && norm(email) && norm(email) !== norm(TO)) {
        await sendEmail({
          to: email,
          subject: "Nous avons bien reçu votre message",
          html: `
            <p>Bonjour ${name},</p>
            <p>Merci pour votre message. Nous revenons vers vous très vite.</p>
            <hr>
            <p><i>Copie de votre message :</i></p>
            <blockquote>${message.replace(/\n/g, "<br>")}</blockquote>
          `,
        });
      }

      // Nettoyage du fichier uploadé
      if (req.file) await fs.unlink(req.file.path).catch(() => {});

      return res.json({ ok: true, message: "Message envoyé avec succès." });
    } catch (e) {
      if (req.file) await fs.unlink(req.file.path).catch(() => {});
      console.error("Contact error:", e);
      return res.status(500).json({ ok: false, message: "Erreur serveur pendant l'envoi." });
    }
  });
});

export default router;
