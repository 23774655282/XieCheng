# 注册/角色逻辑改造说明 - modify2.19

## 改造目标

- 普通用户注册不再选择角色，`role` 默认为 `user`
- `merchant` / `admin` 禁止通过普通注册接口直接设置
- 商户需通过「申请成为商户」流程，由管理员审核通过后升级

---

## 一、后端改动

### 1. 注册接口 `POST /api/auth/register`

**变更：**

- **禁止通过注册接口设置 role**：若请求体包含 `role` 且不为 `user`，返回 `403`，错误信息：`role cannot be set during registration`
- **仅创建普通用户**：创建用户时固定 `role: "user"`，不从 `req.body` 读取 `role`
- **请求体参数**：
  - 必填：`username`, `phone`, `password`
  - 可选：`email`, `avatar`
  - `role` 不作为输入参数，若传入非 `user` 则返回 403

**涉及文件：** `server/controllers/auth.controller.js`

### 2. User 模型

**新增字段：**

```javascript
merchantApplicationStatus: {
  type: String,
  enum: ['none', 'pending', 'approved', 'rejected'],
  default: 'none',
}
```

- `none`：未申请
- `pending`：审核中
- `approved`：已通过
- `rejected`：已驳回

**涉及文件：** `server/models/user.model.js`

### 3. 商户申请接口

| 接口 | 方法 | 说明 |
|------|------|------|
| `/api/merchant/apply` | POST | 普通用户申请成为商户（需登录，仅 `role=user` 可申请） |
| `/api/merchant/applications` | GET | 管理员获取待审核商户申请列表 |
| `/api/merchant/applications/:id/approve` | POST | 管理员批准，将用户 `role` 改为 `merchant` |
| `/api/merchant/applications/:id/reject` | POST | 管理员驳回申请 |

**涉及文件：**

- `server/controllers/merchant.controller.js`（新建）
- `server/routes/merchant.route.js`（新建）
- `server/server.js`（挂载 merchant 路由）

### 4. 用户信息接口 `GET /api/users`

**变更：** 返回结果中增加 `merchantApplicationStatus` 字段。

**涉及文件：** `server/controllers/user.controller.js`

### 5. `set-role` 接口废弃

**变更：** `POST /api/users/set-role` 改为始终返回 `403`，提示：`role cannot be set directly. Apply via /merchant/apply for merchant`。

**涉及文件：** `server/controllers/user.controller.js`

### 6. 登录接口

**说明：** 登录接口已包含 `role` 字段，可直接用于前端跳转和展示。

---

## 二、前端改动

### 1. 注册页

**变更：**

- 去掉角色选择逻辑，仅保留普通用户注册
- 增加提示文案：`想成为商户？注册后可在个人中心申请成为商户`

**涉及文件：** `client/src/pages/Register.jsx`

### 2. 入驻酒店入口

**变更：**

- 点击「入驻酒店」时，若为普通用户（`role=user`），跳转 `/apply-merchant`，不再跳转 `/choose-role`

**涉及文件：** `client/src/components/NavBar.jsx`

### 3. 新页面：申请成为商户 `/apply-merchant`

**行为：**

- `merchantApplicationStatus === 'none'`：显示「申请成为商户」按钮
- `merchantApplicationStatus === 'pending'`：显示「审核中」
- `merchantApplicationStatus === 'rejected'`：显示「已驳回」
- `merchantApplicationStatus === 'approved'` 且 `role === 'merchant'`：显示「您已是商户」及进入商户中心入口

**涉及文件：** `client/src/pages/ApplyMerchant.jsx`（新建）

### 4. 我的订单页（个人中心）

**变更：**

- 为普通用户（`role=user`）增加「申请成为商户」入口
- 根据 `merchantApplicationStatus` 展示：未申请 / 审核中 / 已驳回

**涉及文件：** `client/src/pages/MyBooking.jsx`

### 5. AppContext

**变更：**

- 新增 `merchantApplicationStatus` 状态
- 新增 `applyMerchant()`，替代原 `setRole()`
- `fetchUser()` 时读取并更新 `merchantApplicationStatus`
- 登录、登出时同步清空 `merchantApplicationStatus`

**涉及文件：** `client/src/context/AppContext.jsx`

### 6. Admin 后台

**变更：**

- 侧栏新增「商户申请审核」入口
- 新增页面 `MerchantApplications`，展示待审核商户申请列表，支持通过 / 驳回

**涉及文件：**

- `client/src/pages/admin/AdminLayout.jsx`
- `client/src/pages/admin/MerchantApplications.jsx`（新建）
- `client/src/App.jsx`（新增路由）

### 7. 删除的文件

- `client/src/pages/ChooseRole.jsx`（由 ApplyMerchant 取代）

---

## 三、业务流程

1. **注册** → 仅创建普通用户，`role = 'user'`
2. **登录** → 返回 `role` 等信息
3. **申请商户** → 用户点击「申请成为商户」，`merchantApplicationStatus` 设为 `pending`
4. **审核中** → 用户看到「审核中」，`role` 仍为 `user`
5. **管理员审核** → 通过则将 `role` 改为 `merchant`，驳回则 `merchantApplicationStatus` 设为 `rejected`
6. **成为商户** → 用户刷新或重新登录后，可访问商户中心

