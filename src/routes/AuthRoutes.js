import express from "express";
const AuthRoutes = express.Router();
import {
  LoginController,
  LogoutController,
} from "../controllers/AuthController.js";

// Placeholder for authentication routes
AuthRoutes.post("/login", LoginController);
AuthRoutes.post("/logout", LogoutController);
export default AuthRoutes;
