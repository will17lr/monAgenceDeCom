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
      const verificationToken = jwt.sign(
        { id: newUser._id },
        "a-string-secret-at-least-256-bits-long",
        {
          expiresIn: "7d",
        }
      );

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
      const decoded = jwt.verify(
        token,
        "a-string-secret-at-least-256-bits-long"
      );

      if (!decoded.id) {
        return res.status(400).redirect("pages/login");
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(400).redirect("pages/login");
      }
      if (user.isVerified) {
        return res.status(400).redirect("pages/login");
      }
      user.isVerified = true;
      await user.save();

      res.redirect("pages/index");
    } catch (error) {
      console.error("Erreur vérification email:", error);
      res.status(400).redirect("pages/login");
    }
  }
}

export default new userController();
