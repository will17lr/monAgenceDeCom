import express from "express";
import userController from "../controllers/userController.js";
import { validate } from "../middlewares/validator.js";
import { Router } from "express";
// import { isAuthJwt, hashPassword } from "../middlewares/authentification.js";
import { createUserSchema } from "../validations/user.validation.js";
import multer from "multer";

const userRouter = Router();

userRouter.get("/", userController.home);
//Login + register
userRouter.get("/login", userController.index);

userRouter.get("/logout", userController.logout);

userRouter.post("/register", validate(createUserSchema), userController.create);

userRouter.post("/login", userController.login);

// userRouter.post("/password-reset-request", userController.requestPasswordReset);

// userRouter.post("/reset-password/:token", userController.resetPassword);

// userRouter.post("/resend-verification", userController.resendVerificationEmail);

export default userRouter;
