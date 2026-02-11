import express from 'express';
import upload from '../middlewares/multer.middleware.js';
import {authMiddleware} from "../middlewares/auth.middleware.js"
import { createRoom, getOwnerRooms, getOwnerRoomById, getRooms, getRoomById, toggleRoomAvailability, deleteRoom, updateRoom } from '../controllers/room.controller.js';
const roomRouter = express.Router();

roomRouter.post("/",upload.array("images",4),authMiddleware,createRoom)

roomRouter.get("/", getRooms);
roomRouter.get("/owner", authMiddleware, getOwnerRooms);
roomRouter.get("/owner/:id", authMiddleware, getOwnerRoomById);
roomRouter.get("/:id", getRoomById);
roomRouter.put("/:id", authMiddleware, upload.array("images", 4), updateRoom);
roomRouter.delete("/:id", authMiddleware, deleteRoom);

roomRouter.post("/toogle-avalibility",authMiddleware,toggleRoomAvailability)

export default roomRouter;