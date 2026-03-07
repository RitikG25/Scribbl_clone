import Express from "express";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
} from "../controllers/RoomController.js";
import AuthMiddleware from "../middleware/auth.js";
import {
  getAllRoomMembers,
  JoinRoom,
  LeaveRoom,
} from "../controllers/RoomMemeberController.js";
const RoomRouter = Express.Router();

RoomRouter.route("/").get(AuthMiddleware, getAllRooms);
RoomRouter.route("/:id").get(AuthMiddleware, getRoomById);
RoomRouter.route("/").post(AuthMiddleware, createRoom);
RoomRouter.route("/:id").put(AuthMiddleware, updateRoom);
RoomRouter.route("/:id").delete(AuthMiddleware, deleteRoom);
// Room members routes

RoomRouter.route("/:roomId/members").get(AuthMiddleware, getAllRoomMembers);
RoomRouter.route("/:roomId/join").post(AuthMiddleware, JoinRoom);
RoomRouter.route("/:roomId/leave").post(AuthMiddleware, LeaveRoom);
export default RoomRouter;
