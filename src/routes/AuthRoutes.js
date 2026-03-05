import express from "express";
const AuthRoutes = express.Router();
import {
  LoginController,
  RegisterController,
  LogoutController,
} from "../controllers/AuthController.js";

// Placeholder for authentication routes
AuthRoutes.post("/login", LoginController);
AuthRoutes.post("/logout", LogoutController);
export default AuthRoutes;
