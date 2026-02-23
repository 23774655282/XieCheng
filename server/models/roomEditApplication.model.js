import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    room: { type: Schema.Types.ObjectId, ref: "Room", required: true },
    hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
    /** 待审核的修改内容 */
    roomType: { type: String },
    pricePerNight: { type: Number },
    amenties: { type: [String] },
    promoDiscount: { type: Number },
    roomCount: { type: Number },
    images: { type: [String] },
    status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    rejectReason: { type: String, default: "" },
    reviewedAt: { type: Date },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

const RoomEditApplication = mongoose.model("RoomEditApplication", schema);
export default RoomEditApplication;
