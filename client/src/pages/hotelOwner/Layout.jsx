import { Outlet } from 'react-router-dom'
import NavBar from '../../components/hotelOwner/NavBar'
import SideBar from '../../components/hotelOwner/SideBar'
import { useAppContext } from '../../context/AppContext'
import { useEffect, useState } from 'react';

function Layout() {
  const { isOwner, authChecked, navigate } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!authChecked) return; // 等待认证加载完成，避免刷新时误判
    if (!isOwner) {
      navigate('/');
      alert('You are not authorized to access this page.');
    }
  }, [authChecked, isOwner, navigate]);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <NavBar onMenuClick={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 relative min-h-0 items-stretch">
        <SideBar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

        <div
          className="flex-1 min-w-0 p-3 sm:p-4 overflow-auto"
          onClick={() => setSidebarOpen(false)}
        >
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
