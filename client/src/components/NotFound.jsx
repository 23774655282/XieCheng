import React from 'react'
import { useNavigate } from 'react-router-dom';

function NotFound() {

    const navigate = useNavigate();

  return (
    

<div class="flex flex-col items-center justify-center text-sm max-md:px-4 py-20">
    <h1 class="text-4xl md:text-5xl font-bold bg-gradient-to-r from-white to-gray-500 bg-clip-text text-transparent">
        404 Not Found
    </h1>
    <div class="h-px w-80 rounded bg-gradient-to-r from-gray-400 to-gray-800 my-5 md:my-7"></div>
    <p class="md:text-xl text-gray-400 max-w-lg text-center">
        The page you are looking for does not exist or has been moved.
    </p>
    <button 
        onClick={() => navigate(-1)}
        class="mt-8 px-6 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition duration-300">
        Go Back
    </button>
</div>
  )
}

export default NotFound