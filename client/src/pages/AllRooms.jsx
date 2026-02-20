import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { facilityIcons } from '../assets/assets';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CiLocationOn } from 'react-icons/ci';
import { useAppContext } from '../context/AppContext';

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

function AllRooms() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const destination = searchParams.get('destination') || '';
  const promo = searchParams.get('promo') || '';
  const { rooms: contextRooms, fetchRooms, axios } = useAppContext();

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
  const bottomRef = useRef(null);

  const roomsSource = promo ? promoRooms : (destination ? localRooms : contextRooms);
  const hasMoreSource = promo ? promoHasMore : (destination ? localHasMore : hasMore);
  const loadingMoreSource = promo ? loadingPromo : (destination ? loadingSearch : loadingMore);
  
  const checkIn = searchParams.get('checkIn') || '';
  const checkOut = searchParams.get('checkOut') || '';

  useEffect(() => {
    if (!destination) return;
    setLoadingSearch(true);
    axios.get(`/api/rooms/?page=1&limit=12&destination=${encodeURIComponent(destination)}`)
      .then(({ data }) => {
        if (data.success) {
          setLocalRooms(data.rooms || []);
          setLocalHasMore(data.hasMore || false);
          setLocalNextPage(2);
        }
      })
      .finally(() => setLoadingSearch(false));
  }, [destination]);

  useEffect(() => {
    if (!promo) return;
    setLoadingPromo(true);
    axios.get(`/api/rooms/?page=1&limit=6&promo=${encodeURIComponent(promo)}`)
      .then(({ data }) => {
        if (data.success) {
          setPromoRooms(data.rooms || []);
          setPromoHasMore(data.hasMore || false);
          setPromoNextPage(2);
        }
      })
      .finally(() => setLoadingPromo(false));
  }, [promo, axios]);

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
        const { data } = await axios.get(`/api/rooms/?page=${localNextPage}&limit=12&destination=${encodeURIComponent(destination)}`);
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
  }, [promo, promoNextPage, destination, localNextPage, hasMoreSource, loadingMoreSource, nextPage, fetchRooms, axios]);

  useEffect(() => {
    const el = bottomRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0].isIntersecting) loadMore(); },
      { rootMargin: '100px', threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

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
      const checkPromises = roomsToCheck.map(async (room) => {
        try {
          const { data } = await axios.post('/api/bookings/check-availability', {
            room: room._id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
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
  }, [checkIn, checkOut, roomsSource, promo, axios]);

  const [selectedFilters, setSelectedFilters] = useState({
    roomType: [],
    priceRange: [],
    starRating: [],
    amenities: [],
    hasPromo: false,
  });

  const [selectSort, setSelectSort] = useState("");
  const [roomAvailability, setRoomAvailability] = useState({}); // 房间可用性缓存 { roomId: boolean }
  const [checkingAvailability, setCheckingAvailability] = useState(false);

  const roomTypes = ['单床', '双床', '大床房', '豪华房', '家庭套房', '标准间', '商务房', '海景房', '套房'];
  const roomTypeToEn = { '单床': 'Single Bed', '双床': 'Double Bed', '大床房': 'King Bed', '豪华房': 'Luxury Room', '家庭套房': 'Family Suite', '标准间': 'Standard Room', '商务房': 'Business Room', '海景房': 'Sea View Room', '套房': 'Suite' };
  const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'King Bed': '大床房', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房', 'Standard Room': '标准间', 'Business Room': '商务房', 'Sea View Room': '海景房', 'Suite': '套房' };
  const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;
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

  const priceRanges = ['50元以下', '50-100元', '100-200元', '200-300元', '300-500元', '500-800元', '800-1200元', '1200元以上'];

  const starRatings = ['五星级', '四星级', '三星级', '二星级', '一星级'];

  const sortOptions = ['价格从低到高', '价格从高到低', '最新', '优惠力度大'];

  const handleFilterChange = (checked, value, type) => {
    setSelectedFilters((prev) => {
      const updated = { ...prev };
      if (type === 'hasPromo') {
        updated.hasPromo = checked;
      } else if (checked) {
        if (!Array.isArray(updated[type])) updated[type] = [];
        updated[type].push(value);
      } else {
        updated[type] = (updated[type] || []).filter((item) => item !== value);
      }
      return updated;
    });
  };

  const handleSortChange = (value) => {
    setSelectSort(value);
  };

  const matchRoomType = (room) => {
    if (selectedFilters.roomType.length === 0) return true;
    return selectedFilters.roomType.some((label) => room.roomType === label || room.roomType === roomTypeToEn[label]);
  };

  const matchPriceRange = (room) => {
    if (selectedFilters.priceRange.length === 0) return true;
    return selectedFilters.priceRange.some((range) => {
      if (range === '50元以下') return room.pricePerNight < 50;
      if (range === '1200元以上') return room.pricePerNight >= 1200;
      const match = range.match(/(\d+)-(\d+)元/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return room.pricePerNight >= min && room.pricePerNight <= max;
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
    if (selectSort === '价格从低到高') return a.pricePerNight - b.pricePerNight;
    if (selectSort === '价格从高到低') return b.pricePerNight - a.pricePerNight;
    if (selectSort === '最新') return new Date(b.createdAt) - new Date(a.createdAt);
    if (selectSort === '优惠力度大') {
      const pa = a.promoDiscount ?? 0;
      const pb = b.promoDiscount ?? 0;
      return pb - pa;
    }
    return 0;
  };

  const filterDestination = (room) => {
    const dest = searchParams.get('destination');
    if (!dest) return true;
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
  }, [roomsSource, selectedFilters, selectSort, searchParams, promo, checkIn, checkOut, roomAvailability]);

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

  const clearFilters = () => {
    setSelectedFilters({
      roomType: [],
      priceRange: [],
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

  return (
    <div className="pt-28 md:pt-32 px-4 md:px-8 lg:px-12 mb-16 max-w-6xl mx-auto">
      <div className="mb-4 mt-4">
        <h1 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold">
          {isPromoMode ? `限时优惠 · ${promo}% 优惠` : '全部房间'}
        </h1>
      </div>
      <p className="text-gray-600 mb-10">
        {isPromoMode ? '以下为享受该优惠力度的房型，下拉加载更多。' : '浏览并预订可用的房型。'}
      </p>

      {/* PC 端：左侧为固定宽度筛选栏，右侧为自适应内容；移动端上下排列 */}
      <div className="flex flex-col lg:flex-row lg:items-start gap-10">
        {!isPromoMode && (
        <aside className="w-full lg:w-64 lg:max-w-xs flex-shrink-0 order-2 lg:order-1">
          <div
            className="sticky top-24 z-10 border border-gray-200 rounded-xl p-4 bg-white shadow-sm"
            onClick={(e) => { if (!e.target.closest('input, button, label, a')) document.activeElement?.blur?.(); }}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">筛选条件</p>
              <button type="button" onClick={clearFilters} className="text-xs font-medium px-2.5 py-1 rounded-md border border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400 transition-colors">清除全部</button>
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
                <div className="flex flex-col gap-1.5">
                  {priceRanges.map((range) => (
                    <CheckBox key={range} label={range} selected={selectedFilters.priceRange.includes(range)} onChange={(checked) => handleFilterChange(checked, range, 'priceRange')} />
                  ))}
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
        <div className="flex flex-col gap-8 flex-1 order-1 lg:order-2">
          {isPromoMode && loadingPromo && promoRooms.length === 0 ? (
            <p className="text-gray-500">加载优惠房型中...</p>
          ) : destination && loadingSearch && localRooms.length === 0 ? (
            <p className="text-gray-500">正在搜索「{destination}」...</p>
          ) : filteredRooms.length === 0 ? (
            <p className="text-gray-500">
              {isPromoMode ? '暂无该优惠档位的房型。' : destination ? `未找到「${destination}」相关房间，请尝试其他目的地或清除筛选。` : '没有匹配筛选条件的房间。'}
            </p>
          ) : isPromoMode ? (
            /* 优惠档位：平铺列表，每行 3 个，首屏 6 间，下拉加载 */
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRooms.map((room) => {
                  const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                  return (
                    <div
                      key={room._id}
                      className={`flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition duration-200 relative ${isUnavailable ? 'opacity-60' : ''}`}
                    >
                      <div className="relative">
                        <img
                          onClick={() => { navigate(`/rooms/${room._id}`); scrollTo(0, 0); }}
                          src={room.images?.[0]}
                          alt="房间"
                          title="查看房间详情"
                          className="w-full h-40 object-cover cursor-pointer"
                        />
                        {isUnavailable && (
                          <>
                            <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">已预订</span>
                            </div>
                          </>
                        )}
                      </div>
                      <div className="p-4 flex flex-col flex-1">
                        <p className="text-base font-semibold text-gray-800 mb-2">{getRoomTypeLabel(room.roomType)}</p>
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
                            <span className="text-lg font-bold text-gray-800">{room.pricePerNight} 元</span>
                            <span className="text-sm text-gray-500 ml-0.5">/晚</span>
                          </p>
                          <button
                            type="button"
                            onClick={() => { navigate(`/rooms/${room._id}`); scrollTo(0, 0); }}
                            disabled={isUnavailable}
                            className={`px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${isUnavailable ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                          >
                            预订
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div ref={bottomRef} className="h-14 flex items-center justify-center">
                {loadingPromo && <span className="text-gray-500">加载中...</span>}
                {!promoHasMore && filteredRooms.length > 0 && <span className="text-gray-400 text-sm">已加载全部 {filteredRooms.length} 间房型</span>}
              </div>
            </>
          ) : (
            <>
              {roomsByHotel.map(({ hotel, rooms }) => (
                <div
                  key={hotel?._id ?? hotel}
                  className="rounded-2xl border border-gray-200 bg-gray-50/80 overflow-hidden shadow-sm"
                >
                  {/* 酒店栏：以商家配置的酒店图片为背景 */}
                  <div
                    className="relative min-h-[120px] px-5 py-4 border-b border-gray-200 bg-cover bg-center"
                    style={{ backgroundImage: hotel?.images?.[0] ? `url(${hotel.images[0]})` : undefined, backgroundColor: hotel?.images?.[0] ? undefined : '#f3f4f6' }}
                  >
                    <div className="absolute inset-0 bg-black/50" aria-hidden />
                    <div className="relative flex flex-wrap items-center justify-between gap-2 z-10">
                      <div>
                        <h2 className="text-lg font-bold text-white drop-shadow-sm">{hotel?.name}</h2>
                        <div className="flex items-center gap-2 text-sm text-white/90 mt-1">
                          <CiLocationOn size={16} className="flex-shrink-0" />
                          <span>{hotel?.address}</span>
                          <span className="text-white/70">·</span>
                          <span>{hotel?.city}</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate(`/hotels/${hotel?._id ?? hotel}`)}
                        className="text-sm text-white font-medium py-1.5 px-3 rounded-md bg-white/20 hover:bg-white/30 transition-colors"
                      >
                        查看酒店详情
                      </button>
                    </div>
                  </div>
                  {/* 该酒店下的房型列表：最多展示 4 间，多则显示「查看更多」 */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-5">
                    {rooms.slice(0, 4).map((room) => {
                      const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                      return (
                        <div
                          key={room._id}
                          className={`flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition duration-200 relative ${isUnavailable ? 'opacity-60' : ''}`}
                        >
                          <div className="relative">
                            <img
                              onClick={() => {
                                navigate(`/rooms/${room._id}`);
                                scrollTo(0, 0);
                              }}
                              src={room.images?.[0]}
                              alt="房间"
                              title="查看房间详情"
                              className="w-full h-40 object-cover cursor-pointer"
                            />
                            {isUnavailable && (
                              <>
                                <div className="absolute inset-0 bg-white/70 backdrop-blur-sm" />
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <span className="bg-gray-800/90 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg">已预订</span>
                                </div>
                              </>
                            )}
                          </div>
                          <div className="p-4 flex flex-col flex-1">
                            <p className="text-base font-semibold text-gray-800 mb-2">{getRoomTypeLabel(room.roomType)}</p>
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
                                <span className="text-lg font-bold text-gray-800">{room.pricePerNight} 元</span>
                                <span className="text-sm text-gray-500 ml-0.5">/晚</span>
                              </p>
                              <button
                                type="button"
                                onClick={() => { navigate(`/rooms/${room._id}`); scrollTo(0, 0); }}
                                disabled={isUnavailable}
                                className={`px-3 py-1.5 text-white text-sm rounded-lg transition-colors ${isUnavailable ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                              >
                                预订
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {rooms.length > 4 && (
                    <div className="px-5 pb-5">
                      <button
                        type="button"
                        onClick={() => { navigate(`/hotels/${hotel?._id ?? hotel}`); scrollTo(0, 0); }}
                        className="w-full py-2.5 border border-blue-600 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-50 transition-colors"
                      >
                        查看更多
                      </button>
                    </div>
                  )}
                </div>
              ))}
              <div ref={bottomRef} className="h-14 flex items-center justify-center">
                {loadingMoreSource && <span className="text-gray-500">加载中...</span>}
                {!hasMoreSource && filteredRooms.length > 0 && <span className="text-gray-400 text-sm">已加载全部房型</span>}
              </div>
            </>
          )}
        </div>

      </div>
    </div>
  );
}

export default AllRooms;
