import express from 'express';
import { regeoProxy } from '../controllers/amap.controller.js';

const router = express.Router();
router.get('/regeo', regeoProxy);
export default router;
