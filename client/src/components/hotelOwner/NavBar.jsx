import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { CiMenuFries } from 'react-icons/ci';

function NavBar({ onMenuClick }) {
  const location = useLocation();
  const navigate = useNavigate();
  const showBack = location.pathname !== '/owner';

  return (
    <header className="w-full h-14 sm:h-16 bg-gray-800 text-white flex items-center justify-between px-3 sm:px-6 shadow-md shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={onMenuClick}
          className="p-2.5 rounded-lg hover:bg-white/10 active:bg-white/20 md:hidden shrink-0"
          aria-label="打开菜单"
        >
          <CiMenuFries size={24} />
        </button>
        {showBack && (
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="hidden sm:flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black/50 text-white hover:bg-gray-700 shrink-0"
          >
            返回
          </button>
        )}
        <Link to="/" className="font-bold text-base sm:text-lg text-white whitespace-nowrap truncate min-w-0">
          易宿·商户
        </Link>
      </div>

      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        <span className="text-xs sm:text-sm opacity-80 hidden sm:inline">商户后台</span>
        <Link
          to="/"
          className="text-xs px-2.5 py-1.5 sm:px-3 sm:py-1 border border-white/70 rounded-full hover:bg-white hover:text-gray-800 transition whitespace-nowrap"
        >
          返回首页
        </Link>
      </div>
    </header>
  );
}

export default NavBar;
