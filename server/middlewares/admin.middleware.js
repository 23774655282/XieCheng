import User from "../models/user.model.js";

/** 仅平台管理员可访问 */
export const adminOnly = async (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ success: false, message: "仅管理员可操作" });
    }
    next();
};
