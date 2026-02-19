# 阿里云服务器部署完整指南

本指南将详细说明如何将酒店预订系统部署到阿里云服务器上。

---

## 📋 前置准备

### 1. 服务器信息
- **服务器公网IP**：`你的服务器IP`
- **操作系统**：推荐 Ubuntu 20.04/22.04 或 CentOS 7/8
- **SSH登录方式**：密码或密钥

### 2. 需要准备的内容
- ✅ 服务器已购买并启动
- ✅ 知道服务器的公网IP地址
- ✅ 知道SSH登录密码或密钥
- ✅ MongoDB数据库（本地安装或使用云数据库）
- ✅ 域名（可选，如果有的话）

---

## 🔧 第一步：连接服务器

### Windows 用户（使用 PowerShell 或 CMD）

```powershell
# 使用密码登录
ssh root@你的服务器IP

# 或使用密钥文件登录
ssh -i 你的密钥文件路径 root@你的服务器IP
```

### Mac/Linux 用户

```bash
# 使用密码登录
ssh root@你的服务器IP

# 或使用密钥文件登录
ssh -i ~/.ssh/你的密钥文件 root@你的服务器IP
```

**首次连接会提示确认，输入 `yes` 回车。**

---

## 📦 第二步：安装基础环境

### 2.1 更新系统包（Ubuntu/Debian）

```bash
# 更新软件包列表
apt update

# 升级已安装的包
apt upgrade -y
```

### 2.2 安装 Node.js（推荐使用 Node.js 18+）

```bash
# 方法一：使用 NodeSource 安装（推荐）
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt-get install -y nodejs

# 验证安装
node -v    # 应该显示 v18.x.x 或更高
npm -v     # 应该显示 9.x.x 或更高
```

**如果上面的方法失败，使用备用方法：**

```bash
# 方法二：使用 nvm（Node Version Manager）
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 18
nvm use 18
node -v
npm -v
```

### 2.3 安装 Git（用于拉取代码）

```bash
apt install git -y
git --version
```

### 2.4 安装 PM2（进程管理器，用于保持服务运行）

```bash
npm install -g pm2
pm2 -v
```

### 2.5 安装 MongoDB（如果使用本地MongoDB）

**选项A：使用阿里云MongoDB云数据库（推荐）**
- 在阿里云控制台购买MongoDB云数据库
- 获取连接字符串（格式：`mongodb://用户名:密码@地址:端口/数据库名`）

**选项B：在服务器上安装MongoDB**

```bash
# Ubuntu/Debian
wget -qO - https://www.mongodb.org/static/pgp/server-6.0.asc | apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu focal/mongodb-org/6.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-6.0.list
apt update
apt install -y mongodb-org

# 启动MongoDB服务
systemctl start mongod
systemctl enable mongod

# 验证MongoDB是否运行
systemctl status mongod
```

---

## 📁 第三步：上传项目代码

### 方法一：使用 Git（推荐）

```bash
# 进入合适的目录（如 /var/www 或 /home）
cd /var/www

# 克隆你的项目（如果有Git仓库）
git clone https://你的仓库地址.git hotel-booking
cd hotel-booking

# 如果没有Git仓库，可以跳过这一步，使用下面的方法二
```

### 方法二：使用 SCP 上传（Windows）

**在本地电脑的 PowerShell 中执行：**

```powershell
# 进入项目根目录
cd D:\XieCheng\Hotel-Booking-main

# 上传整个项目到服务器
scp -r . root@你的服务器IP:/var/www/hotel-booking
```

### 方法三：使用 FTP 工具（如 FileZilla）

1. 下载并安装 FileZilla
2. 连接服务器（主机：你的IP，用户名：root，密码：你的密码）
3. 将本地项目文件夹拖拽到服务器的 `/var/www/hotel-booking` 目录

---

## ⚙️ 第四步：配置环境变量

### 4.1 配置后端环境变量

```bash
# 进入服务器上的项目目录
cd /var/www/hotel-booking/server

# 创建或编辑 .env 文件
nano .env
```

**在 `.env` 文件中填入以下内容（根据你的实际情况修改）：**

