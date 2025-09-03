// app.js
import "dotenv/config";
import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";
import express from "express";
import expressLayouts from "express-ejs-layouts";
import methodOverride from "method-override";
import session from "express-session";
import cookieParser from "cookie-parser";

import database from "./database/database.js";
import userRoutes from "./routes/userRoutes.js";
import contactRoutes from "./routes/contact.js";
import sendEmail from "./utils/sendEmail.js";

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

// === ESM __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// === Dossiers statiques (création + mapping explicite)
const PUBLIC_DIR  = path.join(__dirname, "public");
const UPLOAD_DIR  = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// Dispo globalement (routes, views)
app.locals.UPLOAD_DIR = UPLOAD_DIR;

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(PUBLIC_DIR));

// === Middlewares globaux
app.use(express.urlencoded({ extended: true, limit: "50mb" }));
app.use(express.json());
app.use(methodOverride("_method"));
app.use(cookieParser());

// Sessions (en prod: secure:true derrière proxy HTTPS + store persistant)
app.use(session({
  secret: SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false }
}));

// Variables de vue par défaut
app.use((req, res, next) => {
  res.locals.style = "index";
  next();
});

// === Vues (EJS + layouts)
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");
app.use(expressLayouts);

app.set("layout", "partials/layout");


// === Routes
app.use(contactRoutes);   // /contact, /api/contact, etc. (défini dans le fichier route)
app.use("/", userRoutes);

// Test Nodemailer (optionnel)
app.get("/test-email", async (req, res) => {
  try {
    await sendEmail({
      to: process.env.TEST_EMAIL_TO || process.env.EMAIL_USER,
      subject: "Test Nodemailer",
      html: "<h1>Ça marche 🚀</h1><p>Test depuis /test-email</p>",
    });
    res.send("Email envoyé ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Erreur d'envoi: " + err.message);
  }
});

// Test view (optionnel)
app.get("/test-view", (req, res) => {
  res.render("pages/test", { title: "Test EJS" });
});

// 404
app.use((req, res) => {
  res.status(404).render("pages/error", { message: "Page introuvable" });
});

// Handler d’erreurs
app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err);
  res.status(500).render("pages/error", { message: "Erreur serveur" });
});

// === Lancement
app.listen(PORT, () => {
  database();
  console.log("Serveur démarré sur le port " + PORT);
});
