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
  birthday: {
    type: Date,
    default: null,
  },
  /** 收藏的酒店 ID 列表 */
  favoriteHotels: [{ type: Schema.Types.ObjectId, ref: 'Hotel' }],
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
  /** 商户申请状态：none=未申请, pending=审核中, approved=已通过, rejected=已驳回 */
  merchantApplicationStatus: {
    type: String,
    enum: ['none', 'pending', 'approved', 'rejected'],
    default: 'none',
  },
  recentSerachCities: [
    {
      type: String,
    },
  ],
  /** 找回密码：验证码及过期时间 */
  resetCode: { type: String },
  resetCodeExpiresAt: { type: Date },
  /** 验证码登录：验证码及过期时间 */
  loginCode: { type: String },
  loginCodeExpiresAt: { type: Date },
}, { timestamps: true });

// 管理员与商户互斥：管理员不能成为商户，商户不能成为管理员
userSchema.pre('save', async function (next) {
  if (!this.isModified('role') || this.isNew) return next();
  const current = await this.constructor.findById(this._id).select('role').lean();
  if (!current) return next();
  if (this.role === 'admin' && current.role === 'merchant') {
    return next(new Error('商户不能成为管理员'));
  }
  if (this.role === 'merchant' && current.role === 'admin') {
    return next(new Error('管理员不能成为商户'));
  }
  next();
});

userSchema.pre(['findOneAndUpdate', 'updateOne'], async function (next) {
  const update = this.getUpdate();
  const newRole = update?.role ?? update?.$set?.role;
  if (!newRole || (newRole !== 'admin' && newRole !== 'merchant')) return next();
  const id = this.getQuery()._id ?? this.getQuery().id;
  if (!id) return next();
  const doc = await this.model.findById(id).select('role').lean();
  if (!doc) return next();
  if (newRole === 'admin' && doc.role === 'merchant') {
    return next(new Error('商户不能成为管理员'));
  }
  if (newRole === 'merchant' && doc.role === 'admin') {
    return next(new Error('管理员不能成为商户'));
  }
  next();
});

const User = mongoose.model('User', userSchema);
export default User;