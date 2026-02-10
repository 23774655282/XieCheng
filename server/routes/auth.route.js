import express from "express";
import { register, login } from "../controllers/auth.controller.js";

const authRouter = express.Router();

authRouter.post("/register", express.json(), register);
authRouter.post("/login", express.json(), login);

export default authRouter;

