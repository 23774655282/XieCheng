import express from 'express';
import { authMiddleware } from '../middlewares/auth.middleware.js';
import { uploadAvatar } from '../middlewares/multer.middleware.js';
import { getUserData, recentSerachCities, setRole, updateProfile, getFavorites, addFavorite, removeFavorite } from '../controllers/user.controller.js';

const userRouter = express.Router();

userRouter.get("/", authMiddleware, getUserData);
userRouter.post("/store-recent-search", authMiddleware, recentSerachCities);
userRouter.post("/set-role", authMiddleware, setRole);
userRouter.patch("/profile", authMiddleware, uploadAvatar, updateProfile);
userRouter.get("/favorites", authMiddleware, getFavorites);
userRouter.post("/favorites/:hotelId", authMiddleware, addFavorite);
userRouter.delete("/favorites/:hotelId", authMiddleware, removeFavorite);

export default userRouter;