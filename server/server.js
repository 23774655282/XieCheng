import express from 'express';
import cors from 'cors';
import connectDB from './config/dbConnection.js';
import { configDotenv } from 'dotenv';
configDotenv();
import userRouter from './routes/user.route.js';
import authRouter from './routes/auth.route.js';
import morgan from 'morgan';
import hotelRouter from './routes/hotel.route.js';
import roomRouter from './routes/room.routes.js';
import bookingRouter from './routes/booking.route.js';
import stripeWebhook from './controllers/stripe.webhook.js';
import path from 'path';
import { fileURLToPath } from 'url';

connectDB();

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

app.get('/', (req, res) => {
  res.send('API is running...');
});

app.use("/api/auth", authRouter);
app.use("/api/users", userRouter);
app.use("/api/hotels", hotelRouter);
app.use("/api/rooms", roomRouter);
app.use("/api/bookings", bookingRouter);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});