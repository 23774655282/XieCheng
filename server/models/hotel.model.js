import mongoose, { Schema } from "mongoose";

const hotelSchema = new Schema({
    name: { type: String, required: true },
    nameEn: { type: String, default: "" },
    address: { type: String, required: true },
    contact: { type: String, required: true },
    owner: { type: String, ref: "User", required: true },
    city: { type: String, required: true },
    /** 地图展示用：纬度、经度（可选，无则按城市中心展示） */
    latitude: { type: Number, default: null },
    longitude: { type: Number, default: null },
    // 大作业要求：酒店星级、开业时间、可选维度
    starRating: { type: Number, default: 3 }, // 1-5 星级
    openTime: { type: Date }, // 开业时间
    /** 商家维护的酒店整体介绍文案，展示在详情页酒店信息区域 */
    hotelIntro: { type: String, default: "" },
    nearbyAttractions: [{ type: String }], // 附近热门景点/交通/商场（旧字段，兼容保留）
    promotions: [{ type: String }], // 优惠描述，如 "节日8折"、"机酒套餐减100"
    // 审核与上下线：审核中/通过/不通过，下线可恢复
    status: {
        type: String,
        enum: ["pending_audit", "approved", "rejected", "offline"],
        default: "pending_audit",
    },
    rejectReason: { type: String, default: "" },
    images: [{ type: String }], // 酒店展示图，供用户端展示
}, { timestamps: true });

const Hotel = mongoose.model("Hotel", hotelSchema);
export default Hotel;
