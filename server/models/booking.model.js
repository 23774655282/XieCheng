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
    status:{
        type: String,
        enum: ['pending', 'confirmed', 'cancelled'],
        default: 'pending',
    },
    cancelledBy: {
        type: String,
        enum: ['user', 'merchant'],
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
    /** 扫码付款：一次性确认 token，手机打开 pay-success 页后带此 token 调用 confirm-payment 即视为已付款 */
    paymentConfirmToken: { type: String, default: null },
    paymentConfirmTokenExpiresAt: { type: Date, default: null },
},{timestamps: true});


const Booking = mongoose.model('Booking', bookingSchema);

export default Booking;