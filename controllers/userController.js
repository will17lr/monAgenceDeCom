// controllers/userController.js
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import sendEmail from "../utils/sendEmail.js";
import "dotenv/config";

const PORT = process.env.PORT || 3000;
const CLIENT_URL = (process.env.CLIENT_URL || "").replace(/\/+$/, "");
const JWT_SECRET = process.env.JWT_SECRET;
const IS_DEV = (process.env.NODE_ENV || "").toLowerCase() === "development";

if (!JWT_SECRET) {
  console.error("❌ JWT_SECRET manquant dans .env");
  process.exit(1);
}

const ONE_HOUR = 60 * 60 * 1000;
const cookieOpts = {
  httpOnly: true,
  secure: false,   // ⚠️ passe à true en prod (HTTPS)
  sameSite: "lax",
  maxAge: 7 * 24 * ONE_HOUR,
};

const appBase = (req) => CLIENT_URL || `${req.protocol}://${req.get("host")}`;

export default new (class userController {
  async home(_req, res) {
    try { res.render("pages/index"); }
    catch (err) { console.error(err); res.status(500).send("Erreur accueil : " + err); }
  }

  async index(_req, res) {
    try { res.render("pages/login"); }
    catch (err) { console.error(err); res.status(500).send("Erreur login : " + err); }
  }

  async logout(req, res) {
    try {
      req.session?.destroy?.(() => {});
      res.clearCookie("token", cookieOpts);
      res.redirect("/login");
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la déconnexion" });
    }
  }

  // ====== LOGIN ======
  async login(req, res) {
    try {
      const email = (req.body.email || "").toLowerCase().trim();
      const { password } = req.body;

      if (!email || !password)
        return res.status(400).json({ message: "Tous les champs sont obligatoires" });

      const user = await User.findOne({ email });
      if (!user)
        return res.status(401).render("pages/login", { error: "Email ou mot de passe incorrect" });

      if (!user.isVerified)
        return res.status(403).json({ message: "Compte non vérifié. Veuillez vérifier votre email." });

      const ok = await bcrypt.compare(password, user.password);
      if (!ok)
        return res.status(401).render("pages/login", { error: "Email ou mot de passe incorrect" });

      const token = jwt.sign(
        { sub: user._id, role: user.isAdmin ? "admin" : "user" },
        JWT_SECRET,
        { expiresIn: "1h" }
      );
      res.cookie("token", token, cookieOpts);

      return res.status(200).json({
        message: "Connexion réussie",
        user: { id: user._id, username: user.username, email: user.email },
      });
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      res.status(500).render("pages/login", { error: "Une erreur interne est survenue" });
    }
  }

  // ====== REGISTER + MAIL VÉRIF ======
  async create(req, res) {
    try {
      const username = (req.body.username || "").trim();
      const email = (req.body.email || "").toLowerCase().trim();
      const { password, confirmPassword } = req.body;

      if (!username || !email || !password || !confirmPassword)
        return res.status(400).json({ message: "Tous les champs sont obligatoires" });

      if (password !== confirmPassword)
        return res.status(400).json({ message: "Les mots de passe ne correspondent pas" });

      const existingUser = await User.findOne({ email });
      if (existingUser)
        return res.render("pages/login", { message: "Cet email est déjà utilisé. Connectez-vous." });

      const hashedPassword = await bcrypt.hash(password, 12);
      const newUser = await User.create({
        username, email, password: hashedPassword, isAdmin: false, isVerified: false,
      });

      // Token vérif + ENCODAGE pour l’URL
      const verificationToken = jwt.sign({ id: newUser._id }, JWT_SECRET, { expiresIn: "7d" });
      const base = appBase(req);
      const safe = encodeURIComponent(verificationToken);  // encode
      const verificationUrl = `${base}/users/verify/${safe}`;

      // Log et preview DEV
      console.log("🔗 Verification URL:", verificationUrl);

      await sendEmail({
        to: newUser.email,
        subject: "Vérifiez votre compte",
        html: `Bonjour ${username},<br><br>
               Merci de vérifier votre compte en cliquant sur ce lien :
               <a href="${verificationUrl}">Vérifier mon compte</a><br><br>
               Ce lien est valable 7 jours.`,
      });

      // En DEV, on renvoie l’URL directement pour tests Postman
      if (IS_DEV) {
        return res.status(201).json({
          message: "Compte créé (DEV). Lien de vérification inclus.",
          verificationUrl,
        });
      }

      res.redirect("/login");
    } catch (error) {
      console.error("Erreur lors de la création de compte :", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }

  // ====== VERIFY EMAIL ======
  async verifyEmail(req, res) {
    try {
      // Accepte /users/verify/:token OU /users/verify?token=...
      const tokenRaw = req.params.token || req.query.token || "";
      const token = decodeURIComponent(tokenRaw); // decode

      // Debug utile (doit afficher 2 points)
      // console.log("verify dots=", (token.match(/\./g)||[]).length, "len=", token.length);

      const decoded = jwt.verify(token, JWT_SECRET);
      if (!decoded?.id) return res.status(400).redirect("/login");

      const user = await User.findById(decoded.id);
      if (!user) return res.status(400).redirect("/login");
      if (user.isVerified) return res.status(200).redirect("/login");

      user.isVerified = true;
      await user.save();

      res.redirect("/");
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(400).redirect("/login");
    }
  }

  // ====== PASSWORD RESET (REQUEST) ======
  async requestPasswordReset(req, res) {
    const email = (req.body.email || "").toLowerCase().trim();
    if (!email) return res.status(400).json({ message: "Email requis." });

    try {
      const user = await User.findOne({ email });
      if (!user) return res.json({ message: "Si un compte existe, un email a été envoyé." });

      const resetToken = crypto.randomBytes(32).toString("hex");
      const resetTokenHashed = crypto.createHash("sha256").update(resetToken).digest("hex");

      user.resetPasswordToken = resetTokenHashed;
      user.resetPasswordExpire = Date.now() + ONE_HOUR; // 1h
      await user.save();

      const base = appBase(req);
      const resetUrl = `${base}/users/reset-password/${resetToken}`;

      console.log("🔗 Reset URL:", resetUrl);

      await sendEmail({
        to: user.email,
        subject: "Réinitialisation du mot de passe",
        html: `<p>Bonjour ${user.username},</p>
               <p>Pour réinitialiser votre mot de passe, cliquez sur ce lien (valable 1h) :</p>
               <p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });

      if (IS_DEV) {
        return res.json({ message: "Email de reset (DEV). Lien inclus.", resetUrl });
      }

      res.json({ message: "Si un compte existe, un email a été envoyé." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  }

  // ====== PASSWORD RESET (CONFIRM) ======
  async resetPassword(req, res) {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword)
      return res.status(400).json({ message: "Tous les champs sont obligatoires." });
    if (password !== confirmPassword)
      return res.status(400).json({ message: "Les mots de passe ne correspondent pas." });

    try {
      const resetTokenHashed = crypto.createHash("sha256").update(token).digest("hex");
      const user = await User.findOne({
        resetPasswordToken: resetTokenHashed,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user) return res.status(400).json({ message: "Token invalide ou expiré." });

      user.password = await bcrypt.hash(password, 12);
      user.resetPasswordToken = undefined;
      user.resetPasswordExpire = undefined;
      await user.save();

      res.json({ message: "Mot de passe réinitialisé avec succès." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  }

  // ====== RESEND VERIFY ======
  async resendVerificationEmail(req, res) {
    const email = (req.body.email || "").toLowerCase().trim();

    try {
      const user = await User.findOne({ email });
      if (!user) return res.status(404).json({ message: "Utilisateur introuvable." });
      if (user.isVerified) return res.status(400).json({ message: "Ce compte est déjà vérifié." });

      const verificationToken = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1d" });
      const base = appBase(req);
      const safe = encodeURIComponent(verificationToken);
      const verificationUrl = `${base}/users/verify/${safe}`;

      console.log("🔗 Verification URL (resend):", verificationUrl);

      await sendEmail({
        to: user.email,
        subject: "Nouveau lien de vérification",
        html: `Bonjour ${user.username},<br><br>
               Voici un nouveau lien pour vérifier votre compte :
               <a href="${verificationUrl}">Vérifier mon compte</a><br><br>
               Ce lien est valable 24h.`,
      });

      if (IS_DEV) {
        return res.json({ message: "Lien renvoyé (DEV).", verificationUrl });
      }

      res.json({ message: "Un nouveau lien de vérification a été envoyé à votre email." });
    } catch (error) {
      console.error("Erreur lors du renvoi de l’email :", error);
      res.status(500).json({ message: "Erreur lors de l’envoi du lien de vérification." });
    }
  }
})();
