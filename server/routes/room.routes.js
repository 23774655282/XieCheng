import express from 'express';
import upload from '../middlewares/multer.middleware.js';
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { createRoom, getOwnerRooms, getOwnerRoomById, getRooms, getRoomById, toggleRoomAvailability, deleteRoom, updateRoom, updateRoomCount, updatePromoDiscount, smartSearchRooms, listRoomEditApplications, approveRoomEdit, rejectRoomEdit } from '../controllers/room.controller.js';
const roomRouter = express.Router();

roomRouter.post("/",upload.array("images",4),authMiddleware,createRoom)

roomRouter.get("/", getRooms);
roomRouter.post("/smart-search", smartSearchRooms);
roomRouter.get("/owner", authMiddleware, getOwnerRooms);
roomRouter.get("/owner/:id", authMiddleware, getOwnerRoomById);
roomRouter.get("/:id", getRoomById);
roomRouter.put("/:id", authMiddleware, upload.array("images", 4), updateRoom);
roomRouter.delete("/:id", authMiddleware, deleteRoom);

roomRouter.post("/toogle-avalibility", authMiddleware, toggleRoomAvailability);
roomRouter.patch("/:id/room-count", authMiddleware, updateRoomCount);
roomRouter.patch("/:id/promo-discount", authMiddleware, updatePromoDiscount);

roomRouter.get("/admin/room-edits", authMiddleware, adminOnly, listRoomEditApplications);
roomRouter.post("/admin/room-edits/:id/approve", authMiddleware, adminOnly, approveRoomEdit);
roomRouter.post("/admin/room-edits/:id/reject", authMiddleware, adminOnly, rejectRoomEdit);

export default roomRouter;