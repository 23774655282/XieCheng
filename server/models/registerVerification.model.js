import mongoose, { Schema } from "mongoose";

const schema = new Schema(
  {
    phone: { type: String, required: true, trim: true },
    code: { type: String, required: true },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

schema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
schema.index({ phone: 1 });

const RegisterVerification = mongoose.model("RegisterVerification", schema);
export default RegisterVerification;
