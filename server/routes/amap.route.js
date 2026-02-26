import express from 'express';
import { regeoProxy, inputtipsProxy } from '../controllers/amap.controller.js';

const router = express.Router();
router.get('/regeo', regeoProxy);
router.get('/inputtips', inputtipsProxy);
export default router;
