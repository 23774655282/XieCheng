import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { uploadHotel } from "../middlewares/multer.middleware.js";
import {
    listHotelsPublic,
    getHotelPublicById,
    getCities,
    listHotelsForMap,
    registerHotel,
    getMyHotel,
    updateHotel,
    listHotelsForAudit,
    approveHotel,
    rejectHotel,
    setHotelOffline,
    restoreHotel,
} from "../controllers/hotel.controller.js";

const hotelRouter = express.Router();

// 用户端公开：已审核通过的酒店列表、单酒店详情（含房型列表）、城市列表
hotelRouter.get("/public", listHotelsPublic);
hotelRouter.get("/public/cities", getCities);
hotelRouter.get("/public/map", listHotelsForMap);
hotelRouter.get("/public/:id", getHotelPublicById);

// 商户端
hotelRouter.post("/", authMiddleware, registerHotel);
hotelRouter.get("/my", authMiddleware, getMyHotel);
hotelRouter.put("/my", authMiddleware, uploadHotel.array("images", 6), updateHotel);

// 管理员端（审核/发布/下线）
hotelRouter.get("/audit", authMiddleware, adminOnly, listHotelsForAudit);
hotelRouter.post("/audit/approve", authMiddleware, adminOnly, approveHotel);
hotelRouter.post("/audit/reject", authMiddleware, adminOnly, rejectHotel);
hotelRouter.post("/audit/offline", authMiddleware, adminOnly, setHotelOffline);
hotelRouter.post("/audit/restore", authMiddleware, adminOnly, restoreHotel);

export default hotelRouter;