---

## 四、路由汇总

| 路径 | 说明 |
|------|------|
| `/register` | 普通用户注册 |
| `/apply-merchant` | 申请成为商户（替代原 `/choose-role`） |
| `/admin/merchant-applications` | 管理员商户申请审核 |
| `/forgot-password` | 重置密码（填写账号 → 验证 → 重置） |

---

## 五、后续功能增量（非样式类）

### 5.1 忘记密码

**后端：**

- User 模型新增 `resetCode`、`resetCodeExpiresAt`
- 接口：
  - `POST /api/auth/forgot-password/request`：按手机号发送验证码
  - `POST /api/auth/forgot-password/verify`：校验验证码
  - `POST /api/auth/forgot-password/reset`：重置密码
- 开发环境下响应中返回 `devCode`

**前端：**

- Login 页：密码行右侧增加「忘记密码」链接
- 新增 ForgotPassword 页面：三步流程（填写账号 → 验证 → 重置密码）
- 路由：`/forgot-password`

**涉及文件：** `server/models/user.model.js`、`server/controllers/auth.controller.js`、`server/routes/auth.route.js`、`client/src/pages/Login.jsx`、`client/src/pages/ForgotPassword.jsx`、`client/src/App.jsx`

---

### 5.2 验证码登录

**后端：**

- User 模型新增 `loginCode`、`loginCodeExpiresAt`
- 接口：
  - `POST /api/auth/login/send-code`：发送登录验证码（仅已注册手机号）
  - `POST /api/auth/login/by-code`：验证码登录

**前端：**

- Login 页：增加「密码登录 / 验证码登录」切换
- 验证码登录：手机号 + 验证码，60 秒倒计时

**涉及文件：** `server/models/user.model.js`、`server/controllers/auth.controller.js`、`server/routes/auth.route.js`、`client/src/pages/Login.jsx`

---

### 5.3 注册验证码核验

**后端：**

- 新建 RegisterVerification 模型（phone, code, expiresAt）
- 接口：
  - `POST /api/auth/register/send-code`：发送注册验证码（仅未注册手机号，60 秒内只能获取一次）
  - `POST /api/auth/register`：注册时需传 `code` 校验

**前端：**

- Register 页：增加验证码输入、「获取验证码」按钮、60 秒倒计时
- 所有必填项（含验证码）填完才能点击注册

**涉及文件：** `server/models/registerVerification.model.js`、`server/controllers/auth.controller.js`、`server/routes/auth.route.js`、`client/src/pages/Register.jsx`

---

### 5.4 商户申请改造：必填信息 + 执照 + 驳回原因

**后端：**

- 新建 MerchantApplication 模型：申请人姓名/手机号、酒店名称/地址/城市/联系电话、营业执照 URL、驳回原因、酒店内外照片
- 新建 uploadMerchantApply：执照 + 酒店外部/内部照片（各最多 5 张）
- `POST /api/merchant/apply` 改为接收 FormData，校验所有必填项
- 驳回接口：`POST /api/merchant/applications/:id/reject` 必须传 `rejectReason`
- 新增 `GET /api/merchant/my-application`：当前用户查看自己的申请（含驳回原因）

**前端：**

- ApplyMerchant：表单含申请人、酒店信息、营业执照、酒店外部/内部照片（均为必填）
- MerchantApplications（管理员）：可展开查看详情，驳回时需填写驳回原因
- 申请被驳回后可在页面查看驳回原因

**涉及文件：** `server/models/merchantApplication.model.js`、`server/middlewares/multer.middleware.js`、`server/controllers/merchant.controller.js`、`server/routes/merchant.route.js`、`client/src/pages/ApplyMerchant.jsx`、`client/src/pages/admin/MerchantApplications.jsx`

---

### 5.5 被驳回可再次申请

- 申请被驳回后，可点击「再次申请」重新提交
- 再次申请时展示与首次申请相同的表单

---

### 5.6 酒店外部/内部照片必填

- 酒店外部照片、酒店内部照片均为必填（至少各 1 张，最多 5 张）
- 后端与前端均做校验

---

### 5.7 入驻酒店提示页

**逻辑：**

- 点击「入驻酒店」后，先弹出 HotelReg 弹窗（不再直接跳转 `/apply-merchant`）
- 普通用户（role=user）：弹窗为提示页，含图片、说明、「开始申请」按钮，点击后关闭弹窗并跳转 `/apply-merchant`
- 商户/管理员：弹窗为原有酒店注册表单（直接填酒店信息）

**涉及文件：** `client/src/components/NavBar.jsx`、`client/src/components/HotalReg.jsx`

---

### 5.8 驳回界面只弹一次

- 被驳回后，若用户已点击过「再次申请」，则之后访问申请页时直接展示表单，不再重复展示驳回界面
- 通过 localStorage 键 `merchantReapplyDismissed` 记忆，提交成功或状态变为非 rejected 时清除

**涉及文件：** `client/src/pages/ApplyMerchant.jsx`