```env
# MongoDB 数据库连接
# 如果使用本地MongoDB：
MONGO_URI="mongodb://localhost:27017/hotel-booking"
# 如果使用阿里云MongoDB云数据库：
# MONGO_URI="mongodb://用户名:密码@dds-xxxxx.mongodb.rds.aliyuncs.com:3717/hotel-booking"

# 服务器端口（建议使用3000或5000）
PORT=5000

# Clerk Authentication（如果有使用）
CLERK_PUBLISHABLE_KEY="你的clerk_publishable_key"
CLERK_SECRET_KEY="你的clerk_secret_key"
CLERK_WEBHOOK_SECRET="你的clerk_webhook_secret"

# Cloudinary（图片存储，如果有使用）
CLOUDINARY_CLOUD_NAME="你的cloudinary_cloud_name"
CLOUDINARY_API_KEY="你的cloudinary_api_key"
CLOUDINARY_API_SECRET="你的cloudinary_api_secret"

# Stripe（支付，如果有使用）
STRIPE_SECRET_KEY="你的stripe_secret_key"

# JWT密钥（用于用户认证，建议使用随机字符串）
JWT_SECRET="你的随机密钥字符串，建议至少32位"

# AI API Key（如果有使用）
AI_API_KEY="你的ai_api_key"

# 公网访问URL（重要！用于生成图片和二维码的完整URL）
PUBLIC_URL="http://你的服务器IP:5000"
# 如果有域名：
# PUBLIC_URL="https://你的域名.com"
```

**保存文件：**
- 按 `Ctrl + X`
- 输入 `Y` 确认
- 按 `Enter` 保存

### 4.2 配置前端环境变量

```bash
# 进入前端目录
cd /var/www/hotel-booking/client

# 创建或编辑 .env 文件
nano .env
```

**在 `.env` 文件中填入：**

```env
# 后端API地址（使用服务器IP和端口）
VITE_BACKEND_URL=http://你的服务器IP:5000
# 如果有域名：
# VITE_BACKEND_URL=https://你的域名.com

# 高德地图API Key
VITE_AMAP_KEY=你的高德地图API密钥
```

**保存文件：**
- 按 `Ctrl + X`
- 输入 `Y` 确认
- 按 `Enter` 保存

---

## 🏗️ 第五步：安装依赖并构建

### 5.1 安装后端依赖

```bash
# 确保在项目根目录
cd /var/www/hotel-booking/server

# 安装依赖
npm install
```

### 5.2 创建必要的目录

```bash
# 创建上传文件目录
mkdir -p /var/www/hotel-booking/server/uploads/hotels
mkdir -p /var/www/hotel-booking/server/uploads/rooms
mkdir -p /var/www/hotel-booking/server/uploads/reviews
mkdir -p /var/www/hotel-booking/server/uploads/merchants

# 设置目录权限
chmod -R 755 /var/www/hotel-booking/server/uploads
```

### 5.3 构建前端

```bash
# 进入前端目录
cd /var/www/hotel-booking/client

# 安装依赖
npm install

# 构建生产版本
npm run build
```

**构建完成后，会在 `client/dist` 目录生成前端静态文件。**

---

## 🚀 第六步：启动服务

### 6.1 使用 PM2 启动后端服务

```bash
# 进入服务器目录
cd /var/www/hotel-booking/server

# 使用 PM2 启动服务
pm2 start server.js --name hotel-api

# 查看服务状态
pm2 status

# 查看日志
pm2 logs hotel-api

# 设置PM2开机自启
pm2 startup
pm2 save
```

**如果看到类似以下输出，说明启动成功：**
```
┌─────┬─────────────┬─────────┬─────────┬──────────┐
│ id  │ name        │ status  │ restart │ uptime   │
├─────┼─────────────┼─────────┼─────────┼──────────┤
│ 0   │ hotel-api   │ online  │ 0       │ 10s      │
└─────┴─────────────┴─────────┴─────────┴──────────┘
```

### 6.2 PM2 常用命令

```bash
# 查看所有进程
pm2 list

# 查看日志
pm2 logs hotel-api

# 重启服务
pm2 restart hotel-api

# 停止服务
pm2 stop hotel-api

# 删除服务
pm2 delete hotel-api

# 查看详细信息
pm2 show hotel-api

# 监控
pm2 monit
```

---

## 🔥 第七步：配置防火墙

### 7.1 阿里云安全组配置

1. 登录阿里云控制台
2. 进入 **云服务器ECS** → **实例**
3. 找到你的服务器，点击 **安全组**
4. 点击 **配置规则** → **添加安全组规则**
5. 添加以下规则：

| 规则方向 | 授权策略 | 协议类型 | 端口范围 | 授权对象 |
|---------|---------|---------|---------|---------|
| 入方向 | 允许 | TCP | 5000 | 0.0.0.0/0 |
| 入方向 | 允许 | TCP | 80 | 0.0.0.0/0 |
| 入方向 | 允许 | TCP | 443 | 0.0.0.0/0 |
| 入方向 | 允许 | TCP | 22 | 0.0.0.0/0（SSH） |

### 7.2 服务器防火墙配置（Ubuntu）

```bash
# 如果使用 UFW
ufw allow 5000/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw allow 22/tcp
ufw enable
ufw status

# 如果使用 firewalld（CentOS）
firewall-cmd --permanent --add-port=5000/tcp
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --reload
```

---

## 🌐 第八步：配置 Nginx（可选，推荐用于生产环境）

### 8.1 安装 Nginx

