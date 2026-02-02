/**
 * 管理端 - 登录表单
 */
import { useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../../api';
import { useAuth } from '../../context/AuthContext';

export default function LoginForm() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
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
    setLoading(true);
    try {
      const res = await authApi.login({ username: username.trim(), password });
      if (res.code === 0 && res.data) {
        login(res.data.token, res.data.role, res.data.username);
        navigate(res.data.role === 'admin' ? '/admin/audit/hotels' : '/admin/merchant/hotels');
      } else {
        setError(res.message || '登录失败');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '登录失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      className="login-form"
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
      <button
        type="submit"
        disabled={loading}
        style={{ padding: 8, background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        {loading ? '登录中...' : '登录'}
      </button>
    </form>
  );
}
