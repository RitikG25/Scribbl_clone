import express from "express";
import * as userController from "../controllers/userController.js";
import AuthMiddleware from "../middleware/auth.js";

const router = express.Router();

// Public routes
router.get("/", userController.getAllUsers);
router.get("/:id", AuthMiddleware, userController.getUserById);

// Protected routes
router.post("/", userController.createUser);
router.put("/:id", AuthMiddleware, userController.updateUser);
router.delete("/:id", AuthMiddleware, userController.deleteUser);

export default router;
