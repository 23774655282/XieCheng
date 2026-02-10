import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  _id: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    trim: true,
    required: true,
  },
  avatar: {
    type: String,
  },
  // 可选邮箱字段（以后需要找回密码可以用）
  email: {
    type: String,
    required: false,
    unique: false,
    lowercase: true,
    trim: true,
    maxlength: 100,
  },
  // 手机号：作为主要登录凭证，唯一
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  passwordHash: {
    type: String,
    required: true,
  },
  role: {
    type: String,
    enum: ['user', 'merchant', 'admin'],  // user=普通用户, merchant=商户, admin=平台管理员
    default: 'user',
  },
  recentSerachCities: [
    {
      type: String,
    },
  ],
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
export default User;