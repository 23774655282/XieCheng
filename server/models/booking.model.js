import mongoose, { Schema } from "mongoose";

const bookingSchema = new Schema({
    user:{
        type: String,
        ref: 'User',
        required: true,
    },
    room:{
        type: String,
        ref: 'Room',
        required: true,
    },
    /** 该订单预订的该房型间数 */
    roomQuantity: { type: Number, default: 1, min: 1 },
    hotel:{
        type: String,
        ref: 'Hotel',
        required: true,
    },
    checkInDate:{
        type: Date,
        required: true,
    },
    checkOutDate:{
        type: Date,
        required: true,
    },
    totalPrice:{
        type: Number,
        required: true,
    },
    guests:{
        type: Number,
        required: true,
    },
    /** 预定确认单联系人信息 */
    guestName: { type: String, default: null },
    guestEmail: { type: String, default: null },
    guestPhone: { type: String, default: null },
    guestRemark: { type: String, default: null },
    status:{
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'merchant', 'system'],
        default: null,
    },
    cancelReason: {
        type: String,
        default: null,
    },
    paymentMethod:{
        type: String,
        required: true,
        default: "COD"
    },
    isPaid:{
        type: Boolean,
        default: false,
    },
    /** 用户入住后主动标记“已完成”的状态，用于驱动评价入口等 */
    isCompleted: {
        type: Boolean,
        default: false,
    },
    /** 该订单是否已经发表过评价（防止重复评价） */
    hasReview: {
        type: Boolean,
        default: false,
    },
    /** 扫码付款：一次性确认 token，手机打开 pay-success 页后带此 token 调用 confirm-payment 即视为已付款 */
    paymentConfirmToken: { type: String, default: null },
    paymentConfirmTokenExpiresAt: { type: Date, default: null },
    /** 退款申请：用户对已完成订单申请退款，由商家审核 */
    refundRequested: { type: Boolean, default: false },
    refundReason: { type: String, default: null },
    refundStatus: { type: String, enum: ['pending', 'approved', 'rejected'], default: null },
    refundReviewedAt: { type: Date, default: null },
    refundReviewedBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    /** 商家拒绝退款后，用户申请平台介入 */
    refundPlatformReviewRequested: { type: Boolean, default: false },
    refundPlatformReviewReason: { type: String, default: null },
    /** 商家也可请求平台介入退款审核 */
    merchantRequestedPlatformIntervention: { type: Boolean, default: false },
    /** 入住状态：待入住、已入住、已退房，由商家修改 */
    stayStatus: {
        type: String,
        enum: ['pending_checkin', 'checked_in', 'checked_out'],
        default: 'pending_checkin',
    },
},{timestamps: true});


const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;