/**
 * 管理端 - 登录页
 * 路由: /admin/login
 */
import { Link, Navigate } from 'react-router-dom';
import LoginForm from '../../components/admin/LoginForm';
import { useAuth } from '../../context/AuthContext';
import './AdminAuth.css';

export default function AdminLogin() {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin/audit/hotels' : '/admin/merchant/hotels'} replace />;
  }
  return (
    <div className="page-admin-auth">
      <h1>易宿管理端 - 登录</h1>
      <LoginForm />
      <p className="auth-link">
        还没有账号？<Link to="/admin/register">注册</Link>
      </p>
    </div>
  );
}
