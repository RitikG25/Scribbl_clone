import express from "express";
import userRoutes from "./routes/userRoutes.js";
import errorHandler from "./middleware/errorHandler.js";
import logger from "./middleware/logger.js";
import dotenv from "dotenv";
import AuthRoutes from "./routes/AuthRoutes.js";
import cookieParser from "cookie-parser";
import RoomRouter from "./routes/roomRoutes.js";

dotenv.config();

const app = express();
// Middleware
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(logger);

// Routes
app.use("/api/users", userRoutes);
app.use("/api/auth", AuthRoutes);
app.use("/api/room", RoomRouter);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

// Error handling middleware (must be last)
app.use(errorHandler);

export default app;