```bash
apt install nginx -y
systemctl start nginx
systemctl enable nginx
```

### 8.2 配置 Nginx 反向代理

```bash
# 创建配置文件
nano /etc/nginx/sites-available/hotel-booking
```

**在文件中填入以下内容：**

```nginx
server {
    listen 80;
    server_name 你的域名.com 你的服务器IP;

    # 前端静态文件
    location / {
        root /var/www/hotel-booking/client/dist;
        try_files $uri $uri/ /index.html;
        index index.html;
    }

    # 后端API代理
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 上传文件代理
    location /uploads {
        proxy_pass http://localhost:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

**保存文件后，创建软链接并重启Nginx：**

```bash
# 创建软链接
ln -s /etc/nginx/sites-available/hotel-booking /etc/nginx/sites-enabled/

# 测试配置
nginx -t

# 重启Nginx
systemctl restart nginx
```

### 8.3 配置 HTTPS（如果有域名）

```bash
# 安装 Certbot
apt install certbot python3-certbot-nginx -y

# 申请SSL证书
certbot --nginx -d 你的域名.com

# 自动续期
certbot renew --dry-run
```

**配置HTTPS后，记得更新 `.env` 文件中的 `PUBLIC_URL` 和 `VITE_BACKEND_URL` 为 `https://`。**

---

## ✅ 第九步：验证部署

### 9.1 检查服务状态

```bash
# 检查PM2进程
pm2 status

# 检查Nginx状态（如果安装了）
systemctl status nginx

# 检查MongoDB状态（如果使用本地MongoDB）
systemctl status mongod
```

### 9.2 测试访问

1. **在浏览器中访问：**
   - `http://你的服务器IP:5000`（如果没配置Nginx）
   - `http://你的域名.com`（如果配置了Nginx和域名）

2. **检查后端API：**
   - `http://你的服务器IP:5000/api/hotels/public/cities`
   - 应该返回JSON数据

3. **查看日志：**
   ```bash
   pm2 logs hotel-api --lines 50
   ```

---

## 🔧 常见问题排查

### 问题1：无法访问网站

**检查步骤：**
1. 确认防火墙和安全组已开放端口
2. 检查PM2服务是否运行：`pm2 status`
3. 查看日志：`pm2 logs hotel-api`
4. 检查端口是否被占用：`netstat -tulpn | grep 5000`

### 问题2：MongoDB连接失败

**检查步骤：**
1. 确认MongoDB服务运行：`systemctl status mongod`
2. 检查 `.env` 中的 `MONGO_URI` 是否正确
3. 如果是云数据库，确认安全组允许服务器IP访问
4. 测试连接：`mongosh "你的MONGO_URI"`

### 问题3：前端无法连接后端

**检查步骤：**
1. 确认 `client/.env` 中的 `VITE_BACKEND_URL` 正确
2. **重要**：修改 `.env` 后必须重新构建：`cd client && npm run build`
3. 检查浏览器控制台（F12）的错误信息
4. 检查后端日志：`pm2 logs hotel-api`

### 问题4：图片无法显示

**检查步骤：**
1. 确认 `server/.env` 中的 `PUBLIC_URL` 设置正确
2. 检查上传目录权限：`ls -la server/uploads`
3. 确认静态文件服务配置正确（`server.js` 中的 `/uploads` 路由）

### 问题5：PM2服务重启后消失

**解决方案：**
```bash
# 设置开机自启
pm2 startup
# 按照提示执行生成的命令
pm2 save
```

---

## 📝 更新部署

当代码有更新时，按以下步骤更新：

```bash
# 1. 进入项目目录
cd /var/www/hotel-booking

# 2. 拉取最新代码（如果使用Git）
git pull

# 3. 或重新上传代码（如果使用SCP/FTP）

# 4. 更新后端依赖（如果有新依赖）
cd server
npm install

# 5. 更新前端依赖并重新构建
cd ../client
npm install
npm run build

# 6. 重启PM2服务
pm2 restart hotel-api

# 7. 查看日志确认
pm2 logs hotel-api
```

---

## 🔐 安全建议

1. **修改SSH默认端口**（可选）
2. **使用密钥登录而非密码**（推荐）
3. **定期更新系统包**：`apt update && apt upgrade -y`
4. **配置防火墙**，只开放必要端口
5. **使用HTTPS**（如果有域名）
6. **定期备份数据库**
7. **不要在代码中硬编码敏感信息**，使用环境变量

---

## 📞 需要帮助？

如果遇到问题，请提供以下信息：
1. 错误日志（`pm2 logs hotel-api`）
2. 浏览器控制台错误（F12 → Console）
3. 服务器配置信息（Node版本、PM2状态等）

---

**部署完成后，你的网站应该可以通过 `http://你的服务器IP:5000` 访问了！** 🎉
