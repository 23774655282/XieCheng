/**
 * 管理端 - 注册表单（含角色选择 merchant | admin）
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function RegisterForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'merchant' | 'admin'>('merchant');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }
    if (password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    setLoading(true);
    try {
      const res = await authApi.register({ username: username.trim(), password, role });
      if (res.code === 0 && res.data) {
        // 注册成功后自动登录
        const loginRes = await authApi.login({ username: username.trim(), password });
        if (loginRes.code === 0 && loginRes.data) {
          login(loginRes.data.token, loginRes.data.role, loginRes.data.username);
          navigate(role === 'admin' ? '/admin/audit/hotels' : '/admin/merchant/hotels');
        } else {
          navigate('/admin/login');
        }
      } else {
        setError(res.message || '注册失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '注册失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="register-form"
      onSubmit={handleSubmit}
      style={{ display: 'flex', flexDirection: 'column', gap: 12, width: 320 }}
    >
      {error && <p style={{ color: '#ff4d4f', fontSize: 14 }}>{error}</p>}
      <input
        type="text"
        placeholder="用户名"
        value={username}
        onChange={(e) => setUsername(e.target.value)}
        disabled={loading}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <input
        type="password"
        placeholder="密码"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        disabled={loading}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      />
      <select
        value={role}
        onChange={(e) => setRole(e.target.value as 'merchant' | 'admin')}
        disabled={loading}
        style={{ padding: 8, borderRadius: 6, border: '1px solid #ddd' }}
      >
        <option value="merchant">商户</option>
        <option value="admin">管理员</option>
      </select>
      <button
        type="submit"
        disabled={loading}
        style={{ padding: 8, background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        {loading ? '注册中...' : '注册'}
      </button>
    </form>
  );
}
