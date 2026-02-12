import { SlCalender } from 'react-icons/sl'
import { LuMapPinCheckInside } from 'react-icons/lu'
import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import { zhCN } from 'date-fns/locale/zh-CN'
import 'react-datepicker/dist/react-datepicker.css'
import { useAppContext } from '../context/AppContext'
import { heroCarouselImages } from '../assets/assets'

const HERO_SLIDE_INTERVAL_MS = 5000;

function Hero() {
    const [destination, setDestination] = useState("");
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [cityOptions, setCityOptions] = useState([]);
    const [slideIndex, setSlideIndex] = useState(0);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const destinationRef = useRef(null);

    const { navigate, getToken, axios, setSearchCity } = useAppContext();

    useEffect(() => {
        if (!destinationOpen) return;
        function handleClickOutside(e) {
            if (destinationRef.current && !destinationRef.current.contains(e.target)) setDestinationOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [destinationOpen]);

    useEffect(() => {
        axios.get("/api/hotels/public/cities")
            .then(({ data }) => data.success && data.cities && setCityOptions(data.cities))
            .catch(() => {});
    }, []);

    useEffect(() => {
        if (heroCarouselImages.length <= 1) return;
        const timer = setInterval(() => {
            setSlideIndex((i) => (i + 1) % heroCarouselImages.length);
        }, HERO_SLIDE_INTERVAL_MS);
        return () => clearInterval(timer);
    }, []);

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
    <div className='relative flex flex-col items-center justify-center h-screen overflow-hidden'>
      {/* 轮播背景层：向左滑动切换 */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="h-full flex transition-transform duration-700 ease-in-out"
          style={{
            width: `${heroCarouselImages.length * 100}%`,
            transform: `translateX(-${slideIndex * (100 / heroCarouselImages.length)}%)`,
          }}
        >
          {heroCarouselImages.map((src, i) => (
            <div
              key={i}
              className="flex-shrink-0 w-full h-full bg-cover bg-center bg-no-repeat"
              style={{
                width: `${100 / heroCarouselImages.length}%`,
                backgroundImage: `url(${typeof src === 'string' ? src : src})`,
              }}
            />
          ))}
        </div>
      </div>
      <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
      {/* 轮播指示点 */}
      {heroCarouselImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroCarouselImages.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setSlideIndex(i)}
              className={`w-2.5 h-2.5 rounded-full transition-colors ${i === slideIndex ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}
              aria-label={`切换到第 ${i + 1} 张`}
            />
          ))}
        </div>
      )}
      <div className='relative z-10 flex flex-col items-center justify-center'>
        <p className='bg-[#49b9ff]/50 px-3 py-1 rounded-full md:mt-20 mt-32'>极致酒店体验</p>
        <h1 className='md:text-5xl font-bold text-center  text-white'>找到您的理想住宿</h1>
        <p className='font-playfair md:text-lg text-center text-white mt-4'>发现最适合您的酒店与体验。</p>
        <form
         onSubmit={handleSumbit}
         className='bg-white/80 backdrop-blur-sm text-gray-500 rounded-lg px-5 py-3 flex flex-col md:flex-row max-md:items-start gap-3 max-md:mx-auto my-2'>

            <div className="relative" ref={destinationRef}>
                <div className='flex items-center gap-2'>
                    <SlCalender/>
                    <label htmlFor="destinationInput">目的地</label>
                </div>
                <input
                    onChange={(e) => { setDestination(e.target.value); setDestinationOpen(true); }}
                    onFocus={() => setDestinationOpen(true)}
                    value={destination}
                    id="destinationInput"
                    type="text"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none w-full min-w-0"
                    placeholder="输入或选择目的地"
                    required
                    autoComplete="off"
                />
                {destinationOpen && cityOptions.length > 0 && (
                    <ul
                        className="absolute top-full left-0 right-0 mt-1 py-1 max-h-48 overflow-y-auto rounded-lg bg-white/70 backdrop-blur-sm border border-gray-200/80 shadow-lg z-20"
                        role="listbox"
                    >
                        {cityOptions
                            .filter((city) => !destination || String(city).toLowerCase().includes(destination.toLowerCase()))
                            .map((city, idx) => (
                                <li
                                    key={idx}
                                    role="option"
                                    className="px-3 py-2 text-sm text-gray-700 cursor-pointer hover:bg-white/60 first:rounded-t-lg last:rounded-b-lg"
                                    onClick={() => { setDestination(city); setDestinationOpen(false); }}
                                >
                                    {city}
                                </li>
                            ))}
                    </ul>
                )}
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <LuMapPinCheckInside />
                    <label htmlFor="checkIn">入住</label>
                </div>
                <DatePicker
                    id="checkIn"
                    selected={checkIn ? new Date(checkIn) : null}
                    onChange={(d) => setCheckIn(d ? d.toISOString().slice(0, 10) : '')}
                    dateFormat="yyyy年M月d日"
                    placeholderText="选择日期"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none w-full"
                    popperClassName="hero-datepicker-popper"
                    minDate={new Date()}
                    locale={zhCN}
                    calendarStartDay={1}
                />
            </div>

            <div>
                <div className='flex items-center gap-2'>
                    <svg className="w-4 h-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
                        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16M8 14h8m-4-7V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" />
                    </svg>
                    <label htmlFor="checkOut">退房</label>
                </div>
                <DatePicker
                    id="checkOut"
                    selected={checkOut ? new Date(checkOut) : null}
                    onChange={(d) => setCheckOut(d ? d.toISOString().slice(0, 10) : '')}
                    dateFormat="yyyy年M月d日"
                    placeholderText="选择日期"
                    className="rounded-lg border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none w-full"
                    popperClassName="hero-datepicker-popper"
                    minDate={checkIn ? new Date(checkIn) : new Date()}
                    locale={zhCN}
                    calendarStartDay={1}
                />
            </div>

            <div className='flex md:flex-col max-md:gap-2 max-md:items-center'>
                <label htmlFor="guests">人数</label>
                <input min={1} max={4} step={1} id="guests" type="number" defaultValue={1} className="rounded-lg border border-gray-200 px-3 py-1.5 mt-1.5 text-sm outline-none max-w-16" placeholder="1" />
            </div>

            <div className="flex flex-row gap-2 my-auto max-md:w-full max-md:flex-1">
                <button
                    type="button"
                    onClick={() => navigate('/ai-hotel')}
                    className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black py-2 px-3 text-white text-sm whitespace-nowrap hover:bg-gray-800 min-w-0"
                >
                    AI选酒店
                </button>
                <button type="submit" className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black py-2 px-3 text-white text-sm cursor-pointer min-w-0">
                    <svg className="w-4 h-4 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
                        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                    <span>搜索</span>
                </button>
            </div>
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => navigate('/travel-map')}
            className="px-5 py-2 rounded-full bg-white/90 text-gray-800 text-sm font-medium shadow hover:bg-white flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
            旅行地图
          </button>
        </div>
      </div>
    </div>
  )
}

export default Hero