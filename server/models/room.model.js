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
},{timestamps: true});


const Room = mongoose.model('Room', roomSchema);

export default Room;