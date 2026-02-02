# 易宿酒店预订平台 - 后端服务

Node.js + Express + TypeScript + MongoDB

## 环境要求

- Node.js 18+
- MongoDB（本地或远程）

## 启动

```bash
# 安装依赖
npm install

# 复制环境变量（若 .env 不存在）
cp .env.example .env

# 开发模式（热重载）
npm run dev
```

服务默认运行在 `http://localhost:3000`

## 环境变量

| 变量 | 说明 | 默认 |
|------|------|------|
| PORT | 端口 | 3000 |
| MONGODB_URI | MongoDB 连接串 | mongodb://127.0.0.1:27017/yisu |
| JWT_SECRET | JWT 密钥 | dev-secret-change-in-production |

## API 概览

### 认证
- `POST /api/auth/register` 注册（body: username, password, role）
- `POST /api/auth/login` 登录（body: username, password）

### 商户（需 Bearer token，role=merchant）
- `POST /api/merchant/hotels` 创建酒店
- `GET /api/merchant/hotels` 我的酒店列表
- `GET /api/merchant/hotels/:id` 酒店详情
- `PUT /api/merchant/hotels/:id` 编辑酒店
- `POST /api/merchant/hotels/:id/submit` 提交审核

### 管理员（需 Bearer token，role=admin）
- `GET /api/admin/hotels` 审核列表
- `GET /api/admin/hotels/:id` 酒店详情
- `POST /api/admin/hotels/:id/approve` 通过
- `POST /api/admin/hotels/:id/reject` 拒绝（body: reason）
- `POST /api/admin/hotels/:id/publish` 发布
- `POST /api/admin/hotels/:id/offline` 下线
- `POST /api/admin/hotels/:id/restore` 恢复

### 用户端（公开）
- `GET /api/hotels` 酒店列表（仅 online，支持 city/keyword/star/priceMin/priceMax/tags/page/pageSize）
- `GET /api/hotels/:id` 酒店详情
- `GET /api/hotels/:id/rooms` 房型列表（按价格升序）
