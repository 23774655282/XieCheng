import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    userId: { type: String, ref: "User", required: true },
    /** 申请人姓名 */
    applicantName: { type: String, required: true, trim: true },
    /** 申请人手机号 */
    applicantPhone: { type: String, required: true, trim: true },
    /** 酒店名称 */
    hotelName: { type: String, required: true, trim: true },
    /** 酒店地址 */
    hotelAddress: { type: String, required: true, trim: true },
    /** 酒店所在城市 */
    hotelCity: { type: String, required: true, trim: true },
    /** 酒店联系电话 */
    hotelContact: { type: String, required: true, trim: true },
    /** 营业执照图片 URL */
    licenseUrl: { type: String, required: true },
    /** 星级评定证明图片 URL */
    starRatingCertificateUrl: { type: String, default: "" },
    /** 酒店外部照片 URL 列表 */
    hotelExteriorImages: { type: [String], default: [] },
    /** 酒店内部照片 URL 列表 */
    hotelInteriorImages: { type: [String], default: [] },
    /** 驳回原因（驳回时填写） */
    rejectReason: { type: String, default: "" },
  },
  { timestamps: true }
);

schema.index({ userId: 1 });

const MerchantApplication = mongoose.model("MerchantApplication", schema);
export default MerchantApplication;
