// database/database.js
import mongoose from "mongoose";

const database = async function () {
  const uri = process.env.URI_MONGODB;

  // Petit log pour vérifier ce qui est lu
  console.log("[DB] URI_MONGODB =", uri);

  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    throw new Error(
      "❌ URI_MONGODB invalide ou manquante. Vérifie ton fichier .env"
    );
  }

  try {
    await mongoose.connect(uri, {
      // Depuis Mongoose v7+, plus besoin d’options spéciales
      // mais tu peux les activer si tu veux être explicite :
      // useNewUrlParser: true,
      // useUnifiedTopology: true,
    });

    console.log("✅ Connexion à la base de données de Mon Agence De Com réussie !");
  } catch (error) {
    console.error("❌ Erreur de connexion MongoDB :", error.message);
    process.exit(1); // Arrête le serveur proprement si la DB n’est pas dispo
  }
};

export default database;
