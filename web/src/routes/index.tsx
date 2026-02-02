import { createBrowserRouter, Navigate, RouterProvider } from 'react-router-dom';

// 用户端页面
import Home from '../pages/user/Home';
import HotelsList from '../pages/user/HotelsList';
import HotelDetail from '../pages/user/HotelDetail';

// 管理端 - 认证
import AdminLogin from '../pages/admin/AdminLogin';
import AdminRegister from '../pages/admin/AdminRegister';

// 管理端 - 商户
import MerchantHotels from '../pages/admin/MerchantHotels';
import MerchantHotelNew from '../pages/admin/MerchantHotelNew';
import MerchantHotelEdit from '../pages/admin/MerchantHotelEdit';

// 管理端 - 管理员审核
import AuditHotels from '../pages/admin/AuditHotels';
import AuditHotelDetail from '../pages/admin/AuditHotelDetail';

import AdminGuard from '../components/admin/AdminGuard';

const router = createBrowserRouter([
  // ========== 用户端（移动优先，响应式）==========
  {
    path: '/',
    element: <Home />,
  },
  {
    path: '/hotels',
    element: <HotelsList />,
  },
  {
    path: '/hotels/:id',
    element: <HotelDetail />,
  },

  // ========== 登录 / 注册（管理端入口）==========
  {
    path: '/admin/login',
    element: <AdminLogin />,
  },
  {
    path: '/admin/register',
    element: <AdminRegister />,
  },

  // ========== 管理端 - 商户 ==========
  {
    path: '/admin/merchant/hotels',
    element: (
      <AdminGuard requireRole="merchant">
        <MerchantHotels />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/merchant/hotels/new',
    element: (
      <AdminGuard requireRole="merchant">
        <MerchantHotelNew />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/merchant/hotels/:id/edit',
    element: (
      <AdminGuard requireRole="merchant">
        <MerchantHotelEdit />
      </AdminGuard>
    ),
  },

  // ========== 管理端 - 管理员审核 ==========
  {
    path: '/admin/audit/hotels',
    element: (
      <AdminGuard requireRole="admin">
        <AuditHotels />
      </AdminGuard>
    ),
  },
  {
    path: '/admin/audit/hotels/:id',
    element: (
      <AdminGuard requireRole="admin">
        <AuditHotelDetail />
      </AdminGuard>
    ),
  },

  // ========== 管理端首页重定向 ==========
  {
    path: '/admin',
    element: <Navigate to="/admin/merchant/hotels" replace />,
  },

  // 404
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
]);

export default function Routes() {
  return <RouterProvider router={router} />;
}
