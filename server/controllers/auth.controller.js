import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = "7d";

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

export const register = async (req, res) => {
  try {
    const { username, phone, password } = req.body;

    if (!username || !phone || !password) {
      return res.status(400).json({ success: false, message: "缺少必填字段" });
    }

    const existing = await User.findOne({ phone });
    if (existing) {
      return res.status(400).json({ success: false, message: "该手机号已注册" });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const id = new mongoose.Types.ObjectId().toString();

    const user = await User.create({
      _id: id,
      username,
      phone,
      // 为兼容旧的唯一索引 email_1，这里生成一个基于手机号的假邮箱，保证唯一
      email: `${phone}@local.fake`,
      passwordHash,
      role: "user",
    });

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
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: "缺少手机号或密码" });
    }

    const user = await User.findOne({ phone });
    if (!user || !user.passwordHash) {
      return res.status(400).json({ success: false, message: "手机号或密码错误" });
    }

    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.status(400).json({ success: false, message: "手机号或密码错误" });
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

