import express from "express";
import userController from "../controllers/userController.js";
import { Router } from "express";
// import { createUserSchema } from "../validations/user.validation.js";

const userRouter = Router();

// userRouter.get("/login", userController.index);

// userRouter.get("/register", userController.register);

// userRouter.get("/logout", userController.logout);

export default userRouter;
