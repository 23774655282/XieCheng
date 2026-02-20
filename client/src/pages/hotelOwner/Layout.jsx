import { Outlet } from 'react-router-dom'
import NavBar from '../../components/hotelOwner/NavBar'
import SideBar from '../../components/hotelOwner/SideBar'
import { useAppContext } from '../../context/AppContext'
import { useEffect, useState } from 'react';

function Layout() {
  const { isOwner, navigate } = useAppContext();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!isOwner) {
      navigate('/');
      alert('You are not authorized to access this page.');
    }
  }, [isOwner, navigate]);

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <NavBar onMenuClick={() => setSidebarOpen((o) => !o)} />

      <div className="flex flex-1 relative">
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
