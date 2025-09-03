import express from "express";
import User from "../models/User.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { isAuthJwt, hashPassword } from "../middlewares/authentification.js";
import "dotenv/config";
import sendEmail from "../utils/sendEmail.js";
import crypto from "crypto";

const port = process.env.PORT;
const CLIENT_URL = process.env.CLIENT_URL;
const JWT_SECRET = process.env.JWT_SECRET;

class userController {
  //envoi sur la page d'accueil
  async home(req, res) {
    try {
      res.render("pages/index");
    } catch (err) {
      console.error(err);
      res.status(500).send("Erreur lors de l'affichage de l'accueil : " + err);
    }
  }

  //envoi sur la page login
  async index(req, res) {
    try {
      res.render("pages/login");
    } catch (err) {
      console.error(err);
      res.status(500).send("Erreur lors de l'affichage du login : " + err);
    }
  }

  async logout(req, res) {
    try {
      req.session.destroy();
      res.clearCookie("token", {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
      });
      res.redirect("/login");
    } catch (error) {
      res.status(500).json({ error: "Erreur lors de la déconnextion" });
    }
  }

  //Permet la connexion en vérifiant avec l'aide de l'email et du password
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!email || !password) {
        return res
          .status(400)
          .json({ message: "Tous les champs sont obligatoires" });
      }

      if (!user) {
        return res.status(401).render("pages/login", {
          error: "Email ou mot de passe incorrect",
        });
      }

      if (!user.isVerified) {
        return res.status(401).json({
          message: "Compte non vérifié. Veuillez vérifier vos identifiants.",
        });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);

      if (!isPasswordValid) {
        return res.status(401).render("pages/login", {
          error: "Email ou mot de passe incorrect",
        });
      }

      // ✅ Connexion OK
      req.session.user = user;
      const token = jwt.sign(
        { sub: user._id },
        "a-string-secret-at-least-256-bits-long",
        {
          expiresIn: "1h",
        }
      );
      res.cookie("token", token, {
        httpOnly: true,
        secure: false,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });

      res.status(200).json({
        message: "Connexion réussie",
        user: { id: user._id, username: user.username, email: user.email },
      });
    } catch (error) {
      console.error("Erreur lors de la connexion :", error);
      res.status(500).render("pages/login", {
        error: "Une erreur interne est survenue",
      });
    }
  }

  //ajoute un utilisateur à la base de données avec password haché
  async create(req, res) {
    try {
      const { username, email, password, confirmPassword, isAdmin } = req.body;

      if (!username || !email || !password || !confirmPassword) {
        return res
          .status(400)
          .json({ message: "Tous les champs sont obligatoires" });
      }
      if (password !== confirmPassword) {
        return res
          .status(400)
          .json({ message: "Les mots de passe ne correspondent pas" });
      }
      const existingUser = await User.findOne({ email: email });
      if (existingUser) {
        return res.render("pages/login", {
          message: "Cet email est déjà utilisé. Connectez-vous.",
        });
      }
      const hashedPassword = await hashPassword(password);
      const newUser = new User({
        username,
        email,
        password: hashedPassword,
        isAdmin: false,
        isVerified: false,
      });
      console.log("Nouvel utilisateur :", newUser);
      await newUser.save();

      //Création du token de vérification
      const verificationToken = jwt.sign({ id: newUser._id }, JWT_SECRET, {
        expiresIn: "7d",
      });

      // URL de vérification
      const verificationUrl = CLIENT_URL
        ? `${CLIENT_URL}/verify/${verificationToken}` // ✅ /user/
        : `http://localhost:${port}/verify/${verificationToken}`;

      // Envoi de l'email de vérification
      await sendEmail({
        to: newUser.email,
        subject: "Vérifier votre compte",
        html: `Bonjour ${username}, <br><br>Merci de vérifier votre compte en cliquant sur ce lien : <a href="${verificationUrl}">Vérifier mon compte</a><br><br>Ce lien est valable 7 jours.`,
      });
      res.redirect("/login");
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'employé :", error);
      res.status(500).json({ error: "Erreur serveur" });
    }
  }

  //Vérifie l'email de l'utilisateur avec un token
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      const decoded = jwt.verify(token, JWT_SECRET);

      if (!decoded.id) {
        return res.status(400).redirect("/login");
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(400).redirect("/login");
      }
      if (user.isVerified) {
        return res.status(400).redirect("/login");
      }
      user.isVerified = true;
      await user.save();

      res.redirect("/");
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(400).redirect("/login");
    }
  }

  //Permet de réinitialiser le mot de passe
  async requestPasswordReset(req, res) {
    console.log("🔍 req.body:", req.body); // Pour voir le contenu
    console.log("🔍 Content-Type:", req.get("Content-Type")); // Pour voir le header

    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email requis." });

    try {
      const user = await User.findOne({ email });
      if (!user)
        return res.status(404).json({ message: "Utilisateur non trouvé." });

      // Création d'un token unique pour reset, par exemple un JWT ou token random
      const resetToken = crypto.randomBytes(32).toString("hex");

      console.log("🔑 Token généré pour test:", resetToken);

      // Option 1: stocker un hash du token pour sécurité
      const resetTokenHashed = crypto
        .createHash("sha256")
        .update(resetToken)
        .digest("hex");

      // Sauvegarde dans la DB avec expiration 1h par ex
      user.resetPasswordToken = resetTokenHashed;
      user.resetPasswordExpire = Date.now() + 3600000; // 1h en ms
      await user.save();

      // URL de reset envoyée par email
      const resetUrl = CLIENT_URL
        ? `${CLIENT_URL}/user/reset-password/${resetToken}`
        : `http://localhost:${port}/user/reset-password/${resetToken}`;

      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de mot de passe",
        html: `<p>Bonjour,</p>
               <p>Pour réinitialiser votre mot de passe, cliquez sur ce lien :</p>
               <a href="${resetUrl}">${resetUrl}</a>
               <p>Ce lien expire dans 1 heure.</p>`,
      });

      res.json({ message: "Email de réinitialisation envoyé." });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Erreur serveur." });
    }
  }

  async resetPassword(req, res) {
    const { token } = req.params;
    const { password, confirmPassword } = req.body;

    if (!password || !confirmPassword)
      return res
        .status(400)
        .json({ message: "Tous les champs sont obligatoires." });

    if (password !== confirmPassword)
      return res
        .status(400)
        .json({ message: "Les mots de passe ne correspondent pas." });

    try {
      // Hash le token reçu pour le comparer en DB
      const resetTokenHashed = crypto
        .createHash("sha256")
        .update(token)
        .digest("hex");

      // Trouver l'utilisateur avec token valide et non expiré
      const user = await User.findOne({
        resetPasswordToken: resetTokenHashed,
        resetPasswordExpire: { $gt: Date.now() },
      });

      if (!user)
        return res.status(400).json({ message: "Token invalide ou expiré." });

      // Hash du nouveau password
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

  //Revoyer le lien de validation si le token est expriré

  async resendVerificationEmail(req, res) {
    const { email } = req.body;

    try {
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(404).json({ message: "Utilisateur introuvable." });
      }

      if (user.isVerified) {
        return res.status(400).json({ message: "Ce compte est déjà vérifié." });
      }

      const verificationToken = jwt.sign({ id: user._id }, JWT_SECRET, {
        expiresIn: "1d",
      });

      const verificationUrl = CLIENT_URL
        ? `${CLIENT_URL}/user/verify/${verificationToken}`
        : `http://localhost:${port}/user/verify/${verificationToken}`;

      await sendEmail({
        to: user.email,
        subject: "Nouveau lien de vérification",
        html: `Bonjour ${user.name},<br><br>Voici un nouveau lien pour vérifier votre compte : <a href="${verificationUrl}">Vérifier mon compte</a><br><br>Ce lien est valable 24h.`,
      });

      res.json({
        message: "Un nouveau lien de vérification a été envoyé à votre email.",
      });
    } catch (error) {
      console.error("Erreur lors du renvoi de l’email :", error);
      res
        .status(500)
        .json({ message: "Erreur lors de l’envoi du lien de vérification." });
    }
  }
}

export default new userController();