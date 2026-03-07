import prisma from "../utils/prismaClient.js";
import bcrypt from "bcrypt";

const getAllUsers = async (req, res) => {
  try {
    const users = await prisma.user.findMany();
    return res.status(200).json({
      status: "success",
      data: users,
    });
  } catch (error) {
    res.status(500).json({
      success: "failed",
      message: error.message,
    });
  }
};

const getUserById = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({
      where: { id: parseInt(id) },
    });
    res.json({
      success: true,
      data: user,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
};

const createUser = async (req, res) => {
  try {
    const { name, email, game_name, password } = req.body;

    if ((!name || !email || !game_name, !password)) {
      return res.status(400).json({
        success: "failed",
        message: "Name, email,password and game_name are required",
      });
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        game_name,
        password: hashPassword,
      },
    });
    res.status(201).json({
      success: "success",
      message: "User created successfully",
      data: newUser,
    });
  } catch (error) {
    res.status(500).json({
      success: "failed",
      message: error.message,
    });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { game_name } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: parseInt(id) },
      data: { game_name },
    });
    res.json({
      success: "success",
      message: "User game name updated successfully",
      data: updatedUser,
    });
  } catch (error) {
    res.status(500).json({
      success: "failed",
      message: error.message,
    });
  }
};

const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.user.delete({
      where: { id: parseInt(id) },
    });
    res.json({
      success: "success",
      message: `User ${id} deleted successfully`,
    });
  } catch (error) {
    res.status(500).json({
      success: "failed",
      message: error.message,
    });
  }
};

export { getAllUsers, getUserById, createUser, updateUser, deleteUser };
