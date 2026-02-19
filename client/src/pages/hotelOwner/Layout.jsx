import { Outlet } from 'react-router-dom'
import NavBar from '../../components/hotelOwner/NavBar'
import SideBar from '../../components/hotelOwner/SideBar'
import { useAppContext } from '../../context/AppContext'
import { useEffect } from 'react';
import toast from 'react-hot-toast';

function Layout() {

  const {isOwner,navigate} = useAppContext();

  useEffect(()=>{
    if (!isOwner) {
      navigate('/');
      alert('You are not authorized to access this page.');
    }
  },[isOwner])

  return (
    <div className="w-full min-h-screen bg-gray-100 flex flex-col">
      <NavBar />

      <div className="flex flex-1">
        <div className="h-[calc(100vh-4rem)] bg-gray-200">
          <SideBar />
        </div>

        <div className="flex-1 p-4 overflow-auto">
          <Outlet />
        </div>
      </div>
    </div>
  )
}

export default Layout
