# 阿里云服务器部署指南

本指南说明如何在阿里云 ECS 上部署本项目（Node 后端 + React 前端），实现「一个端口、一个地址」访问完整网站。

---

## 一、前提条件

- 已购买阿里云 ECS 实例（推荐 Ubuntu 22.04 或 CentOS 7+）
- 已绑定公网 IP（或弹性公网 IP）
- 本地已安装 Node.js 18+（用于在服务器或本机构建前端）

---

## 二、服务器环境准备

### 1. 安装 Node.js（以 Ubuntu 为例）

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v   # 应显示 v20.x
npm -v
```

### 2. 安装 PM2（进程守护）

```bash
sudo npm install -g pm2
```

### 3. 安装 Git（若从仓库拉代码）

```bash
sudo apt-get update
sudo apt-get install -y git
```

---

## 三、上传项目到服务器

任选一种方式：

**方式 A：Git 克隆**

```bash
cd /root   # 或你的工作目录
git clone <你的仓库地址> Hotel-Booking-main
cd Hotel-Booking-main
```

**方式 B：本地上传**

在本地打包（排除 node_modules）后上传到服务器，例如：

```bash
# 本地在项目根目录执行
tar --exclude=node_modules --exclude=client/node_modules --exclude=server/node_modules --exclude=.git -czvf Hotel-Booking.tar.gz .
# 用 scp 或 SFTP 上传 Hotel-Booking.tar.gz 到服务器后解压
# ssh 到服务器后：
tar -xzvf Hotel-Booking.tar.gz -C /root/Hotel-Booking-main
```

---

## 四、配置后端环境变量

```bash
cd /root/Hotel-Booking-main/server   # 按你实际路径改
cp .env.example .env   # 若无 .env.example 则新建 .env
nano .env
```

**必须配置项：**

| 变量 | 说明 | 示例 |
|------|------|------|
| MONGO_URI | MongoDB 连接串 | Atlas: `mongodb+srv://用户:密码@cluster0.xxx.mongodb.net/hotel-booking?retryWrites=true&w=majority`<br>本机: `mongodb://127.0.0.1:27017/hotel-booking` |
| PORT | 服务监听端口 | `5000` 或 `3000` |
| JWT_SECRET | 登录 JWT 密钥 | 任意长随机字符串 |

保存后退出。

---

## 五、构建前端（重要）

前端需要知道后端地址，构建时会把该地址写进静态资源。

**在服务器上构建（推荐）：**

```bash
cd /root/Hotel-Booking-main/client
npm install
```

编辑 `client/.env`，将后端地址改为**服务器公网访问地址**（与用户浏览器访问的地址一致）：

```env
VITE_BACKEND_URL=http://你的公网IP:5000
```

例如：`http://120.55.126.95:5000`。若使用域名，则写 `https://你的域名`。

然后执行构建：

```bash
npm run build
```

确认生成 `client/dist` 目录且内有 `index.html`。

**若在本机构建：** 同样在 `client/.env` 中设置 `VITE_BACKEND_URL=http://你的阿里云公网IP:5000`，执行 `npm run build`，再把整个项目（含 `client/dist`）上传到服务器。

---

## 六、安装后端依赖并启动

```bash
cd /root/Hotel-Booking-main/server
npm install
```

**确保目录结构：** 服务器上项目根目录下同时存在 `client/dist` 和 `server`，这样后端才能正确托管前端。

使用 PM2 启动：

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup   # 按提示执行命令，实现开机自启
```

查看状态与日志：

```bash
pm2 list
pm2 logs hotel-api --lines 50
```

若看到 `MongoDB Connected` 和 `Server is running on port 5000` 即表示后端正常。

---

## 七、开放安全组端口

1. 登录 [阿里云控制台](https://ecs.console.aliyun.com/)
2. 找到你的 ECS 实例 → 安全组 → 配置规则 → 入方向
3. 添加规则：端口范围填 **5000**（或你在 `.env` 里设的 PORT），授权对象 **0.0.0.0/0**（或限制为你的 IP）

保存后，从外网访问：`http://你的公网IP:5000`，应能打开网站首页。

---

## 八、访问方式总结

| 场景 | 地址 |
|------|------|
| 浏览器打开网站 | `http://你的公网IP:5000` |
| API 接口 | `http://你的公网IP:5000/api/...` |

扫码付款等链接会使用当前页面的 origin，因此请尽量用**公网 IP 或域名**访问，避免用 localhost。

---

## 九、可选：使用域名与 80 端口

若希望使用 `http://你的域名`（不加端口）：

1. 域名解析到 ECS 公网 IP
2. 在服务器上安装 Nginx，配置反向代理：
   - 监听 80，将请求转发到本机 `http://127.0.0.1:5000`
3. 安全组放行 80 端口
4. 前端 `VITE_BACKEND_URL` 改为 `http://你的域名`（或 `https://` 若已配置 SSL），重新构建并上传 `client/dist`

---

## 十、常见问题

- **500 / 无法访问**：查看 `pm2 logs hotel-api`，常见原因为 MongoDB 未连接（见 DEPLOY_TROUBLESHOOT.md）。
- **页面是「API is running...」**：说明未检测到 `client/dist`，请确认在 `server` 的**上一级**目录存在 `client/dist`，且其中包含 `index.html`。
- **前端请求接口 404 / 跨域**：确认 `client/.env` 中 `VITE_BACKEND_URL` 与浏览器访问的地址一致，且已重新执行 `npm run build`。

更多排查步骤见 **DEPLOY_TROUBLESHOOT.md**。
