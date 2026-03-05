import jwt from "jsonwebtoken";
import prisma from "../utils/prismaClient";

const AuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies?.access_token;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authorization token provided",
      });
    }

    let payload;
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res
        .clearCookie("access_token", {
          httpOnly: true,
          secure: false,
        })
        .status(401)
        .json({
          success: false,
          message:
            err.name === "TokenExpiredError"
              ? "Token expired"
              : "Invalid token",
        });
    }

    if (!payload?._id) {
      return res
        .clearCookie("access_token", {
          httpOnly: true,
          secure: false,
          // sameSite: "lax",
        })
        .status(401)
        .json({
          success: false,
          message: "Invalid credentials",
        });
    }

    const userId = Number(payload._id);

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!user) {
      return res
        .clearCookie("access_token", {
          httpOnly: true,
          secure: false,
        })
        .status(401)
        .json({
          success: false,
          message: "User not found!",
        });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Auth middleware error",
    });
  }
};

export default AuthMiddleware;
