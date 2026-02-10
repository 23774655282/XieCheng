import React from 'react';
import { Link } from 'react-router-dom';
import { assets } from '../../assets/assets';

function NavBar() {
  return (
    <div className="w-full h-16 bg-gray-800 text-white flex items-center justify-between px-6 shadow-md">
      <Link to="/">
        <img
          src={assets.logo}
          alt="Logo"
          className="h-10 object-contain"
        />
      </Link>

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
