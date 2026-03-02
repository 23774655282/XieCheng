import { useSearchParams } from 'react-router-dom'
import { SlCalender } from 'react-icons/sl'
import { useState, useEffect, useRef } from 'react'
import DatePicker from 'react-datepicker'
import { flip, offset } from '@floating-ui/react'
import { zhCN } from 'date-fns/locale/zh-CN'
import { addDays, differenceInCalendarDays } from 'date-fns'
import { formatLocalDate, formatDateShort, formatDateSuffix, getTodayLocal, parseLocalDate } from '../utils/dateUtils'
import 'react-datepicker/dist/react-datepicker.css'
import { useAppContext } from '../context/AppContext'
import { isCity } from '../utils/destinationSearch'
import { geocodeAmap } from '../utils/amap'
import { heroCarouselImages, assets } from '../assets/assets'
import DestinationDropdown from './DestinationDropdown'
import { regeoAmap, wgs84ToGcj02 } from '../utils/amap'
import { usePerf } from '../context/PerfContext'
import { carouselPerf } from '../utils/carouselPerf'
import toast from 'react-hot-toast'

const HERO_SLIDE_INTERVAL_MS = 5000;

const MY_LOCATION_LABEL = '我的位置';

function Hero() {
    const { isPerfMode: perfMode, isLegacyCarousel: isLegacyMode, isUnoptimizedMode } = usePerf();
    const prevSlideRef = useRef(0);

    const [destination, setDestination] = useState('');
    const myLocationCityRef = useRef(null);
    const myLocationPlaceRef = useRef(null);
    const [locationLoading, setLocationLoading] = useState(false);
    const [checkIn, setCheckIn] = useState(getTodayLocal);
    const [checkOut, setCheckOut] = useState(() => {
        const today = parseLocalDate(getTodayLocal());
        return today ? formatLocalDate(addDays(today, 1)) : '';
    });
    const [cityOptions, setCityOptions] = useState([]);
    const [slideIndex, setSlideIndex] = useState(0);
    const [transitionEnabled, setTransitionEnabled] = useState(true);
    const slideIndexRef = useRef(0);
    const [destinationOpen, setDestinationOpen] = useState(false);
    const [destinationError, setDestinationError] = useState('');
    const [showDomestic, setShowDomestic] = useState(true); // true=国内，false=海外
    const [destinationExact, setDestinationExact] = useState(false); // 具体地点须从联想选择
    const [searchLat, setSearchLat] = useState(null); // 搜索中心纬度（10km 范围用）
    const [searchLng, setSearchLng] = useState(null); // 搜索中心经度
    const destinationRef = useRef(null);
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [rooms, setRooms] = useState(1);
    const [pets, setPets] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const guestsRef = useRef(null);
    const carouselTrackRef = useRef(null);

    const { navigate, getToken, axios, addRecentSearch, recentSearchRecords, clearRecentSearch } = useAppContext();
    const backendRegeo = async (lng, lat) => {
        try {
            const { data } = await axios.get('/api/amap/regeo', { params: { lng, lat }, timeout: 10000 });
            if (data?.success && (data.city || data.province)) {
                return { city: data.city || data.province || data.district || null, place: data.place || data.city || data.province || null };
            }
        } catch (_) {}
        return null;
    };

    useEffect(() => {
        if (!destinationOpen) return;
        function handleClickOutside(e) {
            if (destinationRef.current && !destinationRef.current.contains(e.target)) setDestinationOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [destinationOpen]);

    useEffect(() => {
        if (!guestsOpen) return;
        function handleClickOutside(e) {
            if (guestsRef.current && !guestsRef.current.contains(e.target)) setGuestsOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [guestsOpen]);

    useEffect(() => {
        axios.get("/api/hotels/public/cities")
            .then(({ data }) => data.success && data.cities && setCityOptions(data.cities))
            .catch(() => {});
    }, []);

    useEffect(() => {
        resolveMyLocationCity().then((result) => {
            if (result?.city) myLocationCityRef.current = result.city;
        });
    }, []);

    async function resolveMyLocationCity() {
        if (!navigator.geolocation) return null;
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(
                async (pos) => {
                    const [lat, lng] = wgs84ToGcj02(pos.coords.latitude, pos.coords.longitude);
                    let result = await backendRegeo(lng, lat);
                    if (!result?.city) {
                        const key = import.meta.env.VITE_AMAP_KEY;
                        const addr = await regeoAmap(key, lng, lat);
                        const city = addr?.city || addr?.province || addr?.district || null;
                        result = city ? { city, place: addr?.place || city } : null;
                    }
                    resolve(result || null);
                },
                () => resolve(null),
                { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
            );
        });
    }

    function handleLocationIconClick() {
        setDestination(MY_LOCATION_LABEL);
        setDestinationError('');
        setLocationLoading(true);
        resolveMyLocationCity().then((result) => {
            if (result?.city) {
                myLocationCityRef.current = result.city;
                myLocationPlaceRef.current = result.place || result.city;
            }
            setLocationLoading(false);
            if (result?.city) {
                const displayText = result.place || result.city;
                setDestination(displayText);
                toast.success(`已定位到 ${displayText}`);
            } else {
                const errMsg = '定位失败，请允许浏览器定位权限或手动输入城市名';
                setDestinationError(errMsg);
                toast.error(errMsg);
            }
        });
    }

    const carouselSlides = heroCarouselImages.length > 1 && !isLegacyMode
        ? [...heroCarouselImages, heroCarouselImages[0]]
        : heroCarouselImages;
    const totalSlides = carouselSlides.length;

    useEffect(() => {
        slideIndexRef.current = slideIndex;
    }, [slideIndex]);

    useEffect(() => {
        if (heroCarouselImages.length <= 1) return;
        const timer = setInterval(() => {
            const current = slideIndexRef.current;
            if (isLegacyMode) {
                setSlideIndex((i) => (i + 1) % heroCarouselImages.length);
            } else if (current === totalSlides - 1) {
                setTransitionEnabled(false);
                setSlideIndex(0);
                requestAnimationFrame(() => {
                    requestAnimationFrame(() => {
                        setTransitionEnabled(true);
                    });
                });
            } else {
                setSlideIndex(current + 1);
            }
        }, HERO_SLIDE_INTERVAL_MS);
        return () => clearInterval(timer);
    }, [heroCarouselImages.length, totalSlides, isLegacyMode]);

    useEffect(() => {
        if (perfMode) carouselPerf.reset();
    }, [perfMode, isLegacyMode]);

    useEffect(() => {
        if (!perfMode) return;
        const prev = prevSlideRef.current;
        prevSlideRef.current = slideIndex;
        if (prev === slideIndex) return;
        const isInstantJump = !isLegacyMode && prev === totalSlides - 1 && slideIndex === 0;
        if (isInstantJump) return;
        const isLastToFirst = isLegacyMode && prev === heroCarouselImages.length - 1 && slideIndex === 0;
        carouselPerf.recordTransitionStart(prev, slideIndex, isLastToFirst);
    }, [slideIndex, perfMode, isLegacyMode, heroCarouselImages.length, totalSlides]);

    async function handleSumbit(e) {
        e.preventDefault();
        let searchDestination = destination?.trim() || '';
        const isMyLocation = searchDestination === MY_LOCATION_LABEL || searchDestination === myLocationPlaceRef.current;
        if (isMyLocation) {
            const cached = myLocationCityRef.current;
            if (cached) {
                searchDestination = cached;
            } else {
                setLocationLoading(true);
                const result = await resolveMyLocationCity();
                setLocationLoading(false);
                if (result?.city) {
                    myLocationCityRef.current = result.city;
                    myLocationPlaceRef.current = result.place || result.city;
                    searchDestination = result.city;
                } else {
                    setDestinationError('无法获取当前位置，请检查浏览器定位权限或直接输入城市名搜索');
                    toast.error('定位失败，请允许定位权限或输入目的地');
                    return;
                }
            }
        }
        if (!searchDestination) {
            setDestinationError('请输入目的地');
            toast.error('请输入目的地');
            return;
        }
        if (!isCity(searchDestination, cityOptions) && !destinationExact) {
            setDestinationError('请选择准确的地址');
            toast.error('请选择准确的地址');
            return;
        }
        setDestinationError('');
        let lat = searchLat, lng = searchLng;
        if (!lat && !lng && isCity(searchDestination, cityOptions)) {
            const key = import.meta.env.VITE_AMAP_KEY;
            const coords = await geocodeAmap(key, searchDestination);
            if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
                lat = coords.lat;
                lng = coords.lng;
                setSearchLat(lat);
                setSearchLng(lng);
            }
        }
        const token = await getToken();
        const params = new URLSearchParams();
        params.set("destination", searchDestination);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            params.set("lat", String(lat));
            params.set("lng", String(lng));
        }
        if (checkIn) params.set("checkIn", checkIn);
        if (checkOut) params.set("checkOut", checkOut);
        params.set("adults", String(adults));
        params.set("children", String(children));
        params.set("rooms", String(rooms));
        navigate(`/rooms?${params.toString()}`);
        if (token) {
            axios.post(
              '/api/users/store-recent-search',
              { recentSerachCity: searchDestination },
              { headers: { Authorization: `Bearer ${token}` } },
            ).catch(() => {});
        }

        addRecentSearch({ destination: searchDestination, checkIn, checkOut, rooms, adults, children, lat: Number.isFinite(lat) ? lat : undefined, lng: Number.isFinite(lng) ? lng : undefined });
    }

  return (
    <div className={`relative flex flex-col items-center justify-center h-screen min-h-[600px] ${destinationOpen ? 'z-50' : ''}`}>
      <div className="absolute inset-0 overflow-hidden">
        <div
          ref={carouselTrackRef}
          className="h-full flex"
          onTransitionEnd={(e) => {
            if (e.target === carouselTrackRef.current && e.propertyName === 'transform' && perfMode) {
              carouselPerf.recordTransitionEnd();
            }
          }}
          style={{
            width: `${totalSlides * 100}%`,
            transform: `translate3d(-${slideIndex * (100 / totalSlides)}%, 0, 0)`,
            transition: transitionEnabled ? 'transform 800ms cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
            willChange: 'transform',
            backfaceVisibility: 'hidden',
          }}
        >
          {carouselSlides.map((src, i) => {
            const imgSrc = typeof src === 'string' ? src : src;
            const useEager = isUnoptimizedMode || i === 0;
            return (
              <div
                key={i}
                className="flex-shrink-0 w-full h-full relative bg-gray-900 overflow-hidden"
                style={{
                  width: `${100 / totalSlides}%`,
                  backfaceVisibility: 'hidden',
                }}
              >
                <img
                  src={imgSrc}
                  alt=""
                  loading={useEager ? 'eager' : 'lazy'}
                  decoding="async"
                  fetchPriority={useEager && i === 0 ? 'high' : undefined}
                  className="absolute inset-0 w-full h-full object-cover object-center"
                />
              </div>
            );
          })}
        </div>
      </div>
      <div className="absolute inset-0 bg-black/30 pointer-events-none" aria-hidden />
      {heroCarouselImages.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {heroCarouselImages.map((_, i) => {
            const isActive = slideIndex === totalSlides - 1 ? i === 0 : i === slideIndex;
            return (
              <button
                key={i}
                type="button"
                onClick={() => {
                  const onClone = slideIndex === totalSlides - 1;
                  if (onClone && i === 0) {
                    setTransitionEnabled(false);
                    setSlideIndex(0);
                    requestAnimationFrame(() => {
                      requestAnimationFrame(() => setTransitionEnabled(true));
                    });
                  } else {
                    setTransitionEnabled(true);
                    setSlideIndex(i);
                  }
                }}
                className={`w-2.5 h-2.5 rounded-full transition-colors ${isActive ? 'bg-white' : 'bg-white/50 hover:bg-white/70'}`}
                aria-label={`切换到第 ${i + 1} 张`}
              />
            );
          })}
        </div>
      )}
      <div className='relative z-10 w-full flex flex-col items-center justify-center'>
        <h1 className='md:text-5xl font-bold text-center  text-white'>找到您的理想住宿</h1>
        <p className='font-playfair md:text-lg text-center text-white mt-4'>发现最适合您的酒店与体验。</p>
        <div
         className="w-full max-w-[1000px] mx-auto flex flex-col self-stretch"
         onClick={(e) => {
           if (!e.target.closest('input, button, a, label, [role="option"], [role="listbox"], ul, li, .react-datepicker-wrapper')) {
             document.activeElement?.blur?.();
           }
         }}
         onFocus={(e) => {
           const t = e.target;
           if (t.tagName === 'INPUT' && t.id !== 'destinationInput') {
             setTimeout(() => t.blur(), 0);
           }
         }}
        >
       <form
        onSubmit={handleSumbit}
        className='search-bar-form bg-white/80 backdrop-blur-sm text-gray-500 rounded-lg px-6 py-5 flex flex-col lg:flex-row lg:items-end max-lg:items-start gap-3 my-2 shadow-lg w-full min-w-0'>
           <div className="relative w-full lg:flex-shrink-0 lg:w-[240px] flex flex-col" ref={destinationRef}>
                <div className='flex items-center gap-2'>
                    <SlCalender/>
                    <label htmlFor="destinationInput">目的地</label>
                </div>
                <div className="relative mt-2">
                    <input
                        onChange={(e) => { setDestination(e.target.value); setDestinationOpen(true); setDestinationError(''); setDestinationExact(false); setSearchLat(null); setSearchLng(null); }}
                        onFocus={() => setDestinationOpen(true)}
                        value={destination}
                        id="destinationInput"
                        type="text"
                        className={`rounded-lg border pl-3 pr-3 py-2 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 outline-none w-full min-w-0 min-h-[56px] truncate ${destinationOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`}
                        placeholder="请输入目的地"
                        autoComplete="off"
                        title={destination || '请输入目的地'}
                    />
                    {destinationError && (
                        <div className="absolute top-full left-0 right-0 mt-1 z-20" role="alert">
                            <div className="rounded-lg border border-rose-400 bg-rose-100 px-3 py-2.5 text-sm font-medium text-rose-800 shadow-lg">
                                {destinationError}
                            </div>
                        </div>
                    )}
                </div>
                {destinationOpen && (
                    <DestinationDropdown
                        destination={destination}
                        recentSearchRecords={recentSearchRecords}
                        clearRecentSearch={clearRecentSearch}
                        cityOptions={cityOptions}
                        axios={axios}
                        onSelect={(val, opts) => {
  setDestination(val);
  setDestinationError('');
  if (opts?.exact) setDestinationExact(true);
  if (opts?.location) {
    const parts = String(opts.location).split(',').map(Number);
    if (parts.length >= 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1])) {
      setSearchLng(parts[0]);
      setSearchLat(parts[1]);
    }
  }
}}
                        onCityClick={(val) => { setDestination(val); setDestinationError(''); setSearchLat(null); setSearchLng(null); }}
                        onRestoreRecent={async (r) => {
                            if (!r?.destination) return;
                            setDestination(r.destination);
                            setCheckIn(r.checkIn || '');
                            setCheckOut(r.checkOut || '');
                            setRooms(r.rooms ?? 1);
                            setAdults(r.adults ?? 2);
                            setChildren(r.children ?? 0);
                            setDestinationError('');
                            setDestinationExact(true);
                            setDestinationOpen(false);
                            let lat = r.lat, lng = r.lng;
                            if ((lat == null || lng == null) && r.destination) {
                                const key = import.meta.env.VITE_AMAP_KEY;
                                const coords = await geocodeAmap(key, r.destination);
                                if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
                                    lat = coords.lat;
                                    lng = coords.lng;
                                    setSearchLat(lat);
                                    setSearchLng(lng);
                                }
                            }
                            const params = new URLSearchParams();
                            params.set('destination', r.destination);
                            if (r.checkIn) params.set('checkIn', r.checkIn);
                            if (r.checkOut) params.set('checkOut', r.checkOut);
                            params.set('adults', String(r.adults ?? 2));
                            params.set('children', String(r.children ?? 0));
                            params.set('rooms', String(r.rooms ?? 1));
                            if (lat != null && Number.isFinite(lat)) params.set('lat', String(lat));
                            if (lng != null && Number.isFinite(lng)) params.set('lng', String(lng));
                            navigate(`/rooms?${params.toString()}`);
                            addRecentSearch({ destination: r.destination, checkIn: r.checkIn, checkOut: r.checkOut, rooms: r.rooms, adults: r.adults, children: r.children, lat, lng });
                        }}
                        onClose={() => setDestinationOpen(false)}
                        onLocationClick={handleLocationIconClick}
                        showDomestic={showDomestic}
                        onShowDomesticChange={setShowDomestic}
                    />
                )}
            </div>

            <div className="w-full lg:flex-grow-0 lg:flex-shrink-0 lg:w-[300px] lg:min-w-0">
                <div className="flex items-center justify-between w-full mb-2">
                    <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
                            <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16M8 14h8m-4-7V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" />
                        </svg>
                        <span className="cursor-default">入住</span>
                    </div>
                    <span className="cursor-default">退房</span>
                </div>
                <DatePicker
                    id="checkInOut"
                    selectsRange
                    startDate={checkIn ? parseLocalDate(checkIn) : null}
                    endDate={checkOut ? parseLocalDate(checkOut) : null}
                    onChange={(dates) => {
                      let [start, end] = dates || [null, null];
                      if (start && end && end <= start) end = addDays(start, 1);
                      setCheckIn(start ? formatLocalDate(start) : '');
                      setCheckOut(end ? formatLocalDate(end) : '');
                    }}
                    onCalendarOpen={() => setDatePickerOpen(true)}
                    onCalendarClose={() => setDatePickerOpen(false)}
                    minDate={new Date()}
                    monthsShown={2}
                    customInput={
                      <button
                        type="button"
                        className={`rounded-lg border px-0 py-2 text-sm outline-none w-full cursor-pointer caret-transparent select-none text-left min-h-[56px] flex items-stretch overflow-hidden ${datePickerOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`}
                      >
                        <div className="flex-1 flex flex-col justify-center px-3 text-left min-w-[6.5rem]">
                          <div className="font-semibold text-gray-900 truncate">
                            {checkIn ? formatDateShort(parseLocalDate(checkIn)) : '—'}
                            {checkIn && <span className="text-xs font-normal text-gray-500 ml-1">{formatDateSuffix(parseLocalDate(checkIn))}</span>}
                          </div>
                        </div>
                        <div className="flex items-center justify-center gap-1 px-2 text-gray-500 text-sm shrink-0 cursor-default" onClick={(e) => e.stopPropagation()}>
                          <span className="text-gray-400">—</span>
                          <span className="whitespace-nowrap">{checkIn && checkOut ? differenceInCalendarDays(parseLocalDate(checkOut), parseLocalDate(checkIn)) : 0}晚</span>
                          <span className="text-gray-400">—</span>
                        </div>
                        <div className="flex-1 flex flex-col justify-center px-3 text-right min-w-[6.5rem]">
                          <div className="font-semibold text-gray-900 truncate">
                            {checkOut ? formatDateShort(parseLocalDate(checkOut)) : '—'}
                            {checkOut && <span className="text-xs font-normal text-gray-500 ml-1">{formatDateSuffix(parseLocalDate(checkOut))}</span>}
                          </div>
                        </div>
                      </button>
                    }
                    popperClassName="hero-datepicker-popper"
                    popperPlacement="bottom-start"
                    popperProps={{
                      middleware: [
                        flip({ padding: 15, mainAxis: false, fallbackPlacements: [], fallbackStrategy: 'initialPlacement' }),
                        offset(0),
                      ],
                    }}
                    locale={zhCN}
                    calendarStartDay={0}
                    onKeyDown={(e) => { if (e.key !== 'Tab') e.preventDefault(); }}
                />
            </div>

            <div className="relative flex lg:flex-col max-lg:gap-2 max-lg:items-center w-full lg:flex-shrink-0 lg:w-[240px]" ref={guestsRef}>
                <div className="flex items-center gap-2 shrink-0">
                    <img src={assets.guestsIcon} alt="" className="w-4 h-4 flex-shrink-0 opacity-70" />
                    <label className="mb-1.5 md:mb-0 whitespace-nowrap">人数</label>
                </div>
                <div className="relative w-full min-w-0">
                <button type="button" onClick={() => setGuestsOpen((o) => !o)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 mt-2 text-sm outline-none w-full min-w-0 min-h-[56px] text-left cursor-pointer ${guestsOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`}>
                    <span className="text-gray-900 font-semibold flex-1 truncate">{adults}位成人 · {children}名儿童 · {rooms}间客房</span>
                    <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {guestsOpen && (
                    <div className="absolute top-full left-0 right-0 mt-2 py-4 px-4 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-lg z-20 w-full md:min-w-[220px]">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">成人</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                    <span className="w-8 text-center text-sm font-medium">{adults}</span>
                                    <button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))} disabled={adults >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">儿童</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                    <span className="w-8 text-center text-sm font-medium">{children}</span>
                                    <button type="button" onClick={() => setChildren((c) => Math.min(9, c + 1))} disabled={children >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-700">客房</span>
                                <div className="flex items-center gap-1">
                                    <button type="button" onClick={() => setRooms((r) => Math.max(1, r - 1))} disabled={rooms <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                    <span className="w-8 text-center text-sm font-medium">{rooms}</span>
                                    <button type="button" onClick={() => setRooms((r) => Math.min(9, r + 1))} disabled={rooms >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                </div>
                            </div>
                            <div className="pt-2 border-t border-gray-100">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-gray-700">携带宠物?</span>
                                    <button type="button" role="switch" aria-checked={pets} onClick={() => setPets((p) => !p)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${pets ? 'bg-blue-500' : 'bg-gray-300'}`}>
                                        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${pets ? 'left-[22px]' : 'left-0.5'}`} />
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-2">辅助动物不视为宠物。</p>
                            </div>
                        </div>
                        <button type="button" onClick={() => setGuestsOpen(false)} className="mt-4 w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800">完成</button>
                    </div>
                )}
                </div>
            </div>

            <div className="flex flex-row gap-2 w-full lg:flex-shrink-0 lg:w-[120px] max-lg:flex-1">
                <button type="submit" className="flex flex-1 lg:w-full items-center justify-center gap-1 rounded-md bg-black py-2.5 px-4 text-white text-sm cursor-pointer min-w-0 min-h-[56px]">
                    <svg className="w-4 h-4 text-white flex-shrink-0" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" >
                        <path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" />
                    </svg>
                    <span>搜索</span>
                </button>
            </div>
        </form>
        <div className="mt-8 flex flex-row items-center justify-center gap-3">
          <button type="button" onClick={() => navigate('/ai-hotel')} className="px-5 py-2 rounded-full bg-white/90 text-gray-800 text-sm font-medium shadow hover:bg-white flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
            AI选酒店
          </button>
          <button type="button" onClick={() => navigate('/travel-map')} className="px-5 py-2 rounded-full bg-white/90 text-gray-800 text-sm font-medium shadow hover:bg-white flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
            旅行地图
          </button>
        </div>
        </div>
      </div>
    </div>
  )
}

export default Hero
