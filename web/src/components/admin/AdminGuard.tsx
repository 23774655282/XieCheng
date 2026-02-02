/**
 * 管理端路由守卫：未登录跳转登录页，角色不符跳转对应首页
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface AdminGuardProps {
  children: React.ReactNode;
  requireRole?: 'merchant' | 'admin';
}

export default function AdminGuard({ children, requireRole }: AdminGuardProps) {
  const { isAuthenticated, role } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  if (requireRole && role !== requireRole) {
    // 商户访问管理员页面 -> 跳转商户首页；管理员访问商户页面 -> 跳转审核页
    return <Navigate to={role === 'admin' ? '/admin/audit/hotels' : '/admin/merchant/hotels'} replace />;
  }

  return <>{children}</>;
}
