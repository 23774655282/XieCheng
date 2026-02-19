# 阿里云部署排查指南

## 一、先确定报错出现在哪里

| 现象 | 可能位置 | 看哪里的信息 |
|------|----------|----------------|
| 浏览器白屏、控制台红色报错 | 前端 | 浏览器 F12 → Console |
| 页面打不开、一直转圈、500/502 | 后端或 Nginx | 服务器上的 Node 日志 |
| 接口 404 / 401 / 500 | 后端 API | 浏览器 F12 → Network 看接口状态 + 服务器 Node 日志 |
| 构建失败（npm run build 报错） | 前端构建 | 执行 build 的终端输出 |

---

## 二、按步骤排查

### 1. 看浏览器控制台（前端报错）

1. 打开网站，按 **F12**（或右键 → 检查）。
2. 切到 **Console**，看是否有红色报错。
3. 把**完整报错文案**（或截图）记下来。

**常见情况：**

- **Failed to fetch / Network Error**  
  → 前端连不上后端：检查 `client/.env` 里 `VITE_BACKEND_URL` 是否等于你实际访问的后端地址（如 `http://你的IP:5000`），且构建前改过的话要重新 `npm run build`。
- **404 (Not Found)**  
  → 请求的接口路径或静态资源不存在：在 **Network** 里点开红色请求，看请求 URL 是否写错，或后端是否真的提供了该路由。
- **CORS / 跨域错误**  
  → 后端要允许你前端所在域名/端口；本项目 server 已开 `cors()`，一般同机部署不会出现，若前后端不同域名需在 server 里配置允许的 origin。

---

### 2. 看接口请求（Network）

1. F12 → **Network**。
2. 刷新页面，看列表里是否有**红色**的请求（状态码 4xx/5xx）。
3. 点开红色请求：
   - 看 **Request URL**（请求的是哪个地址）；
   - 看 **Status**（如 500、502、404）；
   - 切到 **Response** 或 **Preview**，看返回内容里是否有错误信息。

记下：**哪个 URL 报错、状态码、Response 里的一小段内容**，便于对照后端日志。

---

### 3. 看服务器上的 Node 日志（后端报错）

在**阿里云服务器**上，用你实际启动方式执行：

**方式 A：直接 `node` / `npm start`**

- 在 `server` 目录执行 `npm start` 的终端里，会直接打印日志。
- 复现一次“报错操作”，看终端是否出现 `Unhandled error:` 或报错堆栈。
- 把那段**完整报错**复制下来。

**方式 B：用 pm2**

```bash
# 看最近日志
pm2 logs

# 只看你的应用（假设名字是 server 或 api）
pm2 logs server --lines 100
```

同样：复现问题后，把和报错时间对应的那几行**完整日志**复制下来。

**常见后端报错：**

- **MongoDB connection error / connect ECONNREFUSED 127.0.0.1:27017**  
  → 本机没有运行 MongoDB，或连的是本地地址但数据库在别处。二选一：  
  **方案 A（推荐）**：用 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 免费集群，在控制台拿到连接字符串，填到 `server/.env` 的 `MONGO_URI`，重启应用。  
  **方案 B**：在服务器上安装并启动 MongoDB（见下文「MongoDB 未连接」）。
- **EADDRINUSE: port 5000 already in use**  
  → 5000 端口被占用：换端口（在 `server/.env` 设 `PORT=5001`）或关掉占用 5000 的进程。
- **Cannot find module 'xxx'**  
  → 依赖没装全：在 `server` 目录执行 `npm install`。
- **Unhandled error: ...**  
  → 代码里抛错被全局错误中间件捕获：根据堆栈里的**文件名和行号**去对应文件排查。

---

### 4. 确认部署步骤没漏

在服务器上建议按顺序做一遍：

```bash
# 在项目根目录（和 client、server 同级）
cd client
npm install
npm run build
# 确认生成了 client/dist 且里面有 index.html

cd ../server
npm install
# 确认 server/.env 里 MONGO_URI、PORT 等已配置
npm start
```

- 若访问 **http://你的IP:5000** 仍然 500/打不开，**一定要**同时看上面第 3 步的 Node 日志。
- 若页面能打开但接口报错，以 Network 里报错的 URL + 状态码 + Response，结合 Node 日志一起看。

---

### 5. 安全组与端口

- 阿里云控制台 → 实例 → **安全组** → 入方向规则。
- 若用 **5000** 端口访问，要有规则：端口 **5000**，来源 **0.0.0.0/0**（或你的 IP）。
- 若用 **80** 端口，需同样放行 **80**（且通常要配合 Nginx 反向代理到 Node 的 5000）。

---

## 三、把“报错”发出来时的建议

下次说“现在报错”时，最好同时提供：

1. **浏览器**：F12 → Console 里**完整红色报错**（可截图）。
2. **浏览器**：F12 → Network 里**一个红色请求**的：URL、Status、Response 内容（可截图）。
3. **服务器**：复现问题时，Node 或 pm2 的**一段完整日志**（包含报错堆栈）。

有了这三点，可以更准确判断是前端、后端、环境还是配置问题，并给出具体修改建议。

---

## 四、常见问题：MongoDB 未连接（ECONNREFUSED 127.0.0.1:27017）

报错含义：应用在连本机 27017 端口的 MongoDB，但连不上（没装或没启动）。

### 方案 A：用 MongoDB Atlas（推荐，不用在服务器装数据库）

1. 打开 [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) 注册/登录。
2. 创建一个免费集群（Free Tier），区域可选离阿里云较近的（如 Singapore）。
3. 在集群里创建数据库用户（记下用户名和密码）。
4. Network Access 里添加 `0.0.0.0/0`（允许任何 IP 连接，仅测试用；生产建议限制 IP）。
5. 在 Database → Connect → Connect your application 里复制连接字符串，形如：
   ```text
   mongodb+srv://用户名:密码@cluster0.xxxxx.mongodb.net/数据库名?retryWrites=true&w=majority
   ```
6. 在服务器上的 `server/.env` 里设置（把 `<password>` 换成真实密码）：
   ```env
   MONGO_URI=mongodb+srv://你的用户名:你的密码@cluster0.xxxxx.mongodb.net/hotel-booking?retryWrites=true&w=majority
   ```
7. 重启应用：`pm2 restart hotel-api` 或 `pm2 restart all`。

之后应用会连 Atlas，不再依赖本机 27017。

### 方案 B：在阿里云服务器上安装并启动 MongoDB

在服务器上执行（以 Ubuntu/Debian 为例）：

```bash
# 安装 MongoDB 社区版（示例：Ubuntu 22.04）
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt-get update
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
sudo systemctl enable mongod
```

确认本机连接串在 `server/.env` 中为：

```env
MONGO_URI=mongodb://127.0.0.1:27017/hotel-booking
```

然后重启应用。
