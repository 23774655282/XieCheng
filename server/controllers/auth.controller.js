import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";
import RegisterVerification from "../models/registerVerification.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";
const REGISTER_CODE_EXPIRE_MS = 10 * 60 * 1000;
const REGISTER_CODE_COOLDOWN_MS = 60 * 1000;

function signToken(user) {
  return jwt.sign(
    {
      userId: user._id,
      role: user.role,
      phone: user.phone,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/** 注册：发送验证码（仅未注册手机号，60秒内只能获取一次） */
export const requestRegisterCode = async (req, res) => {
  try {
    const { phone } = req.body;
    const p = String(phone || "").trim();
    if (!p) {
      return res.status(400).json({ success: false, message: "请输入手机号" });
    }
    const existing = await User.findOne({ phone: p });
    if (existing) {
      return res.status(400).json({ success: false, message: "该手机号已注册" });
    }
    const recent = await RegisterVerification.findOne({ phone: p })
      .sort({ createdAt: -1 })
      .lean();
    if (recent && Date.now() - new Date(recent.createdAt).getTime() < REGISTER_CODE_COOLDOWN_MS) {
      return res.status(429).json({ success: false, message: "验证码发送过于频繁，请60秒后再试" });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await RegisterVerification.deleteMany({ phone: p });
    await RegisterVerification.create({
      phone: p,
      code,
      expiresAt: new Date(Date.now() + REGISTER_CODE_EXPIRE_MS),
    });
    return res.status(200).json({
      success: true,
      message: "验证码已发送",
      ...(process.env.NODE_ENV !== "production" && { devCode: code }),
    });
  } catch (error) {
    console.error("requestRegisterCode error:", error);
    return res.status(500).json({ success: false, message: "发送失败" });
  }
};

export const register = async (req, res) => {
  try {
    const { username, phone, password, code, email, avatar } = req.body;
    const p = String(phone || "").trim();

    // 禁止通过注册接口设置 role，只允许创建普通用户
    if (req.body.role != null && req.body.role !== "user") {
      return res.status(403).json({ success: false, message: "role cannot be set during registration" });
    }

    if (!username || !p || !password || !code) {
      return res.status(400).json({ success: false, message: "缺少必填字段（含验证码）" });
    }

    const existing = await User.findOne({ phone: p });
    if (existing) {
      return res.status(400).json({ success: false, message: "该手机号已注册" });
    }

    const verification = await RegisterVerification.findOne({ phone: p }).sort({ createdAt: -1 });
    if (!verification || verification.code !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "验证码错误" });
    }
    if (new Date(verification.expiresAt) < new Date()) {
      await RegisterVerification.deleteMany({ phone: p });
      return res.status(400).json({ success: false, message: "验证码已过期，请重新获取" });
    }
    await RegisterVerification.deleteMany({ phone: p });

    const passwordHash = await bcrypt.hash(password, 10);
    const id = new mongoose.Types.ObjectId().toString();

    const userData = {
      _id: id,
      username,
      phone: p,
      email: email && String(email).trim() ? String(email).trim().toLowerCase() : `${p}@local.fake`,
      passwordHash,
      role: "user",
    };
    if (avatar != null && String(avatar).trim()) userData.avatar = String(avatar).trim();

    const user = await User.create(userData);

    const token = signToken(user);

    return res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("register error:", error);
    return res.status(500).json({ success: false, message: "注册失败" });
  }
};

export const login = async (req, res) => {
  try {
    const { phone, password } = req.body;
    const p = phone != null ? String(phone).trim() : "";
    const pw = password != null ? String(password) : "";
    if (!p || !pw) {
      return res.status(400).json({ success: false, message: "请输入账号和密码" });
    }

    const user = await User.findOne({ phone: p });
    if (!user) {
      console.log("[login] 用户不存在", { phone: p });
      return res.status(404).json({ success: false, message: "账号不存在" });
    }
    if (!user.passwordHash) {
      console.log("[login] 用户无密码记录，无法使用密码登录", { phone: p });
      return res.status(400).json({ success: false, message: "账号或密码错误" });
    }

    const match = await bcrypt.compare(pw, user.passwordHash);
    if (!match) {
      console.log("[login] 密码不匹配", { phone: p });
      return res.status(400).json({ success: false, message: "账号或密码错误" });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("login error:", error);
    return res.status(500).json({ success: false, message: "登录失败" });
  }
};

/** 验证码登录： Step1 发送验证码 */
export const requestLoginCode = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: "请输入手机号" });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "该手机号未注册" });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.loginCode = code;
    user.loginCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({
      success: true,
      message: "验证码已发送",
      ...(process.env.NODE_ENV !== "production" && { devCode: code }),
    });
  } catch (error) {
    console.error("requestLoginCode error:", error);
    return res.status(500).json({ success: false, message: "发送失败" });
  }
};

