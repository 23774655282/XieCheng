import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { uploadHotel } from "../middlewares/multer.middleware.js";
import { uploadMerchantApply } from "../middlewares/multer.middleware.js";
import {
    listHotelsPublic,
    getHotelPublicById,
    getCities,
    listHotelsForMap,
    searchHotelsPublic,
    registerHotel,
    registerHotelPreReview,
    getOwnerHotels,
    getOwnerHotelById,
    reapplyHotel,
    getMyHotel,
    updateHotel,
    deleteHotel,
    batchListHotels,
    batchDelistHotels,
    submitHotelSupplement,
    listHotelsForAudit,
    getHotelForAuditDetail,
    approveHotel,
    rejectHotel,
    setHotelOffline,
    restoreHotel,
    listHotelSupplementEdits,
    approveHotelSupplementEdit,
    rejectHotelSupplementEdit,
} from "../controllers/hotel.controller.js";

const hotelRouter = express.Router();

// 用户端公开：已审核通过的酒店列表、单酒店详情（含房型列表）、城市列表
hotelRouter.get("/public", listHotelsPublic);
hotelRouter.get("/public/cities", getCities);
hotelRouter.get("/public/map", listHotelsForMap);
hotelRouter.get("/public/search", searchHotelsPublic);
hotelRouter.get("/public/:id", getHotelPublicById);

// 商户端
hotelRouter.post("/", authMiddleware, registerHotel);
hotelRouter.post("/pre-review", authMiddleware, uploadMerchantApply, registerHotelPreReview);
hotelRouter.get("/owner/list", authMiddleware, getOwnerHotels);
hotelRouter.get("/owner/:id", authMiddleware, getOwnerHotelById);
hotelRouter.put("/owner/:id/reapply", authMiddleware, uploadHotel.array("images", 6), reapplyHotel);
hotelRouter.put("/owner/:id/supplement", authMiddleware, uploadHotel.fields([{ name: "exterior", maxCount: 6 }, { name: "interior", maxCount: 6 }]), submitHotelSupplement);
hotelRouter.get("/my", authMiddleware, getMyHotel);
hotelRouter.put("/my", authMiddleware, uploadHotel.array("images", 6), updateHotel);
hotelRouter.delete("/owner/:id", authMiddleware, deleteHotel);
hotelRouter.post("/owner/batch-list", authMiddleware, batchListHotels);
hotelRouter.post("/owner/batch-delist", authMiddleware, batchDelistHotels);

// 管理员端（审核/发布/下线）
hotelRouter.get("/audit", authMiddleware, adminOnly, listHotelsForAudit);
hotelRouter.get("/audit/:id", authMiddleware, adminOnly, getHotelForAuditDetail);
hotelRouter.post("/audit/approve", authMiddleware, adminOnly, approveHotel);
hotelRouter.post("/audit/reject", authMiddleware, adminOnly, rejectHotel);
hotelRouter.post("/audit/offline", authMiddleware, adminOnly, setHotelOffline);
hotelRouter.post("/audit/restore", authMiddleware, adminOnly, restoreHotel);
hotelRouter.get("/audit/supplement-edits", authMiddleware, adminOnly, listHotelSupplementEdits);
hotelRouter.post("/audit/supplement-edits/:id/approve", authMiddleware, adminOnly, approveHotelSupplementEdit);
hotelRouter.post("/audit/supplement-edits/:id/reject", authMiddleware, adminOnly, rejectHotelSupplementEdit);

export default hotelRouter;
