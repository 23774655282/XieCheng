import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
    createReview,
    getHotelReviews,
    getHotelReviewStats,
    getMyReviews,
    deleteReview,
} from "../controllers/review.controller.js";
import { uploadReview } from "../middlewares/multer.middleware.js";

const reviewRouter = express.Router();

// 用户端：创建评论（需要登录，支持最多 3 张图片）
reviewRouter.post("/", authMiddleware, uploadReview.array("images", 3), createReview);

// 用户端：获取酒店评论统计（评分、点评数）
reviewRouter.get("/hotel/:hotelId/stats", getHotelReviewStats);
// 用户端：获取酒店的评论列表（公开）
reviewRouter.get("/hotel/:hotelId", getHotelReviews);

// 用户端：获取当前用户的历史评价（需要登录）
reviewRouter.get("/me", authMiddleware, getMyReviews);

// 用户端：删除自己的评论（需要登录）
reviewRouter.delete("/:reviewId", authMiddleware, deleteReview);

export default reviewRouter;
