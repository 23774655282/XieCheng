import { SlCalender } from 'react-icons/sl';
import { LuMapPinCheckInside } from 'react-icons/lu';
import { useState, useEffect, useRef } from 'react';
import DatePicker from 'react-datepicker';
import { flip, offset } from '@floating-ui/react';
import { zhCN } from 'date-fns/locale/zh-CN';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { formatLocalDate, formatDateShort, formatDateSuffix, getTodayLocal, parseLocalDate } from '../utils/dateUtils';
import 'react-datepicker/dist/react-datepicker.css';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { assets } from '../assets/assets';
import DestinationDropdown from './DestinationDropdown';

function SearchBar() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { getToken, axios, addRecentSearch, recentSearchRecords, clearRecentSearch } = useAppContext();

  const [destination, setDestination] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [rooms, setRooms] = useState(1);
  const [pets, setPets] = useState(false);
  const [cityOptions, setCityOptions] = useState([]);
  const [destinationOpen, setDestinationOpen] = useState(false);
  const [destinationError, setDestinationError] = useState('');
  const [guestsOpen, setGuestsOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const destinationRef = useRef(null);
  const guestsRef = useRef(null);

  useEffect(() => {
    setDestination(searchParams.get('destination') || '');
    const cIn = searchParams.get('checkIn') || getTodayLocal();
    const cOut = searchParams.get('checkOut') || (cIn ? formatLocalDate(addDays(parseLocalDate(cIn), 1)) : '');
    setCheckIn(cIn);
    setCheckOut(cOut);
    setAdults(Number(searchParams.get('adults')) || 2);
    setChildren(Number(searchParams.get('children')) || 0);
    setRooms(Number(searchParams.get('rooms')) || 1);
  }, [searchParams]);

  useEffect(() => {
    axios.get('/api/hotels/public/cities')
      .then(({ data }) => data.success && data.cities && setCityOptions(data.cities))
      .catch(() => {});
  }, [axios]);

  useEffect(() => {
    if (!destinationOpen) return;
    const handleClickOutside = (e) => {
      if (destinationRef.current && !destinationRef.current.contains(e.target)) setDestinationOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [destinationOpen]);

  useEffect(() => {
    if (!guestsOpen) return;
    const handleClickOutside = (e) => {
      if (guestsRef.current && !guestsRef.current.contains(e.target)) setGuestsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [guestsOpen]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!destination || !destination.trim()) {
      setDestinationError('请输入目的地');
      return;
    }
    setDestinationError('');
    const params = new URLSearchParams();
    params.set('destination', destination.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    params.set('adults', String(adults));
    params.set('children', String(children));
    params.set('rooms', String(rooms));
    navigate(`/rooms?${params.toString()}`);
    window.scrollTo(0, 0);

    const token = await getToken();
    if (token) {
      axios.post('/api/users/store-recent-search', { recentSerachCity: destination }, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    addRecentSearch({ destination: destination.trim(), checkIn, checkOut, rooms, adults });
  }

  return (
    <div className="w-full" onClick={(e) => { if (!e.target.closest('input, button, a, label, [role="option"], [role="listbox"], ul, li, .react-datepicker-wrapper')) document.activeElement?.blur?.(); }} onFocusIn={(e) => { const t = e.target; if (t.tagName === 'INPUT' && t.id !== 'searchBar-destination') setTimeout(() => t.blur(), 0); }}>
    <form onSubmit={handleSubmit} className="search-bar-form w-full bg-white/80 backdrop-blur-sm text-gray-500 rounded-lg px-6 py-5 flex flex-col md:flex-row md:items-end max-md:items-start gap-4 max-md:mx-auto shadow-sm border border-gray-100">
      <div className="relative w-full md:min-w-0 md:max-w-[220px]" ref={destinationRef}>
        <div className="flex items-center gap-2"><SlCalender /><label htmlFor="searchBar-destination">目的地</label></div>
        <input onChange={(e) => { setDestination(e.target.value); setDestinationOpen(true); setDestinationError(''); }} onFocus={() => setDestinationOpen(true)} value={destination} id="searchBar-destination" type="text" className={`rounded-lg border px-3 py-2 mt-2 text-sm font-semibold text-gray-900 placeholder:font-normal placeholder:text-gray-400 outline-none w-full min-w-0 min-h-[56px] ${destinationOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`} placeholder="输入或选择目的地" autoComplete="off" />
        {destinationOpen && <DestinationDropdown destination={destination} recentSearchRecords={recentSearchRecords} clearRecentSearch={clearRecentSearch} cityOptions={cityOptions} axios={axios} onSelect={(val) => { setDestination(val); setDestinationError(''); }} onClose={() => setDestinationOpen(false)} />}
        {destinationError && <div className="relative mt-2 w-fit"><div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-rose-800" aria-hidden /><div className="bg-rose-800 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap">{destinationError}</div></div>}
      </div>

      <div className="w-full md:min-w-[380px] flex-1">
        <div className="flex items-center justify-between w-full"><div className="flex items-center gap-2"><svg className="w-4 h-4 text-gray-800" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 10h16M8 14h8m-4-7V4M7 7V4m10 3V4M5 20h14a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z" /></svg><span className="cursor-default">入住</span></div><span className="cursor-default pr-4">退房</span></div>
        <DatePicker id="searchBar-checkInOut" selectsRange startDate={checkIn ? parseLocalDate(checkIn) : null} endDate={checkOut ? parseLocalDate(checkOut) : null} onChange={(dates) => { let [start, end] = dates || [null, null]; if (start && end && end <= start) end = addDays(start, 1); setCheckIn(start ? formatLocalDate(start) : ''); setCheckOut(end ? formatLocalDate(end) : ''); }} onCalendarOpen={() => setDatePickerOpen(true)} onCalendarClose={() => setDatePickerOpen(false)} minDate={new Date()} monthsShown={2} customInput={<button type="button" className={`rounded-lg border px-0 py-2 mt-2 text-sm outline-none w-[101%] min-w-0 cursor-pointer caret-transparent select-none text-left min-h-[56px] flex items-stretch overflow-hidden ${datePickerOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`}><div className="flex-1 flex flex-col justify-center px-4 text-left min-w-[6.5rem]"><div className="font-semibold text-gray-900">{checkIn ? formatDateShort(parseLocalDate(checkIn)) : '—'}{checkIn && <span className="text-xs font-normal text-gray-500 ml-1">{formatDateSuffix(parseLocalDate(checkIn))}</span>}</div></div><div className="flex items-center justify-center gap-2 px-4 text-gray-500 text-sm shrink-0 cursor-default" onClick={(e) => e.stopPropagation()}><span className="text-gray-400">—</span><span>{checkIn && checkOut ? differenceInCalendarDays(parseLocalDate(checkOut), parseLocalDate(checkIn)) : 0}晚</span><span className="text-gray-400">—</span></div><div className="flex-1 flex flex-col justify-center px-4 text-right min-w-[6.5rem]"><div className="font-semibold text-gray-900">{checkOut ? formatDateShort(parseLocalDate(checkOut)) : '—'}{checkOut && <span className="text-xs font-normal text-gray-500 ml-1">{formatDateSuffix(parseLocalDate(checkOut))}</span>}</div></div></button>} popperClassName="hero-datepicker-popper" popperPlacement="bottom-start" popperProps={{ middleware: [flip({ padding: 15, mainAxis: false, fallbackPlacements: [], fallbackStrategy: 'initialPlacement' }), offset(10)] }} locale={zhCN} calendarStartDay={0} onKeyDown={(e) => { if (e.key !== 'Tab') e.preventDefault(); }} />
      </div>

      <div className="relative flex md:flex-col max-md:gap-2 max-md:items-center shrink-0 w-full md:min-w-[260px]" ref={guestsRef}>
        <div className="flex items-center gap-2"><img src={assets.guestsIcon} alt="" className="w-4 h-4 flex-shrink-0 opacity-70" /><label className="mb-1.5 md:mb-0">人数</label></div>
        <div className="relative w-full min-w-0">
        <button type="button" onClick={() => setGuestsOpen((o) => !o)} className={`flex items-center gap-2 rounded-lg border px-3 py-2 mt-2 text-sm outline-none w-full min-w-0 min-h-[56px] text-left cursor-pointer ${guestsOpen ? 'border-gray-700 bg-gray-100/50' : 'border-gray-200'}`}>
          <span className="text-gray-900 font-semibold flex-1 truncate">{adults}位成人 · {children}名儿童 · {rooms}间客房</span>
          <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
        </button>
        {guestsOpen && (
          <div className="absolute top-full left-0 right-0 mt-2 py-4 px-4 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-lg z-20 w-full md:min-w-[220px]">
            <div className="space-y-4">
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">成人</span><div className="flex items-center gap-1"><button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button><span className="w-8 text-center text-sm font-medium">{adults}</span><button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))} disabled={adults >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button></div></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">儿童</span><div className="flex items-center gap-1"><button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button><span className="w-8 text-center text-sm font-medium">{children}</span><button type="button" onClick={() => setChildren((c) => Math.min(9, c + 1))} disabled={children >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button></div></div>
              <div className="flex items-center justify-between"><span className="text-sm text-gray-700">客房</span><div className="flex items-center gap-1"><button type="button" onClick={() => setRooms((r) => Math.max(1, r - 1))} disabled={rooms <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button><span className="w-8 text-center text-sm font-medium">{rooms}</span><button type="button" onClick={() => setRooms((r) => Math.min(9, r + 1))} disabled={rooms >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button></div></div>
              <div className="pt-2 border-t border-gray-100"><div className="flex items-center justify-between"><span className="text-sm text-gray-700">携带宠物?</span><button type="button" role="switch" aria-checked={pets} onClick={() => setPets((p) => !p)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${pets ? 'bg-blue-500' : 'bg-gray-300'}`}><span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${pets ? 'left-[22px]' : 'left-0.5'}`} /></button></div><p className="text-xs text-gray-500 mt-2">辅助动物不视为宠物。</p></div>
            </div>
            <button type="button" onClick={() => setGuestsOpen(false)} className="mt-4 w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800">完成</button>
          </div>
        )}
        </div>
      </div>

      <div className="flex flex-row gap-2 max-md:w-full max-md:flex-1 shrink-0">
        <button type="submit" className="flex flex-1 items-center justify-center gap-1 rounded-md bg-black py-2.5 px-4 text-white text-sm cursor-pointer min-w-0 min-h-[56px]">
          <svg className="w-4 h-4 text-white" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeLinecap="round" strokeWidth="2" d="m21 21-3.5-3.5M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z" /></svg>
          <span>搜索</span>
        </button>
      </div>
    </form>
    </div>
  );
}

export default SearchBar;
