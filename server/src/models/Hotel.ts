import mongoose from 'mongoose';

export type HotelStatus =
  | 'draft'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'online'
  | 'offline';

const roomTypeSchema = new mongoose.Schema({
  name: { type: String, required: true },
  price: { type: Number, required: true },
  stock: { type: Number, default: 0 },
});

const hotelSchema = new mongoose.Schema(
  {
    nameZh: { type: String, required: true },
    nameEn: { type: String, required: true },
    address: { type: String, required: true },
    star: { type: Number, required: true, min: 1, max: 5 },
    openedAt: { type: Date, required: true },
    roomTypes: [roomTypeSchema],
    status: {
      type: String,
      enum: ['draft', 'pending', 'approved', 'rejected', 'online', 'offline'],
      default: 'draft',
    },
    rejectReason: { type: String },
    merchantId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    images: [{ type: String }],
    tags: [{ type: String }],
    nearby: {
      spots: [{ type: String }],
      traffic: [{ type: String }],
      malls: [{ type: String }],
    },
  },
  { timestamps: true }
);

export const Hotel = mongoose.model('Hotel', hotelSchema);
