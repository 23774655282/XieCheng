import jwt from "jsonwebtoken";
import User from "../models/user.model.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";

/**
 * 基于 JWT 的本地鉴权中间件：
 * - 从 Authorization: Bearer <token> 中解析 token
 * - 验证后在 req.user 上挂载当前用户
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || "";
    const [scheme, token] = authHeader.split(" ");

    if (scheme !== "Bearer" || !token) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    let payload;
    try {
      payload = jwt.verify(token, JWT_SECRET);
    } catch {
      return res.status(401).json({ message: "Invalid token" });
    }

    const user = await User.findById(payload.userId);
    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("authMiddleware error:", error);
    return res.status(500).json({ message: "Auth error" });
  }
};