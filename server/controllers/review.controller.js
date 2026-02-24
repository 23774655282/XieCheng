import Review from "../models/review.model.js";
import Hotel from "../models/hotel.model.js";
import Booking from "../models/booking.model.js";
import mongoose from "mongoose";

/** 用户端：创建评论 */
export const createReview = async (req, res) => {
    try {
        const { hotelId, bookingId, rating, comment } = req.body;
        const userId = req.user._id;

        if (!hotelId || !rating || !comment) {
            return res.status(400).json({
                success: false,
                message: "酒店ID、评分和评论内容都是必填项",
            });
        }

        if (rating < 1 || rating > 5) {
            return res.status(400).json({
                success: false,
                message: "评分必须在1-5之间",
            });
        }

        // 检查酒店是否存在且已审核通过
        let hotel;
        try {
            hotel = await Hotel.findOne({ _id: hotelId, status: "approved" });
        } catch (err) {
            // 如果 hotelId 格式不正确
            return res.status(400).json({
                success: false,
                message: "无效的酒店ID",
            });
        }
        
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "酒店不存在或未审核通过",
            });
        }

        // 必须检查用户是否已经完成过该酒店的订单
        let linkedBooking = null;
        if (bookingId) {
            linkedBooking = await Booking.findById(bookingId);
            if (!linkedBooking) {
                return res.status(404).json({
                    success: false,
                    message: "关联的订单不存在",
                });
            }
            if (String(linkedBooking.user) !== String(userId) || String(linkedBooking.hotel) !== String(hotelId)) {
                return res.status(403).json({
                    success: false,
                    message: "无权评价该订单",
                });
            }
            // 必须已完成该订单才能评价
            if (!linkedBooking.isCompleted) {
                return res.status(403).json({
                    success: false,
                    message: "只有完成订单后才能评价，请先在订单页面标记订单为完成",
                });
            }
        } else {
            return res.status(400).json({
                success: false,
                message: "评价需关联订单，请从订单详情提交",
            });
        }

        // 每笔订单只能评价一次：若已传入订单且该订单已评价，则拒绝
        if (linkedBooking && linkedBooking.hasReview) {
            return res.status(400).json({
                success: false,
                message: "该订单已评价过",
            });
        }

        // 处理图片（最多 3 张，由路由的 multer 限制）
        let imageUrls = [];
        if (req.files && req.files.length > 0) {
            const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
            imageUrls = req.files.map((f) => `${baseUrl}/uploads/reviews/${f.filename}`);
        }

        // 创建评论
        const review = await Review.create({
            user: userId,
            hotel: hotelId,
            rating: Number(rating),
            comment: comment.trim(),
            booking: linkedBooking?._id || null,
            images: imageUrls,
        });

        // 填充用户信息
        await review.populate("user", "username email");

        // 如果有订单，标记订单已评价
        if (linkedBooking) {
            linkedBooking.hasReview = true;
            await linkedBooking.save();
        }

        return res.status(201).json({
            success: true,
            message: "评论发表成功",
            review,
        });
    } catch (error) {
        console.error("Error creating review:", error);
        return res.status(500).json({
            success: false,
            message: "发表评论失败",
        });
    }
};

/** 用户端：获取酒店评论统计（评分 + 点评数），用于列表页 */
export const getHotelReviewStats = async (req, res) => {
    try {
        const { hotelId } = req.params;
        if (!hotelId || !mongoose.Types.ObjectId.isValid(hotelId)) {
            return res.status(400).json({ success: false, message: "无效的酒店ID" });
        }
        const total = await Review.countDocuments({ hotel: String(hotelId) });
        const result = await Review.aggregate([
            { $match: { hotel: String(hotelId) } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } },
        ]);
        const avgRating = result.length > 0 ? Number(result[0].avgRating.toFixed(1)) : 0;
        return res.status(200).json({ success: true, avgRating, total });
    } catch (error) {
        console.error("Error fetching hotel review stats:", error);
        return res.status(500).json({ success: false, message: "获取评论统计失败" });
    }
};

/** 用户端：获取酒店的评论列表 */
export const getHotelReviews = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const { page = 1, limit = 10 } = req.query;

        if (!hotelId) {
            return res.status(400).json({
                success: false,
                message: "酒店ID是必填项",
            });
        }

        // 检查酒店是否存在
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "酒店不存在",
            });
        }

        const limitNum = Math.min(200, Math.max(1, Number(limit)));
        const skip = (Math.max(1, Number(page)) - 1) * limitNum;
        
        // 确保 hotelId 是有效的 ObjectId
        if (!mongoose.Types.ObjectId.isValid(hotelId)) {
            return res.status(400).json({
                success: false,
                message: "无效的酒店ID",
            });
        }
        
        const reviews = await Review.find({ hotel: hotelId })
            .populate("user", "username email")
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limitNum);

        const total = await Review.countDocuments({ hotel: hotelId });

        // 计算平均评分（Review 模型中 hotel 存的是 String，用 hotelId 字符串匹配）
        const avgRatingResult = await Review.aggregate([
            { $match: { hotel: String(hotelId) } },
            { $group: { _id: null, avgRating: { $avg: "$rating" } } },
        ]);
        const avgRating = avgRatingResult.length > 0 ? avgRatingResult[0].avgRating : 0;

        return res.status(200).json({
            success: true,
            reviews,
            total,
            avgRating: avgRating ? Number(avgRating.toFixed(1)) : 0,
            page: Number(page),
            limit: Number(limit),
        });
    } catch (error) {
        console.error("Error fetching hotel reviews:", error);
        return res.status(500).json({
            success: false,
            message: "获取评论列表失败",
        });
    }
};

/** 用户端：获取当前用户的历史评价列表（我的评价） */
export const getMyReviews = async (req, res) => {
    try {
        const userId = req.user._id;
        const reviews = await Review.find({ user: userId })
            .populate("hotel", "name city")
            .sort({ createdAt: -1 })
            .lean();
        return res.status(200).json({
            success: true,
            reviews,
        });
    } catch (error) {
        console.error("Error fetching my reviews:", error);
        return res.status(500).json({
            success: false,
            message: "获取我的评价失败",
        });
    }
};

/** 用户端：删除自己的评论 */
export const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;

        const review = await Review.findById(reviewId);
        if (!review) {
            return res.status(404).json({
                success: false,
                message: "评论不存在",
            });
        }

        // 只能删除自己的评论
        if (review.user.toString() !== userId.toString()) {
            return res.status(403).json({
                success: false,
                message: "无权删除此评论",
            });
        }

        await Review.findByIdAndDelete(reviewId);

        return res.status(200).json({
            success: true,
            message: "评论已删除",
        });
    } catch (error) {
        console.error("Error deleting review:", error);
        return res.status(500).json({
            success: false,
            message: "删除评论失败",
        });
    }
};