/** 验证码登录： Step2 验证码登录 */
export const loginByCode = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "请输入手机号和验证码" });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user || !user.loginCode) {
      return res.status(400).json({ success: false, message: "验证码无效或已过期" });
    }
    if (user.loginCodeExpiresAt < new Date()) {
      user.loginCode = null;
      user.loginCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: "验证码已过期，请重新获取" });
    }
    if (user.loginCode !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "验证码错误" });
    }
    user.loginCode = null;
    user.loginCodeExpiresAt = null;
    await user.save({ validateBeforeSave: false });
    const token = signToken(user);
    return res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        phone: user.phone,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("loginByCode error:", error);
    return res.status(500).json({ success: false, message: "登录失败" });
  }
};

/** 忘记密码 Step1：填写账号，发送验证码 */
export const requestResetCode = async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone || !String(phone).trim()) {
      return res.status(400).json({ success: false, message: "请输入手机号" });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user) {
      return res.status(404).json({ success: false, message: "该手机号未注册" });
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    user.resetCode = code;
    user.resetCodeExpiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10分钟
    await user.save({ validateBeforeSave: false });
    // 生产环境应通过短信发送，此处为开发方便返回（可移除）
    return res.status(200).json({
      success: true,
      message: "验证码已发送",
      ...(process.env.NODE_ENV !== "production" && { devCode: code }),
    });
  } catch (error) {
    console.error("requestResetCode error:", error);
    return res.status(500).json({ success: false, message: "发送失败" });
  }
};

/** 忘记密码 Step2：验证码校验 */
export const verifyResetCode = async (req, res) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ success: false, message: "请输入手机号和验证码" });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user || !user.resetCode) {
      return res.status(400).json({ success: false, message: "验证码无效或已过期" });
    }
    if (user.resetCodeExpiresAt < new Date()) {
      user.resetCode = null;
      user.resetCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: "验证码已过期，请重新获取" });
    }
    if (user.resetCode !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "验证码错误" });
    }
    return res.status(200).json({ success: true, message: "验证通过" });
  } catch (error) {
    console.error("verifyResetCode error:", error);
    return res.status(500).json({ success: false, message: "验证失败" });
  }
};

/** 忘记密码 Step3：重置密码 */
export const resetPassword = async (req, res) => {
  try {
    const { phone, code, newPassword } = req.body;
    if (!phone || !code || !newPassword) {
      return res.status(400).json({ success: false, message: "请填写完整信息" });
    }
    const user = await User.findOne({ phone: String(phone).trim() });
    if (!user || !user.resetCode) {
      return res.status(400).json({ success: false, message: "验证已失效，请重新操作" });
    }
    if (user.resetCodeExpiresAt < new Date()) {
      user.resetCode = null;
      user.resetCodeExpiresAt = null;
      await user.save({ validateBeforeSave: false });
      return res.status(400).json({ success: false, message: "验证码已过期，请重新获取" });
    }
    if (user.resetCode !== String(code).trim()) {
      return res.status(400).json({ success: false, message: "验证码错误" });
    }
    const passwordHash = await bcrypt.hash(String(newPassword).trim(), 10);
    user.passwordHash = passwordHash;
    user.resetCode = null;
    user.resetCodeExpiresAt = null;
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: "密码重置成功" });
  } catch (error) {
    console.error("resetPassword error:", error);
    return res.status(500).json({ success: false, message: "重置失败" });
  }
};

