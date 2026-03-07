import prisma from "../utils/prismaClient.js";

export const getAllRoomMembers = async (req, res) => {
  try {
    const { roomId } = req.params;
    const members = await prisma.roomMembers.findMany({
      where: { room_id: +roomId },
      include: {
        user: {
          select: { id: true, name: true, email: true, game_name: true },
        },
      },
    });
    res.status(200).json({ status: "success", data: members });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const JoinRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const existingMembership = await prisma.roomMembers.findFirst({
      where: { room_id: +roomId, user_id: +userId },
    });
    if (existingMembership) {
      return res
        .status(400)
        .json({ status: "failed", message: " Already a member of this room" });
    }
    const newMembership = await prisma.roomMembers.create({
      data: { room_id: +roomId, user_id: +userId },
    });
    res.status(201).json({ status: "success", data: newMembership });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};

export const LeaveRoom = async (req, res) => {
  try {
    const { roomId } = req.params;
    const userId = req.user.id;
    const membership = await prisma.roomMembers.findFirst({
      where: { room_id: +roomId, user_id: +userId },
    });
    if (!membership) {
      return res
        .status(400)
        .json({ status: "failed", message: "Not a member of this room" });
    }
    await prisma.roomMembers.delete({
      where: { id: membership.id },
    });
    res
      .status(200)
      .json({ status: "success", message: "User has left the room" });
  } catch (error) {
    res.status(500).json({ status: "failed", message: error.message });
  }
};
