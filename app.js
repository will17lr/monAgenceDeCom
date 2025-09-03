import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import ejs from "ejs";
import expressLayouts from "express-ejs-layouts";
import methodOverride from "method-override";
import path from "path";
import { fileURLToPath } from "url"; // 👈 import nécessaire
import { dirname } from "path";
import session from "express-session";
import cookieParser from "cookie-parser";
import database from "./database/database.js";
import userRoutes from "./routes/userRoutes.js";
const app = express();
const port = process.env.PORT;

// recréer __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//Middlewares
app.use(express.static("public")); //Pour servir les fichiers statiques (CSS, images, etc.)
app.use(express.static("uploads")); //Pour servir les fichiers uploadés
app.use(expressLayouts); //Pour utiliser express-ejs-layouts

app.use(express.urlencoded({ extended: true, limit: "50mb" })); //Créer le body permettant de récupérer les données du formulaire
app.use(express.json()); //Pour parser les requêtes JSON
app.use(methodOverride("_method")); //Pour utiliser les méthodes PUT et DELETE dans les formulaires
app.use(cookieParser()); //Pour parser les cookies

app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false },
  })
);
app.use((req, res, next) => {
  res.locals.style = "index"; // valeur par défaut
  next();
});

app.use("/", userRoutes);

//settings
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "ejs");

//appel de la connexion DB Catalogue + écoute du serveur sur le port 3000
app.listen(port, () => {
  database();
  console.log("Serveur démarré sur le port " + port);
});
