import express from "express";
import {
  register,
  requestRegisterCode,
  login,
  requestLoginCode,
  loginByCode,
  requestResetCode,
  verifyResetCode,
  resetPassword,
} from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.post("/register/send-code", express.json(), requestRegisterCode);
authRouter.post("/register", express.json(), register);
authRouter.post("/login", express.json(), login);
authRouter.post("/login/send-code", express.json(), requestLoginCode);
authRouter.post("/login/by-code", express.json(), loginByCode);
authRouter.post("/forgot-password/request", express.json(), requestResetCode);
authRouter.post("/forgot-password/verify", express.json(), verifyResetCode);
authRouter.post("/forgot-password/reset", express.json(), resetPassword);

export default authRouter;

