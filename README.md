# 易宿酒店预订系统

一个全栈酒店预订 Web 应用，支持用户搜索、预订酒店，商户管理酒店与房型，管理员审核与平台管理。
### PC端
<img width="2528" height="1343" alt="image" src="https://github.com/user-attachments/assets/88b40680-6527-4645-ba9b-71c8ef868edb" />
<img width="1764" height="1164" alt="image" src="https://github.com/user-attachments/assets/64fdd520-46a4-476b-84f1-83a6dc27527c" />
<img width="2181" height="1323" alt="image" src="https://github.com/user-attachments/assets/7b9b0ad3-717c-4e2f-bc53-4a3f809151d4" />
### 移动端
![Screenshot_2026-02-26-11-44-04-62_df198e732186825](https://github.com/user-attachments/assets/810d5baa-b652-4157-9fe0-078668b99d00)
![Screenshot_2026-02-26-11-44-10-50_df198e732186825](https://github.com/user-attachments/assets/52f2a0df-808d-4d2c-b081-9ec27b7f4920)
![Screenshot_2026-02-26-11-44-22-76_df198e732186825](https://github.com/user-attachments/assets/0d99c8ba-ad9e-4899-bc36-fc0794022311)


### 线上预览地址：

http://120.55.126.95/
### 管理员账号
13915766291 密码123456
### 商家账号
13915766280 密码123456
### 用户账号
13915766271 密码123456


## 技术栈

| 层级 | 技术 |
|------|------|
| 前端 | React 19、Vite、React Router、Tailwind CSS、Axios |
| 后端 | Node.js、Express 5、MongoDB、Mongoose |
| 认证 | Clerk / JWT |
| 地图 | 高德地图|
| AI | DeepSeek API（智能搜索） |

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
- **AI 酒店助手**：智能对话推荐酒店

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
│   ├── middlewares/       # 中间件
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

在 `client/.env` 中配置 `VITE_BACKEND_URL=http://localhost:3000`，后端在 `server/.env` 中按需配置。

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

## 主要 API

| 路径 | 说明 |
|------|------|
| `/api/auth` | 登录、注册、找回密码 |
| `/api/users` | 用户信息、收藏 |
| `/api/hotels` | 酒店 CRUD、公开查询 |
| `/api/rooms` | 房型 CRUD、查询、智能搜索 |
| `/api/bookings` | 预订、支付、取消 |
| `/api/reviews` | 评价 |
| `/api/amap` | 高德地图代理 |

## 许可证

ISC
