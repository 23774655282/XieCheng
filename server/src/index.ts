import 'dotenv/config';
import mongoose from 'mongoose';
import app from './app.js';

const PORT = process.env.PORT ?? 3000;
const MONGODB_URI = process.env.MONGODB_URI ?? 'mongodb://127.0.0.1:27017/yisu';

async function main() {
  if (!process.env.JWT_SECRET) {
    console.warn('警告: 未设置 JWT_SECRET，请复制 .env.example 为 .env 并配置');
    process.env.JWT_SECRET = 'dev-secret-change-in-production';
  }

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB 已连接');

  app.listen(PORT, () => {
    console.log(`服务已启动: http://localhost:${PORT}`);
  });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
