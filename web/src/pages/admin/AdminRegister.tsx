/**
 * 管理端 - 注册页（含角色选择 merchant | admin）
 * 路由: /admin/register
 */
import { Link, Navigate } from 'react-router-dom';
import RegisterForm from '../../components/admin/RegisterForm';
import { useAuth } from '../../context/AuthContext';
import './AdminAuth.css';

export default function AdminRegister() {
  const { isAuthenticated, role } = useAuth();
  if (isAuthenticated) {
    return <Navigate to={role === 'admin' ? '/admin/audit/hotels' : '/admin/merchant/hotels'} replace />;
  }
  return (
    <div className="page-admin-auth">
      <h1>易宿管理端 - 注册</h1>
      <RegisterForm />
      <p className="auth-link">
        已有账号？<Link to="/admin/login">登录</Link>
      </p>
    </div>
  );
}
