import React from 'react'
import { useNavigate } from 'react-router-dom';

function NotFound() {

    const navigate = useNavigate();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="px-4 pt-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
        >
          <span>←</span> 返回
        </button>
      </div>
      <div className="flex flex-col items-center justify-center text-sm max-md:px-4 py-20 flex-1">
        <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
          404 页面不存在
        </h1>
        <div className="h-px w-80 rounded bg-gradient-to-r from-gray-400 to-gray-800 my-5 md:my-7" />
        <p className="md:text-xl text-gray-400 max-w-lg text-center">
          您访问的页面不存在或已移动。
        </p>
      </div>
    </div>
  )
}

export default NotFound