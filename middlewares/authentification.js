import express from "express";
import jwt from "jsonwebtoken";
//Hashage du mdp
import bcrypt from "bcrypt";
//Nombre de hashage du mdp
const saltRounds = 10;

export async function isAuthJwt(req, res, next) {
  const token = req.cookies.token;
  console.log(token);
  if (!token) {
    return res.redirect("/user/login");
  }
  let decoded = await jwt.verify(
    token,
    "a-string-secret-at-least-256-bits-long"
  );
  req.user = decoded;
  // console.log("decoded:", decoded);
  next();
}

// export async function isAdminJwt(req, res, next) {
//   const token = req.cookies.token;
//   if (!token) {
//     return res.redirect("/user/login");
//   }
//   try {
//     const decoded = await jwt.verify(
//       token,
//       "a-string-secret-at-least-256-bits-long"
//     );
//     if (!decoded.isAdmin) {
//       return res.redirect("/user/login");
//     }
//     req.user = decoded;
//     next();
//   } catch (err) {
//     return res.redirect("/user/login");
//   }
// }

export const hashPassword = async (plainPassword) => {
  try {
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);
    console.log("Mot de passe haché :", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error("Erreur lors du hachage du mot de passe :", error);
    throw error;
  }
};

// hashPassword("monMotDePasseSuperSecret");

// const verifyPassword = async (plainPassword, hashedPassword) => {
//   try {
//     const match = await bcrypt.compare(plainPassword, hashedPassword);
//     if (match) {
//       console.log("✅ Mot de passe valide");
//     } else {
//       console.log("❌ Mot de passe invalide");
//     }
//     return match;
//   } catch (error) {
//     console.error("Erreur lors de la vérification du mot de passe :", error);
//     throw error;
//   }
// };
