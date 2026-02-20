import mongoose, { Schema } from "mongoose";

const reviewSchema = new Schema({
    user: {
        type: String,
        ref: "User",
        required: true,
    },
    hotel: {
        type: String,
        ref: "Hotel",
        required: true,
    },
    rating: {
        type: Number,
        required: true,
        min: 1,
        max: 5,
    },
    comment: {
        type: String,
        required: true,
        trim: true,
    },
    /** 可选：关联到具体的预订订单，用于“我的订单”入口评价 */
    booking: {
        type: String,
        ref: "Booking",
        default: null,
    },
    /** 评论图片（最多 3 张），前端展示在评价下面 */
    images: [{ type: String }],
}, { timestamps: true });

// 确保一个用户对同一酒店只能评论一次（可选，如果需要的话可以启用）
// reviewSchema.index({ user: 1, hotel: 1 }, { unique: true });

const Review = mongoose.model("Review", reviewSchema);
export default Review;
