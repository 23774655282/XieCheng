import React from 'react'
import { useAppContext } from '../context/AppContext'
import { useParams } from 'react-router-dom';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useEffect } from 'react';

function Loader() {
    const {navigate}= useAppContext();

    const {nextUrl} = useParams();

    useEffect(()=>{
        if (nextUrl) {
            setTimeout(()=>{
                navigate(`/${nextUrl}`);
            },8000)
        }
    },[nextUrl])

  return (
    <div className='w-full h-screen flex items-center justify-center bg-white'>
        <AiOutlineLoading3Quarters
        className='text-4xl text-gray-500 animate-spin'
        />
    </div>
  )
}

export default Loader