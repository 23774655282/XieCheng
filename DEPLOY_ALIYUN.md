# 阿里云服务器部署指南（易宿酒店预订平台）

本文档说明如何将项目部署到阿里云 ECS，使任何人通过域名或公网 IP 访问。

---

## 一、前期准备

### 1. 阿里云 ECS

- 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
- 购买或使用已有 **ECS 实例**（推荐：2 核 4G 起，系统盘 40G+）
- 系统镜像建议：**Ubuntu 22.04 LTS** 或 **Alibaba Cloud Linux 3**
- 安全组放行：**80（HTTP）、443（HTTPS）、22（SSH）**

### 2. 域名（可选）

- 若有域名，在阿里云「域名」解析到 ECS 公网 IP（A 记录）
- 无域名时可直接用 **http://你的公网IP** 访问

### 3. 数据库与第三方服务

- **MongoDB**：可用 [阿里云云数据库 MongoDB](https://www.aliyun.com/product/mongodb) 或本机自建
- **Clerk / Cloudinary / Stripe / AI API**：沿用现有账号，在服务器 `.env` 中配置

---

## 二、服务器环境安装

SSH 登录 ECS 后执行（以 Ubuntu 为例）：

```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x（LTS）
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # 应显示 v18.x
npm -v

# 安装 Nginx
sudo apt install -y nginx

# 安装 PM2（进程守护）
sudo npm install -g pm2
```

若使用本机 MongoDB：

```bash
# 安装 MongoDB 6.x（可选，不用云数据库时执行）
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

---

## 三、上传代码并构建

### 方式 A：Git 拉取（推荐）

```bash
# 安装 git
sudo apt install -y git

# 创建目录并拉取（替换为你的仓库地址）
cd /var/www
sudo mkdir -p hotel-booking && sudo chown $USER:$USER hotel-booking
cd hotel-booking
git clone https://github.com/你的用户名/Hotel-Booking-main.git .
# 或从本地上传后解压到 /var/www/hotel-booking
```

### 方式 B：本地上传

在本地打包（排除 node_modules 和 .env）：

```bash
# 在项目根目录执行
tar --exclude='node_modules' --exclude='client/node_modules' --exclude='server/node_modules' --exclude='.git' -czvf hotel-booking.tar.gz .
# 用 scp / SFTP 上传 hotel-booking.tar.gz 到服务器后解压
```

### 在服务器上安装依赖并构建

```bash
cd /var/www/hotel-booking

# 1. 后端依赖
cd server
npm install --production
# 复制并编辑环境变量（见下一节）
# cp .env.example .env 或 nano .env

# 2. 前端依赖与构建（同域名部署时 API 用相对路径）
cd ../client
npm install
# 生产环境：API 与前端同域，无需写死后端地址
VITE_BACKEND_URL= npm run build
# 会生成 client/dist 目录
```

---

## 四、配置环境变量

### 1. 后端 `server/.env`

在服务器上编辑 `server/.env`（若没有则复制 `.env.example` 再改）：

```env
# 数据库：云 MongoDB 填 mongodb+srv://... ，本机填下面
MONGO_URI=mongodb://localhost:27017/hotel-booking
PORT=3000

# 以下按你在用的服务填写
CLERK_PUBLISHABLE_KEY=你的Clerk公钥
CLERK_SECRET_KEY=你的Clerk密钥
CLERK_WEBHOOK_SECRET=你的webhook密钥

CLOUDINARY_CLOUD_NAME=你的
CLOUDINARY_API_KEY=你的
CLOUDINARY_API_SECRET=你的

STRIPE_SECRET_KEY=你的Stripe密钥
JWT_SECRET=请改成随机长字符串
AI_API_KEY=你的AI接口密钥
# 如有 AI 模型、Base URL 等也一并写上
```

注意：**不要**把 `.env` 提交到 Git，只在服务器上保留。

### 2. 前端构建时的后端地址

- 若前端与后端**同域名**（通过 Nginx 反向代理），构建时使用：
  ```bash
  VITE_BACKEND_URL= npm run build
  ```
  前端会请求同域下的 `/api`，由 Nginx 转发到 Node。
- 若前后端**不同域**，则：
  ```bash
  VITE_BACKEND_URL=https://api.你的域名.com npm run build
  ```
  并保证该域名在 Nginx 或另一台机上提供 API。

---

## 五、使用 PM2 运行后端

在项目根目录或 server 目录下使用提供的 PM2 配置（见下一节），或直接：

```bash
cd /var/www/hotel-booking/server
pm2 start server.js --name "hotel-api"
# 或使用配置文件：pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 按提示执行，实现开机自启
```

查看状态：`pm2 status`，查看日志：`pm2 logs hotel-api`。

---

## 六、Nginx 配置

创建站点配置（替换域名和路径）：

```bash
sudo nano /etc/nginx/sites-available/hotel-booking
```

写入（**将 `你的域名或IP` 和 `/var/www/hotel-booking` 改成实际值**）：

```nginx
server {
    listen 80;
    server_name 你的域名或IP;   # 例如 www.example.com 或 47.96.xxx.xxx

    root /var/www/hotel-booking/client/dist;
    index index.html;

    # 前端 SPA：所有非文件请求回退到 index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # 后端 API 与上传文件转发到 Node
    location /api {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location /uploads {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
    }
}
```

启用并重载 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

此时应能通过 **http://你的域名或IP** 访问整站（前端 + API）。

---

## 七、HTTPS（可选）

使用 Let's Encrypt 免费证书（需先有域名并已解析到本机）：

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d 你的域名
# 按提示选择是否重定向 HTTP 到 HTTPS
```

证书会自动续期。配置完成后用 **https://你的域名** 访问。

---

## 八、部署清单小结

| 步骤 | 说明 |
|------|------|
| 1 | 购买/准备 ECS，放行 80/443/22 |
| 2 | 安装 Node.js、Nginx、PM2（及可选 MongoDB） |
| 3 | 上传代码到 `/var/www/hotel-booking` |
| 4 | 配置 `server/.env`，安装 server 依赖 |
| 5 | 安装 client 依赖，`VITE_BACKEND_URL= npm run build` |
| 6 | `pm2 start server.js --name hotel-api` 并 `pm2 save`、`pm2 startup` |
| 7 | 配置 Nginx，`root` 指向 `client/dist`，`/api`、`/uploads` 反代到 3000 |
| 8 | 有域名时用 certbot 配置 HTTPS |

---

## 九、常见问题

- **访问显示 502**：检查 `pm2 status` 和 `pm2 logs`，确认后端 3000 端口在监听；检查 Nginx 里 `proxy_pass` 的端口是否与 `server/.env` 的 `PORT` 一致。
- **接口 404**：确认 Nginx 中 `location /api` 和 `location /uploads` 已配置且 `proxy_pass` 为 `http://127.0.0.1:3000`。
- **静态资源或页面刷新 404**：确认 `root` 指向 `client/dist`，且存在 `try_files $uri $uri/ /index.html;`。
- **上传图片/文件失败**：检查 `server/uploads` 目录存在且可写，以及 Nginx 对请求体大小限制（如需可增加 `client_max_body_size`）。

按上述步骤完成后，项目即可通过阿里云 ECS 的地址对外提供访问。
