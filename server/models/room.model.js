import mongoose, { Schema } from "mongoose";

const roomSchema = new Schema({
    hotel:{
        type: String,
        ref: 'Hotel',
        required: true,
    },
    roomType:{
        type: String,
        required: true,
    },
    pricePerNight:{
        type: Number,
        required: true,
    },
    amenties:{
        type : Array,
        required: true,
    },
    images:[
        {
            type: String,
        }
    ],
    isAvailable:{
        type: Boolean,
        default: true,
    },
    /** 优惠百分比 0-100，与首页限时优惠档位对应（20/25/30 等），null 表示不参与优惠 */
    promoDiscount: { type: Number, default: null },
    /** 该房型的房间数量（库存） */
    roomCount: { type: Number, default: 1, min: 1 },
    /** 上架审核：pending_audit=待审核，approved=已通过 */
    status: { type: String, enum: ["pending_audit", "approved"], default: "approved" },
},{timestamps: true});


const Room = mongoose.model('Room', roomSchema);

export default Room;