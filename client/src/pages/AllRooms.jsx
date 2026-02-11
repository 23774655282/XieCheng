import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { facilityIcons } from '../assets/assets';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { CiLocationOn } from 'react-icons/ci';
import { useAppContext } from '../context/AppContext';

function CheckBox({ label, selected = false, onChange }) {
  return (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={selected}
        onChange={(e) => onChange(e.target.checked, label)}
      />
      <span className="font-light select-none">{label}</span>
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

  const [selectedFilters, setSelectedFilters] = useState({
    roomType: [],
    priceRange: [],
  });

  const [selectSort, setSelectSort] = useState("");

  const roomTypes = ['单床', '双床', '豪华房', '家庭套房'];
  const roomTypeToEn = { '单床': 'Single Bed', '双床': 'Double Bed', '豪华房': 'Luxury Room', '家庭套房': 'Family Suite' };
  const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
  const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;
  const facilityLabelMap = {
    'Free Wifi': '免费 Wi-Fi',
    'Free Breakfast': '免费早餐',
    'Room Service': '客房服务',
    'Mountain View': '山景',
    'Pool Access': '泳池使用',
  };

  const priceRanges = ['100元以下', '100-200元', '200-300元', '300-400元'];

  const sortOptions = ['价格从低到高', '价格从高到低', '最新'];

  const handleFilterChange = (checked, value, type) => {
    setSelectedFilters((prev) => {
      const updated = { ...prev };
      if (checked) {
        updated[type].push(value);
      } else {
        updated[type] = updated[type].filter((item) => item !== value);
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
      if (range === '100元以下') return room.pricePerNight < 100;
      const match = range.match(/(\d+)-(\d+)元/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return room.pricePerNight >= min && room.pricePerNight <= max;
      }
      return false;
    });
  };

  const sortRooms = (a, b) => {
    if (selectSort === '价格从低到高') {
      return a.pricePerNight - b.pricePerNight;
    }
    if (selectSort === '价格从高到低') {
      return b.pricePerNight - a.pricePerNight;
    }
    if (selectSort === '最新') {
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    return 0;
  };

  const filterDestination = (room) => {
    const destination = searchParams.get('destination');
    if (!destination) return true;
    return room.hotel.city.toLowerCase().includes(destination.toLowerCase());
  };

  const filteredRooms = useMemo(() => {
    if (promo) return roomsSource;
    return roomsSource
      .filter(
        (room) =>
          matchRoomType(room) &&
          matchPriceRange(room) &&
          filterDestination(room)
      )
      .sort(sortRooms);
  }, [roomsSource, selectedFilters, selectSort, searchParams, promo]);

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
    return Object.values(map);
  }, [filteredRooms, promo]);

  const clearFilters = () => {
    setSelectedFilters({
      roomType: [],
      priceRange: [],
    });
    setSelectSort('');
    setSearchParams({});
  };

  const isPromoMode = Boolean(promo);

  return (
    <div className="pt-28 md:pt-36 px-4 md:px-16 lg:px-24 xl:px-32 mb-16">
      <div className="flex flex-wrap items-center gap-4 mb-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
        >
          <span className="text-lg leading-none">←</span>
          <span>返回</span>
        </button>
        <h1 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold">
          {isPromoMode ? `限时优惠 · ${promo}% 优惠` : '全部房间'}
        </h1>
      </div>
      <p className="text-gray-600 mb-10">
        {isPromoMode ? '以下为享受该优惠力度的房型，下拉加载更多。' : '浏览并预订可用的房型。'}
      </p>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Rooms Section */}
        <div className="flex flex-col gap-8 flex-1">
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
                {filteredRooms.map((room) => (
                  <div
                    key={room._id}
                    className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition duration-200"
                  >
                    <img
                      onClick={() => { navigate(`/rooms/${room._id}`); scrollTo(0, 0); }}
                      src={room.images?.[0]}
                      alt="房间"
                      title="查看房间详情"
                      className="w-full h-40 object-cover cursor-pointer"
                    />
                    <div className="p-4 flex flex-col flex-1">
                      <p className="text-base font-semibold text-gray-800 mb-2">{getRoomTypeLabel(room.roomType)}</p>
                      <div className="flex flex-wrap gap-2 mb-3">
                        {room.amenties?.slice(0, 4).map((item, index) => (
                          <div key={index} className="flex items-center gap-1">
                            <img src={facilityIcons[item]} alt={facilityLabelMap[item] || item} className="w-4 h-4" />
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
                          className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                        >
                          预订
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
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
                    {rooms.slice(0, 4).map((room) => (
                      <div
                        key={room._id}
                        className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition duration-200"
                      >
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
                        <div className="p-4 flex flex-col flex-1">
                          <p className="text-base font-semibold text-gray-800 mb-2">{getRoomTypeLabel(room.roomType)}</p>
                          <div className="flex flex-wrap gap-2 mb-3">
                            {room.amenties?.slice(0, 4).map((item, index) => (
                              <div key={index} className="flex items-center gap-1">
                                <img
                                  src={facilityIcons[item]}
                                  alt={facilityLabelMap[item] || item}
                                  className="w-4 h-4"
                                />
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
                              className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                            >
                              预订
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
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

        {/* Filters Section（优惠模式下隐藏） */}
        {!isPromoMode && (
        <div className="w-full lg:w-64 flex-shrink-0 border rounded-2xl p-5 h-fit shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-gray-800">筛选</p>
            <button
              onClick={clearFilters}
              className="text-sm text-red-500 hover:underline hidden lg:inline"
            >
              清除
            </button>
          </div>

          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">房型</p>
            {roomTypes.map((type, index) => (
              <CheckBox
                key={type}
                label={type}
                selected={selectedFilters.roomType.includes(type)}
                onChange={(checked) =>
                  handleFilterChange(checked, type, 'roomType')
                }
              />
            ))}
          </div>

          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">价格区间</p>
            {priceRanges.map((range, index) => (
              <CheckBox
                key={index}
                label={range}
                selected={selectedFilters.priceRange.includes(range)}
                onChange={(checked) =>
                  handleFilterChange(checked, range, 'priceRange')
                }
              />
            ))}
          </div>

          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">排序</p>
            {sortOptions.map((option, index) => (
              <CheckBox
                key={index}
                label={option}
                selected={selectSort === option}
                onChange={(checked) =>
                  handleSortChange(checked ? option : '')
                }
              />
            ))}
          </div>
        </div>
        )}
      </div>
    </div>
  );
}

export default AllRooms;
