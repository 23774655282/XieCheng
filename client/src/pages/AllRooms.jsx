import React, { useMemo, useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { createPortal } from 'react-dom';
import { facilityIcons } from '../assets/assets';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { HotelImageCarousel } from '../components/HotelImageCarousel';
import SearchBar from '../components/SearchBar';
import toast from 'react-hot-toast';
import { formatDateShort, parseLocalDate } from '../utils/dateUtils';
import { isCity } from '../utils/destinationSearch';
import { usePerf } from '../context/PerfContext';
import { virtualListPerf } from '../utils/virtualListPerf';
import { SkeletonRoomGrid, SkeletonHotelList } from '../components/Skeleton';
import { getRoomTypeLabel } from '../utils/roomTypes';

function CheckBox({ label, selected = false, onChange }) {
  return (
    <label className="flex items-center gap-2 cursor-pointer py-0.5">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onChange(e.target.checked, label)}
        className="w-3.5 h-3.5 rounded border-gray-300 flex-shrink-0"
      />
      <span className="text-xs text-gray-700 select-none">{label}</span>
    </label>
  );
}

function PriceRangeSlider({ min, max, step, valueMin, valueMax, onChange, unboundedMaxValue }) {
  const trackRef = useRef(null);
  const [dragging, setDragging] = useState(null); // 'min' | 'max' | null

  const valueToPercent = (v) => (v >= (unboundedMaxValue ?? Infinity) ? 100 : ((v - min) / (max - min)) * 100);
  const percentToValue = (p) => (p >= 99.5 && unboundedMaxValue != null ? unboundedMaxValue : Math.round((min + (p / 100) * (max - min)) / step) * step);

  const handleMove = useCallback((e) => {
    if (!trackRef.current || !dragging) return;
    const rect = trackRef.current.getBoundingClientRect();
    const percent = Math.max(0, Math.min(100, ((e.clientX || e.touches?.[0]?.clientX) - rect.left) / rect.width * 100));
    const v = percentToValue(percent);
    const effectiveMax = valueMax >= (unboundedMaxValue ?? Infinity) ? max : valueMax;
    if (dragging === 'min') {
      const newMin = Math.max(min, Math.min(v, effectiveMax - step));
      onChange(newMin, valueMax);
    } else {
      const newMax = (unboundedMaxValue != null && percent >= 99) ? unboundedMaxValue : Math.max(valueMin + step, Math.min(v, max));
      onChange(valueMin, newMax);
    }
  }, [dragging, min, max, step, valueMin, valueMax, onChange, unboundedMaxValue]);

  useEffect(() => {
    if (!dragging) return;
    const up = () => setDragging(null);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchend', up);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('touchmove', handleMove, { passive: false });
    return () => {
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchend', up);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('touchmove', handleMove);
    };
  }, [dragging, handleMove]);

  const pMin = valueToPercent(valueMin);
  const pMax = valueToPercent(valueMax);

  return (
    <div ref={trackRef} className="relative h-10 flex items-center pt-2">
      {/* 刻度线，每 50 一格 */}
      <div className="absolute inset-x-0 top-0 flex justify-between pointer-events-none px-1">
        {Array.from({ length: (max - min) / step + 1 }, (_, i) => (
          <div key={i} className="flex-1 flex justify-center">
            <div className="w-px h-2 bg-gray-200" />
          </div>
        ))}
      </div>
      {/* 轨道背景 */}
      <div className="absolute inset-x-0 h-2 rounded-full bg-gray-200" />
      {/* 选中范围 */}
      <div
        className="absolute h-2 rounded-full bg-gray-900"
        style={{ left: `${pMin}%`, right: `${100 - pMax}%` }}
      />
      {/* 左拇指 */}
      <div
        className="absolute w-5 h-5 rounded-full bg-gray-900 border-2 border-white shadow cursor-grab active:cursor-grabbing z-10 -ml-2.5"
        style={{ left: `${pMin}%` }}
        onMouseDown={(e) => { e.preventDefault(); setDragging('min'); }}
        onTouchStart={(e) => { e.preventDefault(); setDragging('min'); }}
      />
      {/* 右拇指 */}
      <div
        className="absolute w-5 h-5 rounded-full bg-gray-900 border-2 border-white shadow cursor-grab active:cursor-grabbing z-10 -ml-2.5"
        style={{ left: `${pMax}%` }}
        onMouseDown={(e) => { e.preventDefault(); setDragging('max'); }}
        onTouchStart={(e) => { e.preventDefault(); setDragging('max'); }}
      />
    </div>
  );
}

function AllRooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = searchParams.get('destination') || '';
  const promo = searchParams.get('promo') || '';
  const lat = searchParams.get('lat') || '';
  const lng = searchParams.get('lng') || '';
  const { rooms: contextRooms, fetchRooms, axios, isAuthenticated, user: userInfo, role, roomsLoading } = useAppContext();

  const [localRooms, setLocalRooms] = useState([]);
  const [localNextPage, setLocalNextPage] = useState(2);
  const [localHasMore, setLocalHasMore] = useState(false);
  const [loadingSearch, setLoadingSearch] = useState(false);

  const [promoRooms, setPromoRooms] = useState([]);
  const [promoNextPage, setPromoNextPage] = useState(2);
  const [promoHasMore, setPromoHasMore] = useState(false);
  const [loadingPromo, setLoadingPromo] = useState(false);

  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [legacyHotelListReady, setLegacyHotelListReady] = useState(false);
  const [legacyAllRooms, setLegacyAllRooms] = useState([]);
  const bottomRef = useRef(null);
  const promoListParentRef = useRef(null);
  const mobileFilterRef = useRef(null);
  const listRenderStartRef = useRef(null);
  const { isPerfMode: perfMode, isLegacyList: isLegacyList } = usePerf();
  const sortBtnRef = useRef(null);
  const priceBtnRef = useRef(null);
  const filterBtnRef = useRef(null);
  const [hotelReviewStats, setHotelReviewStats] = useState({}); // { hotelId: { avgRating, total } }
  const [cityOptions, setCityOptions] = useState([]);

  const roomsSource = promo ? promoRooms : (destination ? localRooms : (isLegacyList && !promo && !destination ? legacyAllRooms : contextRooms));
  const hasMoreSource = promo ? promoHasMore : (destination ? localHasMore : hasMore);
  const loadingMoreSource = promo ? loadingPromo : (destination ? loadingSearch : loadingMore);
  
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';

  const roomsQueryParams = useMemo(() => {
    const p = new URLSearchParams();
    p.set('destination', destination);
    if (lat) p.set('lat', lat);
    if (lng) p.set('lng', lng);
    return p.toString();
  }, [destination, lat, lng]);

  const searchLatNum = lat ? parseFloat(lat) : null;
  const searchLngNum = lng ? parseFloat(lng) : null;

  const computeDistanceKm = (lat1, lng1, lat2, lng2) => {
    if (
      !Number.isFinite(lat1) ||
      !Number.isFinite(lng1) ||
      !Number.isFinite(lat2) ||
      !Number.isFinite(lng2)
    ) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) *
        Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  useEffect(() => {
    axios.get('/api/hotels/public/cities').then(({ data }) => data.success && data.cities && setCityOptions(data.cities || [])).catch(() => {});
  }, [axios]);

  useEffect(() => {
    if (!destination || isLegacyList) return;
    if (perfMode) listRenderStartRef.current = performance.now();
    setLoadingSearch(true);
    axios.get(`/api/rooms/?page=1&limit=12&${roomsQueryParams}`)
      .then(({ data }) => {
        if (data.success) {
          setLocalRooms(data.rooms || []);
          setLocalHasMore(data.hasMore || false);
          setLocalNextPage(2);
        }
      })
      .finally(() => setLoadingSearch(false));
  }, [roomsQueryParams, destination, perfMode, isLegacyList]);

  useEffect(() => {
    if (!promo || isLegacyList) return;
    axios.get(`/api/rooms/?page=1&limit=6&promo=${encodeURIComponent(promo)}`)
      .then(({ data }) => {
        if (data.success) {
          if (perfMode) listRenderStartRef.current = performance.now();
          setPromoRooms(data.rooms || []);
          setPromoHasMore(data.hasMore || false);
          setPromoNextPage(2);
        }
      })
      .finally(() => setLoadingPromo(false));
  }, [promo, isLegacyList, axios, perfMode]);

  const loadMore = useCallback(async () => {
    if (loadingMoreSource || !hasMoreSource) return;
    if (promo) {
      setLoadingPromo(true);
      try {
        const { data } = await axios.get(`/api/rooms/?page=${promoNextPage}&limit=6&promo=${encodeURIComponent(promo)}`);
        if (data.success) {
          setPromoRooms((prev) => [...prev, ...(data.rooms || [])]);
          setPromoHasMore(data.hasMore || false);
          setPromoNextPage((p) => p + 1);
        }
      } finally {
        setLoadingPromo(false);
      }
      return;
    }
    if (destination) {
      setLoadingSearch(true);
      try {
        const { data } = await axios.get(`/api/rooms/?page=${localNextPage}&limit=12&${roomsQueryParams}`);
        if (data.success) {
          setLocalRooms((prev) => [...prev, ...(data.rooms || [])]);
          setLocalHasMore(data.hasMore || false);
          setLocalNextPage((p) => p + 1);
        }
      } finally {
        setLoadingSearch(false);
      }
      return;
    }
    setLoadingMore(true);
    const r = await fetchRooms(nextPage);
    setHasMore(r.hasMore || false);
    setNextPage((p) => p + 1);
    setLoadingMore(false);
  }, [promo, promoNextPage, destination, localNextPage, hasMoreSource, loadingMoreSource, nextPage, fetchRooms, axios, roomsQueryParams]);

  // 检查房间可用性（当有日期选择时）
  useEffect(() => {
    if (!checkIn || !checkOut || promo) {
      setRoomAvailability({});
      return;
    }
    
    const checkRoomsAvailability = async () => {
      setCheckingAvailability(true);
      const availabilityMap = {};
      // 使用roomsSource而不是filteredRooms，避免循环依赖
      const roomsToCheck = roomsSource;
      
      // 批量检查房间可用性
      const roomQuantity = Math.max(1, Number(searchParams.get('rooms')) || 1);
      const checkPromises = roomsToCheck.map(async (room) => {
        try {
          const { data } = await axios.post('/api/bookings/check-availability', {
            room: room._id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            roomQuantity,
          });
          availabilityMap[room._id] = data.success && data.isAvail;
        } catch (error) {
          // 如果检查失败，默认设为不可用
          availabilityMap[room._id] = false;
        }
      });
      
      await Promise.all(checkPromises);
      setRoomAvailability(availabilityMap);
      setCheckingAvailability(false);
    };
    
    checkRoomsAvailability();
  }, [checkIn, checkOut, roomsSource, promo, axios, searchParams]);

  const PRICE_SLIDER_MIN = 0;
  const PRICE_SLIDER_MAX = 2000;
  const PRICE_SLIDER_STEP = 50;

  const [selectedFilters, setSelectedFilters] = useState({
    roomType: [],
    priceRange: [],
    priceSliderMin: PRICE_SLIDER_MIN,
    priceSliderMax: PRICE_SLIDER_MAX,
    starRating: [],
    amenities: [],
    hasPromo: false,
  });

  const [selectSort, setSelectSort] = useState("");
  const [roomAvailability, setRoomAvailability] = useState({}); // 房间可用性缓存 { roomId: boolean }
  const [checkingAvailability, setCheckingAvailability] = useState(false);
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(null); // 'sort' | 'price' | 'filter' | null
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [mobileFilterCategory, setMobileFilterCategory] = useState('房型');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 160 });
  const [tempPriceSliderMin, setTempPriceSliderMin] = useState(0);
  const [tempPriceSliderMax, setTempPriceSliderMax] = useState(2000);
  const [tempPriceRange, setTempPriceRange] = useState([]);

  useLayoutEffect(() => {
    if (!mobileDropdownOpen) return;
    const ref = mobileDropdownOpen === 'sort' ? sortBtnRef : mobileDropdownOpen === 'price' ? priceBtnRef : mobileDropdownOpen === 'filter' ? filterBtnRef : null;
    const el = ref?.current;
    if (el) {
      const r = el.getBoundingClientRect();
      setDropdownPosition({ top: r.bottom + 4, left: r.left, width: Math.max(160, r.width) });
    }
  }, [mobileDropdownOpen]);

  const roomTypes = ['单床', '双床', '大床房', '雅致大床房', '高端大床房', '舒适大床房', '豪华大床房', '温馨大床房', '观景大床房', '商务大床房', '豪华房', '家庭套房', '标准间', '商务房', '海景房', '套房'];
  const roomTypeToEn = { '单床': 'Single Bed', '双床': 'Double Bed', '大床房': 'King Bed', '雅致大床房': 'Elegant King Bed', '高端大床房': 'Premium King Bed', '舒适大床房': 'Comfortable King Bed', '豪华大床房': 'Deluxe King Bed', '温馨大床房': 'Cozy King Bed', '观景大床房': 'View King Bed', '商务大床房': 'Business King Bed', '豪华房': 'Luxury Room', '家庭套房': 'Family Suite', '标准间': 'Standard Room', '商务房': 'Business Room', '海景房': 'Sea View Room', '套房': 'Suite' };
  const facilityLabelMap = {
    'Free Wifi': '免费 Wi-Fi',
    'Free Breakfast': '免费早餐',
    'Room Service': '客房服务',
    'Mountain View': '山景',
    'Pool Access': '泳池使用',
    'Parking': '免费停车',
    'Gym': '健身房',
    'Sea View': '海景',
    'Air Conditioning': '空调',
    'Spa': '水疗中心',
    'Restaurant': '餐厅',
    'Airport Shuttle': '机场接送',
  };
  const amenityOptions = ['Free Wifi', 'Free Breakfast', 'Room Service', 'Parking', 'Gym', 'Pool Access', 'Mountain View', 'Sea View', 'Air Conditioning', 'Spa', 'Restaurant', 'Airport Shuttle'];

  const priceRanges = ['200元以下', '200-300元', '300-500元', '500-800元', '800-1200元', '1200-1500元', '1500-2000元', '2000元以上'];

  const rangeToMinMax = (range) => {
    if (range === '200元以下') return [0, 200];
    if (range === '2000元以上') return [2000, Infinity];
    const m = range.match(/(\d+)-(\d+)元/);
    return m ? [parseInt(m[1]), parseInt(m[2])] : [0, PRICE_SLIDER_MAX];
  };
  const sliderToRanges = (sMin, sMax) => {
    if (sMin <= PRICE_SLIDER_MIN && sMax >= PRICE_SLIDER_MAX) return [];
    if (sMin === PRICE_SLIDER_MAX && sMax === PRICE_SLIDER_MAX) return ['2000元以上'];
    return priceRanges.filter((r) => {
      const [rMin, rMax] = rangeToMinMax(r);
      const rMaxVal = rMax === Infinity ? PRICE_SLIDER_MAX : rMax;
      return rMin < sMax && rMaxVal > sMin;
    });
  };

  useEffect(() => {
    if (mobileDropdownOpen === 'price') {
      setTempPriceSliderMin(selectedFilters.priceSliderMin ?? PRICE_SLIDER_MIN);
      setTempPriceSliderMax(selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX);
      setTempPriceRange(selectedFilters.priceRange || []);
    }
  }, [mobileDropdownOpen]);

  const handleTempPriceSliderChange = (newMin, newMax) => {
    setTempPriceSliderMin(newMin);
    setTempPriceSliderMax(newMax);
    setTempPriceRange(sliderToRanges(newMin, newMax));
  };

  const handleTempPriceRangeChange = (checked, value) => {
    let nextRanges;
    if (checked) {
      const current = [...tempPriceRange];
      const idx = priceRanges.indexOf(value);
      if (idx < 0) return;
      if (current.length === 0) {
        nextRanges = [value];
      } else {
        const isAdjacent = current.some((r) => {
          const i = priceRanges.indexOf(r);
          return i >= 0 && Math.abs(i - idx) === 1;
        });
        nextRanges = isAdjacent ? [...current, value] : [value];
      }
    } else {
      nextRanges = tempPriceRange.filter((item) => item !== value);
    }
    setTempPriceRange(nextRanges);
    if (nextRanges.length === 0) {
      setTempPriceSliderMin(PRICE_SLIDER_MIN);
      setTempPriceSliderMax(PRICE_SLIDER_MAX);
    } else {
      let sMin = Infinity, sMax = 0;
      nextRanges.forEach((r) => {
        const [rMin, rMax] = rangeToMinMax(r);
        sMin = Math.min(sMin, rMin);
        sMax = Math.max(sMax, rMax === Infinity ? PRICE_SLIDER_MAX : rMax);
      });
      setTempPriceSliderMin(sMin);
      setTempPriceSliderMax(sMax);
    }
  };

  const applyTempPriceAndClose = () => {
    const ranges = tempPriceRange;
    let sMin = PRICE_SLIDER_MIN, sMax = PRICE_SLIDER_MAX;
    if (ranges.length > 0) {
      sMin = Infinity;
      sMax = 0;
      ranges.forEach((r) => {
        const [rMin, rMax] = rangeToMinMax(r);
        sMin = Math.min(sMin, rMin);
        sMax = Math.max(sMax, rMax === Infinity ? PRICE_SLIDER_MAX : rMax);
      });
    }
    setSelectedFilters((prev) => ({ ...prev, priceSliderMin: sMin, priceSliderMax: sMax, priceRange: ranges }));
    setMobileDropdownOpen(null);
  };

  const starRatings = ['五星级', '四星级', '三星级', '二星级', '一星级'];

  const sortOptions = ['智能排序', '好评优先', '低价优先', '高价优先', '距离优先'];

  const handleFilterChange = (checked, value, type) => {
    setSelectedFilters((prev) => {
      const updated = { ...prev };
      if (type === 'hasPromo') {
        updated.hasPromo = checked;
      } else if (type === 'priceRange') {
        if (checked) {
          const current = updated.priceRange || [];
          const idx = priceRanges.indexOf(value);
          if (idx < 0) return prev;
          if (current.length === 0) {
            updated.priceRange = [value];
          } else {
            const isAdjacent = current.some((r) => {
              const i = priceRanges.indexOf(r);
              return i >= 0 && Math.abs(i - idx) === 1;
            });
            if (isAdjacent) {
              updated.priceRange = [...current, value];
            } else {
              updated.priceRange = [value];
            }
          }
        } else {
          updated.priceRange = (updated.priceRange || []).filter((item) => item !== value);
        }
        const ranges = updated.priceRange || [];
        if (ranges.length === 0) {
          updated.priceSliderMin = PRICE_SLIDER_MIN;
          updated.priceSliderMax = PRICE_SLIDER_MAX;
        } else {
          let sMin = Infinity, sMax = 0;
          ranges.forEach((r) => {
            const [rMin, rMax] = rangeToMinMax(r);
            sMin = Math.min(sMin, rMin);
            sMax = Math.max(sMax, rMax === Infinity ? PRICE_SLIDER_MAX : rMax);
          });
          updated.priceSliderMin = sMin;
          updated.priceSliderMax = sMax;
        }
      } else if (checked) {
        if (!Array.isArray(updated[type])) updated[type] = [];
        updated[type].push(value);
      } else {
        updated[type] = (updated[type] || []).filter((item) => item !== value);
      }
      return updated;
    });
  };

  const handlePriceSliderChange = (newMin, newMax) => {
    setSelectedFilters((prev) => ({
      ...prev,
      priceSliderMin: newMin,
      priceSliderMax: newMax,
      priceRange: sliderToRanges(newMin, newMax),
    }));
  };

  const handleSortChange = (value) => {
    setSelectSort(value);
  };

  const matchRoomType = (room) => {
    if (selectedFilters.roomType.length === 0) return true;
    return selectedFilters.roomType.some((label) => room.roomType === label || room.roomType === roomTypeToEn[label]);
  };

  const matchPriceRange = (room) => {
    const price = room.pricePerNight ?? 0;
    const min = selectedFilters.priceSliderMin ?? PRICE_SLIDER_MIN;
    const max = selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX;
    const bothAt2000 = min === PRICE_SLIDER_MAX && max === PRICE_SLIDER_MAX;
    const hasSliderFilter = min > PRICE_SLIDER_MIN || max < PRICE_SLIDER_MAX || bothAt2000;
    if (hasSliderFilter) {
      if (price < min) return false;
      if (bothAt2000) {
        return price >= 2000;
      }
      if (price > max) return false;
    }
    if (selectedFilters.priceRange.length === 0) return true;
    return selectedFilters.priceRange.some((range) => {
      if (range === '200元以下') return room.pricePerNight < 200;
      if (range === '2000元以上') return room.pricePerNight >= 2000;
      const match = range.match(/(\d+)-(\d+)元/);
      if (match) {
        const rMin = parseInt(match[1]);
        const rMax = parseInt(match[2]);
        return room.pricePerNight >= rMin && room.pricePerNight <= rMax;
      }
      return false;
    });
  };

  const matchStarRating = (room) => {
    if (!selectedFilters.starRating?.length) return true;
    const star = room.hotel?.starRating ?? 0;
    const starMap = { '五星级': 5, '四星级': 4, '三星级': 3, '二星级': 2, '一星级': 1 };
    return selectedFilters.starRating.some((label) => star === (starMap[label] ?? 0));
  };

  const matchAmenities = (room) => {
    if (!selectedFilters.amenities?.length) return true;
    const am = room.amenties || [];
    return selectedFilters.amenities.every((a) => am.includes(a));
  };

  const matchHasPromo = (room) => {
    if (!selectedFilters.hasPromo) return true;
    return room.promoDiscount != null && room.promoDiscount > 0;
  };

  const sortRooms = (a, b) => {
    if (selectSort === '低价优先') return a.pricePerNight - b.pricePerNight;
    if (selectSort === '高价优先') return b.pricePerNight - a.pricePerNight;
    if (selectSort === '好评优先') {
      const hidA = a.hotel?._id ?? a.hotel;
      const hidB = b.hotel?._id ?? b.hotel;
      const ra = hotelReviewStats[hidA]?.avgRating ?? 0;
      const rb = hotelReviewStats[hidB]?.avgRating ?? 0;
      return rb - ra;
    }
    if (selectSort === '距离优先') {
      const hasLocA = a.hotel?.latitude != null && a.hotel?.longitude != null;
      const hasLocB = b.hotel?.latitude != null && b.hotel?.longitude != null;
      if (hasLocA !== hasLocB) return hasLocA ? -1 : 1;
      return 0;
    }
    return 0;
  };

  const canBookRoom = (roomOrHotel) => {
    if (role === 'admin') return false;
    const ownerId = roomOrHotel?.hotel?.owner?._id || roomOrHotel?.hotel?.owner || roomOrHotel?.owner;
    if (role === 'merchant' && ownerId && userInfo?._id && String(ownerId) === String(userInfo._id)) return false;
    return true;
  };
  const isOwnHotelRoom = (roomOrHotel) => {
    if (role !== 'merchant') return false;
    const ownerId = roomOrHotel?.hotel?.owner?._id || roomOrHotel?.hotel?.owner || roomOrHotel?.owner;
    return ownerId && userInfo?._id && String(ownerId) === String(userInfo._id);
  };

  const filterDestination = (room) => {
    const dest = searchParams.get('destination');
    if (!dest) return true;
    // 有 lat/lng 时后端已按附近 12km 筛选，不再做文本过滤
    const hasLatLng = searchParams.get('lat') && searchParams.get('lng');
    if (hasLatLng) return true;
    const city = (room.hotel?.city || '').toLowerCase();
    const name = (room.hotel?.name || '').toLowerCase();
    const kw = dest.toLowerCase();
    return city.includes(kw) || name.includes(kw);
  };

  const filteredRooms = useMemo(() => {
    if (promo) {
      // 优惠模式：如果有日期选择，按可用性排序：可预订的在前面
      if (checkIn && checkOut && Object.keys(roomAvailability).length > 0) {
        return roomsSource.sort((a, b) => {
          const aAvailable = roomAvailability[a._id] !== false; // 未检查的默认为可用
          const bAvailable = roomAvailability[b._id] !== false;
          if (aAvailable === bAvailable) return 0;
          return aAvailable ? -1 : 1; // 可预订的排在前面
        });
      }
      return roomsSource;
    }
    
    const filtered = roomsSource
      .filter(
        (room) =>
          matchRoomType(room) &&
          matchPriceRange(room) &&
          matchStarRating(room) &&
          matchAmenities(room) &&
          matchHasPromo(room) &&
          filterDestination(room)
      );
    
    // 如果有日期选择，按可用性排序：可预订的在前面
    if (checkIn && checkOut && Object.keys(roomAvailability).length > 0) {
      return filtered.sort((a, b) => {
        const aAvailable = roomAvailability[a._id] !== false; // 未检查的默认为可用
        const bAvailable = roomAvailability[b._id] !== false;
        if (aAvailable === bAvailable) {
          return sortRooms(a, b);
        }
        return aAvailable ? -1 : 1; // 可预订的排在前面
      });
    }
    
    return filtered.sort(sortRooms);
  }, [roomsSource, selectedFilters, selectSort, searchParams, promo, checkIn, checkOut, roomAvailability, hotelReviewStats, lat, lng]);

  /** 按酒店分组：{ hotelId: { hotel, rooms } }（非 promo 时使用） */
  const roomsByHotel = useMemo(() => {
    if (promo) return [];
    const map = {};
    filteredRooms.forEach((room) => {
      const hid = room.hotel?._id ?? room.hotel;
      if (!hid) return;
      if (!map[hid]) {
        map[hid] = { hotel: room.hotel, rooms: [] };
      }
      map[hid].rooms.push(room);
    });
    // 如果有日期选择，对每个酒店的 rooms 按可用性排序：可预订的在前面
    if (checkIn && checkOut && Object.keys(roomAvailability).length > 0) {
      Object.values(map).forEach(({ rooms }) => {
        rooms.sort((a, b) => {
          const aAvailable = roomAvailability[a._id] !== false;
          const bAvailable = roomAvailability[b._id] !== false;
          if (aAvailable === bAvailable) return 0;
          return aAvailable ? -1 : 1;
        });
      });
    }
    return Object.values(map);
  }, [filteredRooms, promo, checkIn, checkOut, roomAvailability]);

  useEffect(() => {
    if (promo) return;
    const hotelIds = roomsByHotel.map(({ hotel }) => hotel?._id ?? hotel).filter(Boolean);
    hotelIds.forEach((hotelId) => {
      if (hotelReviewStats[hotelId]) return;
      axios.get(`/api/reviews/hotel/${hotelId}/stats`).then(({ data }) => {
        if (data.success) setHotelReviewStats((prev) => ({ ...prev, [hotelId]: { avgRating: data.avgRating ?? 0, total: data.total ?? 0 } }));
      }).catch(() => {});
    });
  }, [roomsByHotel, promo, axios]);

  const filterCount = useMemo(() => {
    let n = 0;
    n += (selectedFilters.roomType || []).length;
    n += (selectedFilters.priceRange || []).length;
    if ((selectedFilters.priceSliderMin ?? PRICE_SLIDER_MIN) > PRICE_SLIDER_MIN || (selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX) < PRICE_SLIDER_MAX || ((selectedFilters.priceSliderMin ?? 0) === PRICE_SLIDER_MAX && (selectedFilters.priceSliderMax ?? 0) === PRICE_SLIDER_MAX)) n += 1;
    n += (selectedFilters.starRating || []).length;
    n += (selectedFilters.amenities || []).length;
    if (selectedFilters.hasPromo) n += 1;
    return n;
  }, [selectedFilters]);
  const filterCountWithoutPrice = useMemo(() => {
    let n = 0;
    n += (selectedFilters.roomType || []).length;
    n += (selectedFilters.starRating || []).length;
    n += (selectedFilters.amenities || []).length;
    if (selectedFilters.hasPromo) n += 1;
    return n;
  }, [selectedFilters]);

  const PROMO_ROW_ESTIMATE = 340;
  const CARD_GAP = 24;
  const promoRowCount = Math.ceil(filteredRooms.length / 3);
  const promoVirtualizer = useVirtualizer({
    count: promoRowCount,
    getScrollElement: () => promoListParentRef.current,
    estimateSize: () => PROMO_ROW_ESTIMATE + CARD_GAP,
    overscan: 3,
  });

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const root = promo ? promoListParentRef.current : null;
    if (promo && !root) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { root, rootMargin: '100px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore, promo, filteredRooms.length, roomsByHotel.length]);

  // 酒店列表 优化模式（无 destination）：记录首屏加载开始时间（AppContext 拉取第一页）
  useEffect(() => {
    if (!perfMode || promo || destination) return;
    if (contextRooms.length === 0) listRenderStartRef.current = performance.now();
  }, [perfMode, promo, destination, contextRooms.length]);

  // 酒店列表 legacy 模式：一次性拉取全部酒店（无 destination 用 context，有 destination 用 localRooms API，promo 用 promoRooms API）
  useEffect(() => {
    if (!isLegacyList) return;
    let cancelled = false;
    if (promo) {
      setLoadingPromo(true);
      setPromoHasMore(false);
      if (perfMode) listRenderStartRef.current = performance.now();
      (async () => {
        let page = 1;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const { data } = await axios.get(`/api/rooms/?page=${page}&limit=12&promo=${encodeURIComponent(promo)}`);
          if (!data?.success) break;
          if (page === 1) setPromoRooms(data.rooms || []);
          else setPromoRooms((prev) => [...prev, ...(data.rooms || [])]);
          hasMore = data.hasMore ?? false;
          page++;
        }
        if (!cancelled) {
          setPromoNextPage(page);
          setLoadingPromo(false);
        }
      })();
    } else if (destination) {
      setLoadingSearch(true);
      setLocalHasMore(false);
      if (perfMode) listRenderStartRef.current = performance.now();
      (async () => {
        let page = 1;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const { data } = await axios.get(`/api/rooms/?page=${page}&limit=12&${roomsQueryParams}`);
          if (!data?.success) break;
          if (page === 1) setLocalRooms(data.rooms || []);
          else setLocalRooms((prev) => [...prev, ...(data.rooms || [])]);
          hasMore = data.hasMore ?? false;
          page++;
        }
        if (!cancelled) {
          setLocalNextPage(page);
          setLoadingSearch(false);
        }
      })();
    } else {
      setLegacyHotelListReady(false);
      setHasMore(false);
      if (perfMode) listRenderStartRef.current = performance.now();
      (async () => {
        let page = 1;
        let hasMore = true;
        while (hasMore && !cancelled) {
          const { data } = await axios.get(`/api/rooms/?page=${page}&limit=12&${roomsQueryParams}`);
          if (!data?.success) break;
          if (page === 1) setLegacyAllRooms(data.rooms || []);
          else setLegacyAllRooms((prev) => [...prev, ...(data.rooms || [])]);
          hasMore = data.hasMore ?? false;
          page++;
        }
        if (!cancelled) {
          setNextPage(page);
          setLegacyHotelListReady(true);
        }
      })();
    }
    return () => { cancelled = true; };
  }, [isLegacyList, promo, destination, roomsQueryParams, perfMode, axios]);

  const prevLegacyRef = useRef(isLegacyList);
  useEffect(() => {
    if (promo) return;
    const switchedToOptimized = prevLegacyRef.current && !isLegacyList;
    prevLegacyRef.current = isLegacyList;
    if (switchedToOptimized) {
      if (perfMode) listRenderStartRef.current = performance.now();
      if (destination) {
        setLoadingSearch(true);
        axios.get(`/api/rooms/?page=1&limit=12&${roomsQueryParams}`)
          .then(({ data }) => {
            if (data.success) {
              setLocalRooms(data.rooms || []);
              setLocalHasMore(data.hasMore ?? false);
              setLocalNextPage(2);
            }
          })
          .finally(() => setLoadingSearch(false));
      } else {
        fetchRooms(1).then((r) => {
          setHasMore(r?.hasMore ?? false);
          setNextPage(2);
        });
      }
    }
  }, [isLegacyList, promo, destination, fetchRooms, axios]);

  useEffect(() => {
    if (!perfMode) return;
    if (promo) {
      const total = filteredRooms.length;
      if (total === 0) return;
      const start = listRenderStartRef.current ?? performance.now();
      requestAnimationFrame(() => {
        const rendered = isLegacyList ? total : Math.min(filteredRooms.length, promoVirtualizer.getVirtualItems().length * 3);
        virtualListPerf.isVirtual = !isLegacyList;
        virtualListPerf.recordFirstRender(total, rendered, start);
      });
    } else {
      const total = roomsByHotel.length;
      if (total === 0) return;
      const start = listRenderStartRef.current ?? performance.now();
      requestAnimationFrame(() => {
        virtualListPerf.isVirtual = !isLegacyList;
        virtualListPerf.recordFirstRender(total, total, start);
      });
    }
  }, [perfMode, promo, filteredRooms.length, roomsByHotel.length, isLegacyList, promoVirtualizer]);

  useEffect(() => {
    if (perfMode) {
      listRenderStartRef.current = performance.now();
      virtualListPerf.reset();
    }
  }, [perfMode, isLegacyList]);

  useEffect(() => {
    const handler = (e) => {
      if (e.target.closest('[data-mobile-filter-portal]')) return;
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target)) setMobileDropdownOpen(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const clearFilters = () => {
    setSelectedFilters({
      roomType: [],
      priceRange: [], priceSliderMin: PRICE_SLIDER_MIN, priceSliderMax: PRICE_SLIDER_MAX,
      starRating: [],
      amenities: [],
      hasPromo: false,
    });
    setSelectSort('');
    const next = new URLSearchParams(searchParams);
    next.delete('destination');
    setSearchParams(next);
  };

  const isPromoMode = Boolean(promo);
  // 跳转房间/酒店时带上当前搜索条件（入住离开日期等），预订页可预填
  const appendSearch = (path) => {
    const q = searchParams.toString();
    return q ? `${path}?${q}` : path;
  };

  return (
    <div>
      {/* PC 端吸顶搜索栏：独立于内容区，使用更宽容器使表单比下方内容宽 */}
      {!isPromoMode && (
        <div className="hidden lg:block sticky top-14 z-20 pt-14 md:pt-[28px] bg-white mb-6">
          <div className="w-full max-w-[calc(72rem+200px)] mx-auto px-4 md:px-8 lg:px-12">
            <SearchBar compact={false} heroStyle />
          </div>
        </div>
      )}
      <div className="pt-14 md:pt-32 px-4 md:px-8 lg:px-12 mb-16 max-w-6xl mx-auto lg:pt-[60px]">
      {/* 移动端：搜索栏 + 筛选合并为一体，置于页面最顶部，吸顶贴紧导航栏；顺序：目的地 | 日期 | 人数 */}
      {!isPromoMode && (
        <div ref={mobileFilterRef} className="lg:hidden sticky top-14 z-20 -mx-4 -mt-4 md:-mt-0 mb-4 bg-white border-b border-gray-200 shadow-sm overflow-visible">
          <div className="px-4 pt-3 pb-2 space-y-2">
            {/* 第一行：搜索栏 目的地 | 日期 | 人数 | 搜索 */}
            <div className="w-full min-w-0 h-12">
              <SearchBar compact datePickerOpen={datePickerOpen} setDatePickerOpen={setDatePickerOpen} onOpenDatePicker={() => setMobileDropdownOpen(null)} />
            </div>
            {/* 第二行：智能排序 | 价格 | 筛选 */}
            <div className="grid grid-cols-3 gap-1.5 w-full h-10">
            {/* 排序 */}
            <div className="relative h-full">
              <button
                ref={sortBtnRef}
                type="button"
                onClick={() => { setDatePickerOpen(false); setMobileDropdownOpen((o) => (o === 'sort' ? null : 'sort')); }}
                className={`flex items-center justify-center gap-1 w-full h-full min-h-0 px-2 rounded-lg border text-sm font-medium whitespace-nowrap ${selectSort && selectSort !== '智能排序' ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}
              >
                <span className="truncate">{selectSort || '智能排序'}</span>
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${mobileDropdownOpen === 'sort' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {/* 价格筛选 */}
            <div className="relative h-full">
              <button
                ref={priceBtnRef}
                type="button"
                onClick={() => { setDatePickerOpen(false); setMobileDropdownOpen((o) => (o === 'price' ? null : 'price')); }}
                className={`flex items-center justify-center gap-1 w-full h-full min-h-0 px-2 rounded-lg border text-sm font-medium ${((selectedFilters.priceRange || []).length > 0 || (selectedFilters.priceSliderMin ?? PRICE_SLIDER_MIN) > PRICE_SLIDER_MIN || (selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX) < PRICE_SLIDER_MAX || ((selectedFilters.priceSliderMin ?? 0) === PRICE_SLIDER_MAX && (selectedFilters.priceSliderMax ?? 0) === PRICE_SLIDER_MAX)) ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}
              >
                <span>价格</span>
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${mobileDropdownOpen === 'price' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            {/* Portal：排序、价格下拉，避免 overflow 裁剪 */}
            {mobileDropdownOpen === 'sort' && createPortal(
              <div data-mobile-filter-portal className="fixed inset-0 z-[100] bg-transparent" onClick={() => setMobileDropdownOpen(null)}>
                <div className="absolute left-0 right-0 top-0 py-3 px-4 bg-white border-b border-gray-200 shadow-lg max-h-[60vh] overflow-y-auto" style={{ top: dropdownPosition.top }} onClick={(e) => e.stopPropagation()}>
                  <div className="grid grid-cols-2 gap-2 max-w-6xl mx-auto px-4 md:px-8">
                    {sortOptions.map((opt) => (
                      <button key={opt} type="button" onClick={() => { handleSortChange(opt === '智能排序' ? '' : opt); setMobileDropdownOpen(null); }} className={`py-2.5 px-4 text-sm rounded-lg border ${(selectSort || '智能排序') === opt ? 'border-gray-800 bg-gray-900 text-white font-medium' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>{opt}</button>
                    ))}
                  </div>
                </div>
              </div>,
              document.body
            )}
            {mobileDropdownOpen === 'price' && createPortal(
              <div data-mobile-filter-portal className="fixed inset-0 z-[100] bg-transparent" onClick={() => setMobileDropdownOpen(null)}>
                <div className="absolute left-0 right-0 top-0 py-4 px-4 bg-white border-b border-gray-200 shadow-lg max-h-[60vh] overflow-y-auto" style={{ top: dropdownPosition.top }} onClick={(e) => e.stopPropagation()}>
                  <div className="max-w-6xl mx-auto px-4 md:px-8 space-y-4">
                    {/* 价格区间滑块，刻度 50 */}
                    <div>
                      <div className="flex justify-between text-sm text-gray-600 mb-2">
                        <span>¥{tempPriceSliderMin}</span>
                        <span>{tempPriceSliderMin === PRICE_SLIDER_MAX && tempPriceSliderMax === PRICE_SLIDER_MAX ? '¥2000及以上' : `¥${tempPriceSliderMax}`}</span>
                      </div>
                      <PriceRangeSlider
                        min={PRICE_SLIDER_MIN}
                        max={PRICE_SLIDER_MAX}
                        step={PRICE_SLIDER_STEP}
                        valueMin={tempPriceSliderMin}
                        valueMax={tempPriceSliderMax}
                        onChange={handleTempPriceSliderChange}
                      />
                    </div>
                    <div className="border-t border-gray-100 pt-3">
                      <p className="text-xs text-gray-500 mb-2">快捷选择</p>
                      <div className="grid grid-cols-4 gap-2">
                        {priceRanges.map((r) => (
                          <button key={r} type="button" onClick={() => { const has = tempPriceRange.includes(r); handleTempPriceRangeChange(!has, r); }} className={`py-2.5 px-3 text-sm rounded-lg border text-center ${tempPriceRange.includes(r) ? 'border-gray-800 bg-gray-900 text-white font-medium' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="flex justify-end gap-2 pt-2">
                      <button type="button" onClick={() => { setTempPriceSliderMin(PRICE_SLIDER_MIN); setTempPriceSliderMax(PRICE_SLIDER_MAX); setTempPriceRange([]); }} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">清空</button>
                      <button type="button" onClick={applyTempPriceAndClose} className="py-2 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">确定</button>
                    </div>
                  </div>
                </div>
              </div>,
              document.body
            )}
            {mobileDropdownOpen === 'filter' && createPortal(
              <div data-mobile-filter-portal className="fixed inset-0 z-[100] bg-transparent" onClick={() => setMobileDropdownOpen(null)}>
                <div className="absolute left-0 right-0 top-0 py-4 px-4 bg-white border-b border-gray-200 shadow-lg max-h-[60vh] overflow-y-auto" style={{ top: dropdownPosition.top }} onClick={(e) => e.stopPropagation()}>
                  <div className="flex gap-4 max-w-6xl mx-auto px-4 md:px-8">
                    <div className="w-24 flex-shrink-0 border-r border-gray-100 pr-3">
                      {['房型', '酒店星级', '设施', '优惠'].map((cat) => (
                        <button key={cat} type="button" onClick={() => setMobileFilterCategory(cat)} className={`block w-full text-left py-2.5 px-0 text-sm ${mobileFilterCategory === cat ? 'font-semibold text-gray-900' : 'text-gray-600'}`}>{cat}</button>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      {mobileFilterCategory === '房型' && (
                        <div className="grid grid-cols-3 gap-2">
                          {roomTypes.map((t) => (
                            <button key={t} type="button" onClick={() => { const sel = selectedFilters.roomType || []; const has = sel.includes(t); handleFilterChange(!has, t, 'roomType'); }} className={`px-3 py-2.5 rounded-lg text-sm border transition-colors ${(selectedFilters.roomType || []).includes(t) ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>{t}</button>
                          ))}
                        </div>
                      )}
                      {mobileFilterCategory === '酒店星级' && (
                        <div className="grid grid-cols-3 gap-2">
                          {starRatings.map((s) => (
                            <button key={s} type="button" onClick={() => { const sel = selectedFilters.starRating || []; const has = sel.includes(s); handleFilterChange(!has, s, 'starRating'); }} className={`px-3 py-2.5 rounded-lg text-sm border transition-colors ${(selectedFilters.starRating || []).includes(s) ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>{s}</button>
                          ))}
                        </div>
                      )}
                      {mobileFilterCategory === '设施' && (
                        <div className="grid grid-cols-3 gap-2">
                          {amenityOptions.map((a) => (
                            <button key={a} type="button" onClick={() => { const sel = selectedFilters.amenities || []; const has = sel.includes(a); handleFilterChange(!has, a, 'amenities'); }} className={`px-3 py-2.5 rounded-lg text-sm border transition-colors ${(selectedFilters.amenities || []).includes(a) ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>{facilityLabelMap[a] || a}</button>
                          ))}
                        </div>
                      )}
                      {mobileFilterCategory === '优惠' && (
                        <button type="button" onClick={() => handleFilterChange(!selectedFilters.hasPromo, true, 'hasPromo')} className={`px-3 py-2.5 rounded-lg text-sm border transition-colors ${selectedFilters.hasPromo ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-gray-300'}`}>仅看有优惠</button>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-2 mt-3 pt-3 border-t border-gray-100">
                    <button type="button" onClick={() => { clearFilters(); setMobileDropdownOpen(null); }} className="py-2 px-4 rounded-lg border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50">清空</button>
                    <button type="button" onClick={() => setMobileDropdownOpen(null)} className="py-2 px-4 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800">确定{filterCountWithoutPrice > 0 ? `(${roomsByHotel.length}家)` : ''}</button>
                  </div>
                </div>
              </div>,
              document.body
            )}
            {/* 筛选（设施、房型、星级、优惠） */}
            <div className="relative h-full">
              <button
                ref={filterBtnRef}
                type="button"
                onClick={() => { setDatePickerOpen(false); setMobileDropdownOpen((o) => (o === 'filter' ? null : 'filter')); if (mobileDropdownOpen !== 'filter') setMobileFilterCategory('房型'); }}
                className={`flex items-center justify-center gap-1 w-full h-full min-h-0 px-2 rounded-lg border text-sm font-medium ${filterCountWithoutPrice > 0 ? 'border-gray-800 bg-gray-900 text-white' : 'border-gray-300 text-gray-800 hover:bg-gray-50'}`}
              >
                <span>筛选</span>
                {filterCountWithoutPrice > 0 && <span className="w-4 h-4 rounded-full bg-white/90 text-gray-900 text-xs flex items-center justify-center flex-shrink-0">{filterCountWithoutPrice}</span>}
                <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${mobileDropdownOpen === 'filter' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
            </div>
            </div>
          </div>
        </div>
      )}

      <div className={`mt-8 md:mt-10 ${isPromoMode ? 'mb-4' : 'mb-10'}`}>
        <h1 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold min-w-0">
          {isPromoMode ? `限时优惠 · ${promo}% 优惠` : (destination ? (
            <span className="flex items-baseline min-w-0 gap-0.5">
              <span className="shrink-0">{isCity(destination, cityOptions) ? '帮你推荐「' : '帮你找到「'}</span>
              <span className="truncate min-w-0 max-w-full" title={destination}>{destination}</span>
              <span className="shrink-0">{isCity(destination, cityOptions) ? '」的酒店' : '」附近的全部酒店'}</span>
            </span>
          ) : '全部酒店')}
        </h1>
      </div>

      {isPromoMode && (
        <p className="text-gray-600 mb-10">
          以下为享受该优惠力度的房型，下拉加载更多。
        </p>
      )}

      {/* PC 端：左侧为固定宽度筛选栏，右侧为自适应内容；移动端隐藏左侧栏 */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-10">
        {!isPromoMode && (
        <aside className="hidden lg:block lg:w-64 lg:max-w-xs flex-shrink-0 lg:order-1">
          <div
            className="sticky top-24 z-10 border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
            onClick={(e) => { if (!e.target.closest('input, button, label, a')) document.activeElement?.blur?.(); }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">筛选条件</p>
              <button type="button" onClick={clearFilters} className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors cursor-pointer">清除全部</button>
            </div>
            <div className="space-y-4">
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">房型</p>
                <div className="flex flex-col gap-1.5">
                  {roomTypes.map((type) => (
                    <CheckBox key={type} label={type} selected={selectedFilters.roomType.includes(type)} onChange={(checked) => handleFilterChange(checked, type, 'roomType')} />
                  ))}
                </div>
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">价格区间</p>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>¥{selectedFilters.priceSliderMin ?? 0}</span>
                      <span>{(selectedFilters.priceSliderMin ?? 0) === PRICE_SLIDER_MAX && (selectedFilters.priceSliderMax ?? 0) === PRICE_SLIDER_MAX ? '¥2000及以上' : `¥${selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX}`}</span>
                    </div>
                    <PriceRangeSlider
                      min={PRICE_SLIDER_MIN}
                      max={PRICE_SLIDER_MAX}
                      step={PRICE_SLIDER_STEP}
                      valueMin={selectedFilters.priceSliderMin ?? PRICE_SLIDER_MIN}
                      valueMax={selectedFilters.priceSliderMax ?? PRICE_SLIDER_MAX}
                      onChange={handlePriceSliderChange}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {priceRanges.map((range) => (
                      <CheckBox key={range} label={range} selected={selectedFilters.priceRange.includes(range)} onChange={(checked) => handleFilterChange(checked, range, 'priceRange')} />
                    ))}
                  </div>
                </div>
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">酒店星级</p>
                <div className="flex flex-col gap-1.5">
                  {starRatings.map((star) => (
                    <CheckBox key={star} label={star} selected={selectedFilters.starRating.includes(star)} onChange={(checked) => handleFilterChange(checked, star, 'starRating')} />
                  ))}
                </div>
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">设施</p>
                <div className="flex flex-col gap-1.5">
                  {amenityOptions.map((key) => (
                    <CheckBox key={key} label={facilityLabelMap[key] || key} selected={selectedFilters.amenities.includes(key)} onChange={(checked) => handleFilterChange(checked, key, 'amenities')} />
                  ))}
                </div>
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">优惠</p>
                <CheckBox label="仅看有优惠" selected={selectedFilters.hasPromo} onChange={(checked) => handleFilterChange(checked, true, 'hasPromo')} />
              </div>
              <div className="pb-2">
                <p className="text-xs font-medium text-gray-700 mb-1.5">排序</p>
                <div className="flex flex-col gap-1.5">
                  {sortOptions.map((opt) => (
                    <CheckBox key={opt} label={opt} selected={selectSort === opt} onChange={(checked) => handleSortChange(checked ? opt : '')} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </aside>
        )}
        <div className="flex flex-col gap-8 flex-1 min-w-0 order-1 lg:order-2">
          {isPromoMode && loadingPromo && promoRooms.length === 0 ? (
            isLegacyList ? (
              <p className="text-gray-500 py-8">加载优惠房型中…</p>
            ) : (
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden" style={{ maxHeight: 'min(80vh, 880px)' }}>
              <SkeletonRoomGrid count={6} />
            </div>
            )
          ) : destination && loadingSearch && localRooms.length === 0 ? (
            isLegacyList ? (
              <p className="text-gray-500 py-8">正在搜索「{destination}」…</p>
            ) : (
            <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden" style={{ maxHeight: 'min(80vh, 880px)' }}>
              <SkeletonRoomGrid count={6} />
            </div>
            )
          ) : !promo && !destination && (isLegacyList ? !legacyHotelListReady : (roomsLoading && contextRooms.length === 0)) ? (
            isLegacyList ? (
              <p className="text-gray-500 py-8">加载中…</p>
            ) : (
            <SkeletonHotelList count={4} />
            )
          ) : filteredRooms.length === 0 ? (
            <p className="text-gray-500">
              {isPromoMode ? '暂无该优惠档位的房型。' : destination ? `未找到「${destination}」相关房间，请尝试其他目的地或清除筛选。` : '没有匹配筛选条件的房间。'}
            </p>
          ) : isPromoMode ? (
            /* 优惠档位：虚拟列表或普通列表 */
            <>
              <div
                ref={promoListParentRef}
                data-room-list-scroll
                className="overflow-y-auto rounded-2xl border border-gray-100 bg-gradient-to-b from-gray-50/80 to-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
                style={{ maxHeight: 'min(80vh, 880px)' }}
              >
                {isLegacyList ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 p-6">
                    {filteredRooms.map((room) => {
                      const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                      return (
                        <div
                          key={room._id}
                          className={`group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 relative ${isUnavailable ? 'opacity-60' : ''}`}
                        >
                          <div className="relative overflow-hidden">
                            <img
                              onClick={() => { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }}
                              src={room.images?.[0]}
                              alt="房间"
                              title="查看房间详情"
                              className="w-full h-44 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                              loading={isLegacyList ? 'eager' : 'lazy'}
                              decoding="async"
                            />
                            {isUnavailable && (
                              <>
                                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">已订完</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="p-5 flex flex-col flex-1">
                            <p className="text-base font-semibold text-gray-800 mb-2 group-hover:text-gray-900">{getRoomTypeLabel(room.roomType)}</p>
                            <div className="flex flex-wrap gap-2 mb-3">
                              {room.amenties?.slice(0, 5).map((item, index) => (
                                <div key={index} className="flex items-center gap-1">
                                  {facilityIcons[item] && <img src={facilityIcons[item]} alt="" className="w-3.5 h-3.5 flex-shrink-0" />}
                                  <span className="text-xs text-gray-600">{facilityLabelMap[item] || item}</span>
                                </div>
                              ))}
                            </div>
                            <div className="mt-auto flex items-center justify-between">
                              <p>
                                <span className="text-lg font-bold text-gray-800">{isAuthenticated && (room.promoDiscount ?? 0) > 0 ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100)) : room.pricePerNight} 元</span>
                                <span className="text-sm text-gray-500 ml-0.5">/晚</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => {
                                  if (isOwnHotelRoom(room)) { toast('不能预定自己名下的酒店哦'); return; }
                                  if (role === 'admin') { toast('管理员不能预订酒店'); return; }
                                  if (canBookRoom(room) && !isUnavailable) { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }
                                }}
                                disabled={isUnavailable}
                                title={!canBookRoom(room) ? (role === 'admin' ? '管理员不能预订酒店' : '不能预订自己的酒店') : undefined}
                                className={`px-3 py-1.5 text-white text-sm rounded-lg transition-colors cursor-pointer ${isUnavailable || !canBookRoom(room) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                              >
                                预订
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                <div
                  style={{
                    height: `${promoVirtualizer.getTotalSize()}px`,
                    width: '100%',
                    position: 'relative',
                  }}
                  className="px-6 pt-6"
                >
                  {promoVirtualizer.getVirtualItems().map((virtualRow) => {
                    const startIdx = virtualRow.index * 3;
                    const rowRooms = filteredRooms.slice(startIdx, startIdx + 3);
                    return (
                      <div
                        key={virtualRow.key}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          transform: `translateY(${virtualRow.start}px)`,
                          paddingBottom: `${CARD_GAP}px`,
                        }}
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                          {rowRooms.map((room) => {
                  const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                  return (
                    <div
                      key={room._id}
                      className={`group flex flex-col bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 relative ${isUnavailable ? 'opacity-60' : ''}`}
                    >
                      <div className="relative overflow-hidden">
                        <img
                          onClick={() => { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }}
                          src={room.images?.[0]}
                          alt="房间"
                          title="查看房间详情"
                          className="w-full h-44 object-cover cursor-pointer group-hover:scale-105 transition-transform duration-500"
                          loading={isLegacyList ? 'eager' : 'lazy'}
                          decoding="async"
                        />
                        {isUnavailable && (
                          <>
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">已订完</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-5 flex flex-col flex-1">
                        <p className="text-base font-semibold text-gray-800 mb-2 group-hover:text-gray-900">{getRoomTypeLabel(room.roomType)}</p>
                        <div className="flex flex-wrap gap-2 mb-3">
                          {room.amenties?.slice(0, 5).map((item, index) => (
                            <div key={index} className="flex items-center gap-1">
                              {facilityIcons[item] && <img src={facilityIcons[item]} alt="" className="w-3.5 h-3.5 flex-shrink-0" />}
                              <span className="text-xs text-gray-600">{facilityLabelMap[item] || item}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-auto flex items-center justify-between">
                          <p>
                            <span className="text-lg font-bold text-gray-800">{isAuthenticated && (room.promoDiscount ?? 0) > 0 ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100)) : room.pricePerNight} 元</span>
                            <span className="text-sm text-gray-500 ml-0.5">/晚</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              if (isOwnHotelRoom(room)) { toast('不能预定自己名下的酒店哦'); return; }
                              if (role === 'admin') { toast('管理员不能预订酒店'); return; }
                              if (canBookRoom(room) && !isUnavailable) { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }
                            }}
                            disabled={isUnavailable}
                            title={!canBookRoom(room) ? (role === 'admin' ? '管理员不能预订酒店' : '不能预订自己的酒店') : undefined}
                            className={`px-3 py-1.5 text-white text-sm rounded-lg transition-colors cursor-pointer ${isUnavailable || !canBookRoom(room) ? 'bg-gray-400 cursor-not-allowed' : 'bg-black hover:bg-gray-800'}`}
                          >
                            预订
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                )}
                <div ref={bottomRef} className="h-16 flex items-center justify-center flex-shrink-0 border-t border-gray-100 bg-white/50">
                  {loadingPromo && <span className="text-gray-500 text-sm">加载中...</span>}
                  {!promoHasMore && filteredRooms.length > 0 && <span className="text-gray-400 text-sm">已加载全部 {filteredRooms.length} 间房型</span>}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-8">
                {roomsByHotel.map(({ hotel, rooms }) => {
                  const displayImages =
                    (hotel?.images?.length
                      ? hotel.images
                      : (hotel?.hotelExteriorImages?.length
                          ? hotel.hotelExteriorImages
                          : (hotel?.hotelInteriorImages || []))) || [];
                  return (
                      <div
                        key={hotel?._id ?? hotel}
                        className="group/card rounded-2xl border border-gray-100 bg-white overflow-hidden shadow-sm hover:shadow-xl hover:border-gray-200 transition-all duration-300 min-w-0"
                      >
                        <div className="flex flex-row min-h-[133px] md:min-h-[360px] gap-3 md:gap-6 min-w-0">
                          <div className="relative w-2/5 min-w-[100px] max-w-[200px] md:max-w-[280px] flex-shrink-0 rounded-l-2xl overflow-hidden">
                            <HotelImageCarousel
                              images={displayImages}
                              fallbackImage={rooms[0]?.images?.[0]}
                              className="w-full h-full min-h-[133px] md:min-h-[360px]"
                              onClick={() => navigate(appendSearch(`/hotels/${hotel?._id ?? hotel}`))}
                            />
                          </div>
                          <div className="flex-1 flex flex-col min-w-0">
                            <div className="p-3 md:p-6 flex flex-col flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 md:gap-2 mb-1 md:mb-2 flex-wrap">
                                <h2 className="text-base md:text-2xl font-extrabold text-gray-800 leading-snug line-clamp-2">{hotel?.name}</h2>
                                {(hotel?.starRating ?? 0) > 0 && (
                                  <span className="text-[#f7ad1a] shrink-0 inline-flex items-center gap-0.5 text-sm md:text-xl">
                                    {Array.from({ length: hotel.starRating }, (_, i) => (
                                      <svg key={i} viewBox="0 0 24 24" className="w-[1em] h-[1em] flex-shrink-0">
                                        <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                                      </svg>
                                    ))}
                                  </span>
                                )}
                              </div>
                              {(() => {
                                const hid = hotel?._id ?? hotel;
                                const stats = hid ? hotelReviewStats[hid] : null;
                                const avgRating = stats?.avgRating ?? 0;
                                const total = stats?.total ?? 0;
                                const displayScore = avgRating > 0 ? Number(avgRating).toFixed(1) : null;
                                const ratingLabel = displayScore ? (parseFloat(displayScore) >= 4.5 ? '很棒' : parseFloat(displayScore) >= 4 ? '很好' : parseFloat(displayScore) >= 3 ? '不错' : parseFloat(displayScore) >= 2 ? '一般' : '较差') : null;
                                return (
                                  <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2 md:gap-3 mb-1.5 md:mb-2.5">
                                    <div className="flex flex-wrap items-center gap-2">
                                      {ratingLabel && displayScore ? (
                                        <>
                                          <span className="text-gray-800 font-medium text-sm">{ratingLabel}</span>
                                          <span className="inline-flex items-center justify-center min-w-[2rem] px-1.5 py-0.5 rounded bg-black text-white text-xs font-bold">{displayScore}</span>
                                          {total > 0 && <span className="text-gray-500 text-xs block sm:inline">{total.toLocaleString()}条住客点评</span>}
                                        </>
                                      ) : stats && total === 0 ? (
                                        <span className="text-gray-500 text-sm">暂无评价</span>
                                      ) : null}
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (role === 'admin') { toast('管理员不能预订酒店'); return; }
                                        if (canBookRoom(hotel)) navigate(appendSearch(`/hotels/${hotel?._id ?? hotel}`));
                                      }}
                                      disabled={false}
                                      title={!canBookRoom(hotel) ? (role === 'admin' ? '管理员不能预订酒店' : '不能预订自己的酒店') : undefined}
                                      className={`shrink-0 px-3 py-2 rounded-md text-sm font-medium transition-colors cursor-pointer ${canBookRoom(hotel) ? 'bg-black text-white hover:bg-gray-800' : 'bg-gray-400 text-gray-200 cursor-not-allowed'}`}
                                    >
                                      预订
                                    </button>
                                  </div>
                                );
                              })()}
                              <div className="text-gray-700 text-xs mb-1.5 md:mb-2.5">
                                <span className="line-clamp-2 font-medium">{hotel?.district ? `${hotel.district} · ${hotel?.city}` : `${hotel?.address} · ${hotel?.city}`}</span>
                                {(() => {
                                  const room = rooms[0];
                                  let dist = room?.distanceKm;
                                  if ((dist == null || Number.isNaN(dist)) && searchLatNum != null && searchLngNum != null && hotel?.latitude != null && hotel?.longitude != null) {
                                    dist = computeDistanceKm(searchLatNum, searchLngNum, hotel.latitude, hotel.longitude);
                                  }
                                  if (dist == null || Number.isNaN(dist)) return null;
                                  const display = Math.round(dist * 10) / 10;
                                  return (
                                    <span className="block text-gray-500 mt-0.5">
                                      {destination && isCity(destination, cityOptions) ? `距${destination}中心` : '距离您'} {display} km
                                    </span>
                                  );
                                })()}
                              </div>
                              {hotel?.hotelIntro && (
                                <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 md:line-clamp-3 flex-1">
                                  {hotel.hotelIntro}
                                </p>
                              )}
                            </div>
                            <div className="border-t border-gray-50 bg-gray-50/30 flex-shrink-0 min-w-0 w-full">
                              <p className="px-3 md:px-4 pt-1.5 md:pt-3 pb-1 md:pb-2 text-xs font-semibold text-gray-600 uppercase tracking-wide">可选房型</p>
                              <div className="overflow-x-auto overflow-y-hidden pb-2 md:pb-4 px-3 md:px-4 flex gap-2 md:gap-3 flex-nowrap min-w-0" style={{ scrollbarWidth: 'thin', WebkitOverflowScrolling: 'touch' }}>
                                {rooms.map((room) => {
                                  const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                                  return (
                                    <div
                                      key={room._id}
                                      className={`flex-shrink-0 w-28 md:w-44 rounded-lg border border-gray-200 bg-white overflow-hidden shadow-md hover:shadow-lg hover:border-gray-300 transition-all duration-200 ${isUnavailable ? 'opacity-60' : ''}`}
                                    >
                                      <div
                                        className="relative h-12 md:h-20 cursor-pointer overflow-hidden group"
                                        onClick={() => {
                                          if (isOwnHotelRoom(room)) { toast('不能预定自己名下的酒店哦'); return; }
                                          if (role === 'admin') { toast('管理员不能预订酒店'); return; }
                                          if (canBookRoom(room) && !isUnavailable) { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }
                                        }}
                                      >
                                        <img src={room.images?.[0]} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200" loading={isLegacyList ? 'eager' : 'lazy'} decoding="async" />
                                        {isUnavailable && (
                                          <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                                            <span className="bg-gray-700/90 text-white px-2 py-1 rounded text-xs font-medium">已订完</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="p-1.5 md:p-2.5">
                                        <p className="text-xs font-semibold text-gray-800 truncate mb-1 md:mb-2" title={getRoomTypeLabel(room.roomType)}>{getRoomTypeLabel(room.roomType)}</p>
                                        <div className="flex items-center justify-between gap-2">
                                          <span className="text-sm font-bold text-black">{isAuthenticated && (room.promoDiscount ?? 0) > 0 ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100)) : room.pricePerNight}<span className="text-xs font-normal text-gray-500 ml-0.5">元/晚</span></span>
                                          <button
                                            type="button"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              if (isOwnHotelRoom(room)) { toast('不能预定自己名下的酒店哦'); return; }
                                              if (role === 'admin') { toast('管理员不能预订酒店'); return; }
                                              if (canBookRoom(room) && !isUnavailable) { navigate(appendSearch(`/rooms/${room._id}`)); scrollTo(0, 0); }
                                            }}
                                            disabled={isUnavailable}
                                            title={!canBookRoom(room) ? (role === 'admin' ? '管理员不能预订酒店' : '不能预订自己的酒店') : undefined}
                                            className={`shrink-0 px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer ${isUnavailable || !canBookRoom(room) ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'bg-black text-white hover:bg-gray-800'}`}
                                          >
                                            预订
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                <div ref={bottomRef} className="h-16 flex items-center justify-center flex-shrink-0 border-t border-gray-100 bg-white/50">
                  {loadingMoreSource && <span className="text-gray-500 text-sm">加载中...</span>}
                  {!hasMoreSource && filteredRooms.length > 0 && <span className="text-gray-400 text-sm">已加载全部酒店</span>}
                </div>
              </div>
            </>
          )}
        </div>

      </div>
    </div>
    </div>
  );
}

export default AllRooms;
