import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

function NavBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = location.pathname !== '/owner';

  return (
    <div className="w-full h-16 bg-gray-800 text-white flex items-center justify-between px-6 shadow-md">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
          >
            <span>←</span> 返回
          </button>
        )}
        <Link to="/" className="font-bold text-lg text-white whitespace-nowrap">
          易宿酒店预订平台
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <span className="text-sm opacity-80">商户后台</span>
        <Link
          to="/"
          className="text-xs px-3 py-1 border border-white/70 rounded-full hover:bg-white hover:text-gray-800 transition"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}

export default NavBar;
