import prisma from "../utils/prismaClient";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const LoginController = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new Error("email and password are required");
    }

    const user = await prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      throw new Error("invalid credentials");
    }

    const token = jwt.sign({ _id: user.id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res
      .cookie("access_token", token, {
        maxAge: 1 * 60 * 60 * 1000,
        httpOnly: true,
        secure: false,
      })
      .status(200)
      .json({
        status: "success",
        message: "User logged in successfully!",
      });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: error.message,
    });
  }
};

export const LogoutController = async (req, res) => {
  try {
    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: false,
      })
      .status(200)
      .json({
        status: "success",
        message: "Logged out successfully",
      });
  } catch (error) {
    res.status(500).json({
      status: "failed",
      message: "Something went wrong",
    });
  }
};
