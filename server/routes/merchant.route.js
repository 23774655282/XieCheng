import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { adminOnly } from "../middlewares/admin.middleware.js";
import { uploadMerchantApply } from "../middlewares/multer.middleware.js";
import {
  applyMerchant,
  getMyApplication,
  listMerchantApplications,
  approveMerchantApplication,
  rejectMerchantApplication,
} from "../controllers/merchant.controller.js";

const merchantRouter = express.Router();

// 普通用户申请成为商户（提交执照、酒店信息等）
merchantRouter.post("/apply", authMiddleware, uploadMerchantApply, applyMerchant);
// 当前用户查看自己的申请详情
merchantRouter.get("/my-application", authMiddleware, getMyApplication);

// 管理员：商户申请审核
merchantRouter.get("/applications", authMiddleware, adminOnly, listMerchantApplications);
merchantRouter.post("/applications/:id/approve", authMiddleware, adminOnly, approveMerchantApplication);
merchantRouter.post("/applications/:id/reject", authMiddleware, adminOnly, rejectMerchantApplication);

export default merchantRouter;
