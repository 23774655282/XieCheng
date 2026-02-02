import mongoose from 'mongoose';

export type UserRole = 'merchant' | 'admin';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['merchant', 'admin'], required: true },
  },
  { timestamps: true }
);

export const User = mongoose.model('User', userSchema);
