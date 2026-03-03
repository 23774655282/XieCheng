# 易宿酒店预订系统

一个全栈酒店预订 Web 应用，支持用户搜索、预订酒店，商户管理酒店与房型，管理员审核与平台管理。


### 线上预览地址：

http://120.55.126.95/



## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、Vite、React Router、Tailwind CSS、Axios |
| 后端 | Node.js、Express 5、MongoDB、Mongoose |
| 认证 | Clerk / JWT |
| 地图 | 高德地图|
| AI | 通义千问 / DeepSeek（意图解析、Embedding、推荐理由） |
| 向量库 | LanceDB（语义检索） |
| 实时推送 | Socket.IO（推荐理由 WebSocket 推送） |

## 功能概览

### 用户端
- **首页**：轮播图、热门城市、精选目的地、限时优惠
- **搜索**：目的地、日期、人数筛选，智能搜索
- **酒店列表**：分页/懒加载，筛选（房型、价格、星级、设施）
- **酒店详情**：大图轮播、房型价格、用户评价、收藏
- **房间详情**：房型信息、在线预订、库存校验
- **我的预订**：订单列表、支付、取消
- **个人中心**：资料、收藏、密码修改
- **旅行地图**：高德地图展示酒店位置
- **AI 酒店助手**：自然语言对话，RAG 向量检索 + LLM 意图解析，实时推荐房型及理由

### 商户端
- **酒店信息**：编辑酒店基础信息、图片
- **房型管理**：添加/编辑/删除房型，上下架
- **商户申请**：提交入驻申请，等待审核

### 管理端
- **酒店审核**：审核商户入驻、酒店补充信息
- **房型审核**：审核房型新增/修改
- **商户申请**：处理商户入驻申请

## 项目结构

```
Hotel-Booking-main/
├── client/                 # 前端 (React + Vite)
│   ├── src/
│   │   ├── components/    # 公共组件
│   │   ├── context/       # 全局状态
│   │   ├── pages/         # 页面
│   │   ├── utils/         # 工具
│   │   └── assets/        # 静态资源
│   └── package.json
├── server/                 # 后端 (Express)
│   ├── config/            # 配置
│   ├── controllers/       # 控制器
│   ├── models/            # 数据模型
│   ├── routes/            # 路由
│   ├── services/          # RAG 服务（向量索引、检索、推荐理由）
│   ├── middlewares/       # 中间件
│   ├── ws.js              # WebSocket 推荐理由推送
│   └── server.js
└── README.md
```


## 数据库结构（MongoDB + Mongoose）

### 核心集合

| 集合 | 说明 | 主要字段 |
|------|------|----------|
| **User** | 用户 | `_id`, `username`, `phone`, `passwordHash`, `role`(user/merchant/admin), `favoriteHotels`, `merchantApplicationStatus` |
| **Hotel** | 酒店 | `name`, `address`, `owner`, `city`, `latitude`, `longitude`, `starRating`, `status`(pending_audit/approved/rejected), `images`, `hotelIntro` |
| **Room** | 房型 | `hotel`, `roomType`, `pricePerNight`, `amenties`, `images`, `roomCount`, `promoDiscount`, `status` |
| **Booking** | 预订 | `user`, `room`, `hotel`, `checkInDate`, `checkOutDate`, `totalPrice`, `status`(pending/confirmed/cancelled), `isPaid`, `stayStatus` |
| **Review** | 评价 | `user`, `hotel`, `rating`, `comment`, `images`, `booking` |


### 关系说明

- `User` ↔ `Hotel`：`owner` 关联
- `Hotel` ↔ `Room`：一对多
- `User` ↔ `Booking` ↔ `Room` ↔ `Hotel`：预订关联用户、房型、酒店
- `Review` 关联 `User`、`Hotel`、`Booking`

## 快速开始

### 环境要求

- Node.js 18+
- MongoDB

### 1. 克隆项目

```bash
git clone https://github.com/23774655282/-test.git
cd Hotel-Booking-main
```

### 2. 安装依赖

```bash
# 前端
cd client && npm install

# 后端
cd ../server && npm install
```

### 3. 配置环境变量

在 `client/.env` 中配置 `VITE_BACKEND_URL=http://localhost:3000`。后端 `server/.env` 需配置 `MONGO_URI`、`AI_API_KEY`；启用 AI 智能搜索还需 `AI_EMBEDDING_API_KEY`、`AI_EMBEDDING_BASE_URL`、`AI_REASON_*` 等。

### 4. 启动服务

```bash
# 终端 1：启动后端
cd server && npm start

# 终端 2：启动前端
cd client && npm run dev
```


## 生产部署

构建前端后，Express 会托管 `client/dist` 静态资源：

```bash
cd client && npm run build
cd ../server && npm start
```

## AI 智能搜索（RAG）

智能搜索采用 RAG（检索增强生成）流程：

1. **向量索引**：启动时从 MongoDB 拉取已审核、可预订房间，经 Embedding API 向量化后写入 LanceDB
2. **并行检索**：用户输入自然语言 → LLM 解析意图（目的地、预算、房型等）+ 向量语义检索（LanceDB cosine 相似度）
3. **后置过滤**：按目的地、预算、房型做硬性过滤
4. **推荐理由**：首屏 3 条同步生成，其余后台并行生成并通过 WebSocket 推送

**环境变量**（`server/.env`）：`AI_API_KEY`、`AI_EMBEDDING_API_KEY`、`AI_EMBEDDING_BASE_URL`、`AI_REASON_MODEL`（qwen-turbo）、`AI_REASON_BASE_URL` 等。

## 主要 API

| 路径 | 说明 |
|------|------|
| `/api/auth` | 登录、注册、找回密码 |
| `/api/users` | 用户信息、收藏 |
| `/api/hotels` | 酒店 CRUD、公开查询 |
| `/api/rooms` | 房型 CRUD、查询、智能搜索、推荐理由 |
| `/api/bookings` | 预订、支付、取消 |
| `/api/reviews` | 评价 |
| `/api/amap` | 高德地图代理 |

## 许可证

ISC
