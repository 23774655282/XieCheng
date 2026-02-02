import { Router, Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User, UserRole } from '../models/User.js';

const router = Router();

router.post('/register', async (req: Request, res: Response) => {
  try {
    const { username, password, role } = req.body as {
      username?: string;
      password?: string;
      role?: UserRole;
    };
    if (!username || !password || !role) {
      return res.status(400).json({ code: 400, message: '缺少 username / password / role' });
    }
    if (!['merchant', 'admin'].includes(role)) {
      return res.status(400).json({ code: 400, message: 'role 必须为 merchant 或 admin' });
    }
    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ code: 400, message: '用户名已存在' });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({ username, passwordHash, role });
    res.json({
      code: 0,
      message: 'ok',
      data: { userId: user._id.toString() },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

router.post('/login', async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body as { username?: string; password?: string };
    if (!username || !password) {
      return res.status(400).json({ code: 400, message: '缺少 username / password' });
    }
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ code: 401, message: '用户名或密码错误' });
    }
    const token = jwt.sign(
      { userId: user._id.toString(), username: user.username, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '7d' }
    );
    res.json({
      code: 0,
      message: 'ok',
      data: {
        token,
        role: user.role,
        username: user.username,
      },
    });
  } catch (e) {
    res.status(500).json({ code: 500, message: (e as Error).message });
  }
});

export default router;
