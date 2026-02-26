import mongoose, { Schema } from "mongoose";

/** 商户新增酒店的预审单（与 MerchantApplication 结构相同，按初审对待，出现在预审核列表） */
const schema = new Schema(
    {
        owner: { type: Schema.Types.ObjectId, ref: "User", required: true },
        applicantName: { type: String, required: true, trim: true },
        applicantPhone: { type: String, required: true, trim: true },
        hotelName: { type: String, required: true, trim: true },
        hotelAddress: { type: String, required: true, trim: true },
        hotelCity: { type: String, required: true, trim: true },
        hotelDistrict: { type: String, default: "", trim: true },
        hotelContact: { type: String, required: true, trim: true },
        licenseUrl: { type: String, required: true },
        starRatingCertificateUrl: { type: String, default: "" },
        hotelExteriorImages: { type: [String], default: [] },
        hotelInteriorImages: { type: [String], default: [] },
        status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
        rejectReason: { type: String, default: "" },
    },
    { timestamps: true }
);

schema.index({ owner: 1, status: 1 });

const HotelPreReviewApplication = mongoose.model("HotelPreReviewApplication", schema);
export default HotelPreReviewApplication;
