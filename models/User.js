// models/User.js
import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    username: { type: String, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,     // normalise automatiquement
      trim: true,
    },
    password: { type: String, required: true },
    isVerified: { type: Boolean, default: false },
    isAdmin: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },

    // Tokens pour vérification email et reset password
    verifyEmailToken: String,
    verifyEmailExpire: Date,
    resetPasswordToken: String,
    resetPasswordExpire: Date,
  },
  { timestamps: true } // => createdAt / updatedAt automatiques
);

// Index d’unicité email insensible à la casse
userSchema.index(
  { email: 1 },
  { unique: true, collation: { locale: "en", strength: 2 } }
);

// Masquer password par défaut dans les réponses JSON
userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete ret.password;
    delete ret.verifyEmailToken;
    delete ret.verifyEmailExpire;
    delete ret.resetPasswordToken;
    delete ret.resetPasswordExpire;
    return ret;
  },
});

export default mongoose.model("User", userSchema, "users");
