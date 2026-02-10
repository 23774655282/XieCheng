import mongoose, { Schema } from "mongoose";

const hotelSchema = new Schema({
    name: { type: String, required: true },
    nameEn: { type: String, default: "" },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    owner: { type: String, ref: "User", required: true },
    city: { type: String, required: true },
    // 大作业要求：酒店星级、开业时间、可选维度
    starRating: { type: Number, default: 3 }, // 1-5 星级
    openTime: { type: Date }, // 开业时间
    nearbyAttractions: [{ type: String }], // 附近热门景点/交通/商场
    promotions: [{ type: String }], // 优惠描述，如 "节日8折"、"机酒套餐减100"
    // 审核与上下线：审核中/通过/不通过，下线可恢复
    status: {
        type: String,
        enum: ["pending_audit", "approved", "rejected", "offline"],
        default: "pending_audit",
    },
    rejectReason: { type: String, default: "" },
}, { timestamps: true });

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
