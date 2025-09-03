import mongoose from "mongoose";
//Definition du modèle de données pour les utilisateurs
const userSchema = new mongoose.Schema({
  _id: { type: mongoose.Schema.ObjectId, auto: true },
  username: String,
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  isVerified: {
    type: Boolean,
    default: false,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  creationDate: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  resetPasswordToken: { type: String }, // token hashé pour reset password
  resetPasswordExpire: { type: Date },
});

// // Middleware pour mettre à jour updatedAt
// userSchema.pre("save", function (next) {
//   this.updatedAt = Date.now();
//   next();
// });

//Création du modèle User
export default mongoose.model("User", userSchema);
