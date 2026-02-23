import mongoose, { Schema } from "mongoose";

const schema = new Schema(
    {
        hotel: { type: Schema.Types.ObjectId, ref: "Hotel", required: true },
        latitude: { type: Number },
        longitude: { type: Number },
        doorNumber: { type: String },
        totalRoomCount: { type: Number },
        nameEn: { type: String },
        hotelExteriorImages: { type: [String] },
        hotelInteriorImages: { type: [String] },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        rejectReason: { type: String, default: "" },
        reviewedAt: { type: Date },
        reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    },
    { timestamps: true }
);

const HotelSupplementEdit = mongoose.model("HotelSupplementEdit", schema);
export default HotelSupplementEdit;
