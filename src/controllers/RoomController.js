import prisma from "../utils/prismaClient.js";

export const getAllRooms = async (req, res) => {
  try {
    const rooms = await prisma.room.findMany();
    res.status(200).json({
      success: "success",
      data: rooms,
    });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const getRoomById = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.findUnique({
      where: { id: +id },
    });
    if (!room) {
      return res
        .status(404)
        .json({ status: "failed", message: "Room not found" });
    }
    res.status(200).json({
      success: "success",
      data: room,
    });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const room = await prisma.room.deleteMany({
      where: { id: +id, creator_id: +req.user.id },
    });
    if (!room || room.count === 0) {
      return res.status(404).json({
        status: "failed",
        message: "Room not found or not owned by user",
      });
    }
    res.status(200).json({
      success: "success",
      message: "Room deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const updateRoom = async (req, res) => {
  try {
    const { id } = req.params;
    const { name } = req.body;
    console.log(req.user, id);
    const room = await prisma.room.updateMany({
      where: { id: +id, creator_id: +req.user.id },
      data: { name },
    });
    if (!room || room.count === 0) {
      return res.status(404).json({
        status: "failed",
        message: "Room not found or not owned by user",
      });
    }
    res.status(200).json({
      success: "success",
      data: room,
    });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const createRoom = async (req, res) => {
  try {
    const { name, code } = req.body;
    const room = await prisma.room.create({
      data: {
        name,
        code,
        creator_id: +req.user.id,
      },
    });
    res.status(201).json({
      success: "success",
      data: room,
    });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};
