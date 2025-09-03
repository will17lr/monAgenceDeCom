import Joi from "joi";

export const createUserSchema = Joi.object({
  username: Joi.string().trim().lowercase().min(3).max(20).required().messages({
    "string.empty": "Le nom d'utilisateur est requis.",
    "string.min": "Le nom d'utilisateur doit contenir au moins 3 caractères.",
    "string.max": "Le nom d'utilisateur ne peut pas dépasser 20 caractères.",
  }),
  email: Joi.string()
    .trim()
    .lowercase()
    .email({ tlds: { allow: false } })
    .required()
    .messages({
      "string.email": "Le format de l'email est invalide.",
      "string.empty": "L'email est requis.",
    }),
  password: Joi.string()
    .min(6)
    .max(30)
    .pattern(
      new RegExp("^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)[a-zA-Z\\d@$!%*?&]{6,30}$")
    )
    .required()
    .messages({
      "string.min": "Le mot de passe doit contenir au moins 6 caractères.",
      "string.max": "Le mot de passe ne peut pas dépasser 30 caractères.",
      "string.pattern.base":
        "Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre.",
      "string.empty": "Le mot de passe est requis.",
    }),
  isVerified: Joi.boolean(),
  isAdmin: Joi.boolean(),
  isActive: Joi.boolean(),
  confirmPassword: Joi.valid(Joi.ref("password")).required().messages({
    "any.only": "Les mots de passe ne correspondent pas.",
    "string.empty": "La confirmation du mot de passe est requise.",
  }),
});