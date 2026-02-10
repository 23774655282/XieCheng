import { cities } from '../assets/assets'
import { SlCalender } from 'react-icons/sl'
import { LuMapPinCheckInside } from 'react-icons/lu'
import { useState } from 'react'
import { useAppContext } from '../context/AppContext'
function Hero() {

    const [destination, setDestination] = useState("");
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");

    const { navigate, getToken, axios, setSearchCity, isAuthenticated, logout } = useAppContext();

    async function handleSumbit(e) {
        e.preventDefault();
        const token = await getToken();
        const params = new URLSearchParams();
        if (destination) params.set("destination", destination);
        if (checkIn) params.set("checkIn", checkIn);
        if (checkOut) params.set("checkOut", checkOut);
        navigate(`/rooms?${params.toString()}`);
        if (token) {
            await axios.post(
              '/api/users/store-recent-search',
              { recentSerachCity: destination },
              { headers: { Authorization: `Bearer ${token}` } },
            );
        }

        setSearchCity((prev)=>{
            const updated=[...prev,destination]
            if (updated.length>3) {
                updated.shift();
            }

            return updated;
        })
    }

  return (
    <div className='flex flex-col items-center justify-center h-screen bg-hero bg-cover bg-center bg-[url("/src/assets/heroImage.png")] bg-no-repeat'>
        <p className='bg-[#49b9ff]/50 px-3 py-1 rounded-full md:mt-20 mt-32'>The Ultimate Hotel Experience</p>
        <h1 className='md:text-5xl font-bold text-center  text-white'>Find Your Perfect Stay</h1>
        <p className='font-playfair md:text-lg text-center text-white mt-4'>Discover the best hotels and experiences tailored just for you.</p>
        <form
         onSubmit={handleSumbit}
         className='bg-white text-gray-500 rounded-lg px-6 py-4  flex flex-col md:flex-row max-md:items-start gap-4 max-md:mx-auto my-2'>

            <div>
                <div className='flex items-center gap-2'>
                    <SlCalender/>
                    <label htmlFor="destinationInput">Destination</label>
                </div>
                <input
                onChange={(e)=>setDestination(e.target.value)}
                value={destination}
                list='destinations' id="destinationInput" type="text" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" placeholder="Type here" required />
                <datalist id = 'destinations'>
                    {
                        cities.map((city,idx)=>(
                            <option value={city} key={idx}/>
                        ))
                    }
                </datalist>
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <LuMapPinCheckInside />
                    <label htmlFor="checkIn">Check in</label>
                </div>
                <input id="checkIn" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <svg className="w-4 h-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16M8 14h8m-4-7V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" />
                    </svg>
                    <label htmlFor="checkOut">Check out</label>
                </div>
                <input id="checkOut" type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none" />
            </div>

            <div className='flex md:flex-col max-md:gap-2 max-md:items-center'>
                <label htmlFor="guests">Guests</label>
                <input min={1} max={4} id="guests" type="number" className=" rounded border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none  max-w-16" placeholder="0" />
            </div>

            <button className='flex items-center justify-center gap-1 rounded-md bg-black py-3 px-4 text-white my-auto cursor-pointer max-md:w-full max-md:py-1' >
                <svg className="w-4 h-4 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
                    <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                </svg>
                <span>Search</span>
            </button>
        </form>
        {/* 主页快捷登录 / 退出按钮 */}
        {!isAuthenticated ? (
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 rounded-full bg-white/90 text-gray-800 text-sm font-medium shadow hover:bg-white"
          >
            登录 / 注册
          </button>
        ) : (
          <button
            onClick={() => logout()}
            className="mt-4 px-6 py-2 rounded-full bg-white/90 text-gray-800 text-sm font-medium shadow hover:bg-white"
          >
            退出登录
          </button>
        )}
    </div>
  )
}

export default Hero