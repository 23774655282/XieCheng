import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { getUserData, recentSerachCities, setRole } from '../controllers/user.controller.js';

const userRouter = express.Router();

userRouter.get("/", authMiddleware, getUserData);
userRouter.post("/store-recent-search", authMiddleware, recentSerachCities);
userRouter.post("/set-role", authMiddleware, setRole);


export default userRouter;