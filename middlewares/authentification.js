// middlewares/authJwt.js
import jwt from "jsonwebtoken";

const { JWT_SECRET } = process.env;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET manquant dans .env");
}

// Récupère un token depuis Authorization: Bearer <token> ou cookie "token"
function getToken(req) {
  const auth = req.headers.authorization || "";
  if (auth.startsWith("Bearer ")) return auth.slice(7).trim();
  if (req.cookies?.token) return req.cookies.token;
  return null;
}

// Si la requête préfère du JSON (API) plutôt que HTML (navigateur)
function wantsJSON(req) {
  const accept = req.headers.accept || "";
  const xhr = req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest";
  return accept.includes("application/json") || xhr;
}

// 🔐 Doit être connecté
export function isAuthJwt(req, res, next) {
  const token = getToken(req);
  if (!token) {
    return wantsJSON(req)
      ? res.status(401).json({ message: "Non authentifié" })
      : res.redirect("/users/login");
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET); // sync, throws si invalide
    req.user = payload;
    req.userId = payload.sub || payload.id;
    req.userRole = payload.role;
    return next();
  } catch {
    return wantsJSON(req)
      ? res.status(401).json({ message: "Token invalide ou expiré" })
      : res.redirect("/users/login");
  }
}

// 🔐👑 Doit être admin
export function isAdminJwt(req, res, next) {
  isAuthJwt(req, res, () => {
    const isAdmin = req.userRole === "admin" || req.user?.isAdmin === true;
    if (isAdmin) return next();
    return wantsJSON(req)
      ? res.status(403).json({ message: "Accès réservé aux admins" })
      : res.redirect("/users/login");
  });
}

// Utilitaire de hash si tu veux le garder ici
import bcrypt from "bcrypt";
const saltRounds = 10;
export async function hashPassword(plainPassword) {
  const salt = await bcrypt.genSalt(saltRounds);
  return bcrypt.hash(plainPassword, salt);
}
