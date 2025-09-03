import mongoose from "mongoose";
import User from "../models/User.js";

const database = async function () {
  try {
    await mongoose.connect(process.env.URI_MONGODB);
    console.log(
      "Connexion à la base de données de Mon Agence De Com réussie !"
    );
  } catch (error) {
    throw new Error(
      "Erreur de connexion à la base de données de Mon Agence De Com : " +
        error.message
    );
  }
};

export default database;
