import express from 'express';
import cors from 'cors';
import connectDB from './config/dbConnection.js';
import { configDotenv } from 'dotenv';
configDotenv();
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import merchantRouter from './routes/merchant.route.js';
import morgan from 'morgan';
import hotelRouter from './routes/hotel.route.js';
import roomRouter from './routes/room.routes.js';
import bookingRouter from './routes/booking.route.js';
import { cancelExpiredUnpaidBookings } from './controllers/booking.controller.js';
import reviewRouter from './routes/review.route.js';
import stripeWebhook from './controllers/stripe.webhook.js';
import path from 'path';
import { fileURLToPath } from 'url';

const app = express();
app.use(cors());

// Stripe webhook 需要在全局 json 解析前使用 raw
app.post("/api/stripe", express.raw({ type: 'application/json' }), stripeWebhook);

// 其余接口统一使用 JSON 解析
app.use(express.json());
app.use(morgan('dev'));

// 静态服务本地上传的图片
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.get('/favicon.ico', (req, res) => res.status(204).end());

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/merchant", merchantRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/bookings", bookingRouter);
app.use("/api/reviews", reviewRouter);

// 生产环境：托管前端构建，访问根路径可打开网站（阿里云单机部署）
const clientDist = path.join(__dirname, "../client/dist");
const { existsSync } = await import("fs");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  // 用中间件做 SPA 回退，避免 Express 5 通配符路由 path-to-regexp 报错
  app.use((req, res, next) => {
    if (req.path.startsWith("/api") || req.path.startsWith("/uploads")) return next();
    res.sendFile(path.join(clientDist, "index.html"));
  });
} else {
  app.get("/", (req, res) => res.send("API is running..."));
}

const PORT = process.env.PORT || 5000;

// 先连接数据库，再启动监听，避免监听后因 MongoDB 未就绪而 process.exit(1)
await connectDB();

// 定时取消超时未支付订单（15分钟），每分钟执行一次
setInterval(() => {
  cancelExpiredUnpaidBookings().catch((err) => console.error("[定时任务] 取消超时订单失败:", err));
}, 60 * 1000);
// 启动时立即执行一次
cancelExpiredUnpaidBookings().catch((err) => console.error("[定时任务] 取消超时订单失败:", err));

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});