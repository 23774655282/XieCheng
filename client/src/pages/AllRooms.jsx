import React, { useMemo, useState, useEffect, useRef, useCallback } from 'react';
import { facilityIcons } from '../assets/assets';
import { useSearchParams } from 'react-router-dom';
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
  const { rooms, navigate, fetchRooms } = useAppContext();
  const [nextPage, setNextPage] = useState(2);
  const [hasMore, setHasMore] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const bottomRef = useRef(null);

  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const r = await fetchRooms(nextPage);
    setHasMore(r.hasMore || false);
    setNextPage((p) => p + 1);
    setLoadingMore(false);
  }, [nextPage, hasMore, loadingMore, fetchRooms]);

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

  console.log(rooms);

  const [selectedFilters, setSelectedFilters] = useState({
    roomType: [],
    priceRange: [],
  });

  const [selectSort, setSelectSort] = useState("");

  const roomTypes = ['Single Bed', 'Double Bed', 'Luxury Room', 'Family Suite'];

  const priceRanges = ['Under $100', '$100 - $200', '$200 - $300', '$300 - $400'];

  const sortOptions = ['price low to high', 'price high to low', 'Newest'];

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

  const matchRoomType = (room) =>
    selectedFilters.roomType.length === 0 ||
    selectedFilters.roomType.includes(room.roomType);

  const matchPriceRange = (room) => {
    if (selectedFilters.priceRange.length === 0) return true;

    return selectedFilters.priceRange.some((range) => {
      if (range === 'Under $100') return room.pricePerNight < 100;
      const match = range.match(/\$(\d+)\s*-\s*\$(\d+)/);
      if (match) {
        const min = parseInt(match[1]);
        const max = parseInt(match[2]);
        return room.pricePerNight >= min && room.pricePerNight <= max;
      }
      return false;
    });
  };

  const sortRooms = (a, b) => {
    if (selectSort === 'price low to high') {
      return a.pricePerNight - b.pricePerNight;
    }
    if (selectSort === 'price high to low') {
      return b.pricePerNight - a.pricePerNight;
    }
    if (selectSort === 'Newest') {
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
    return rooms
      .filter(
        (room) =>
          matchRoomType(room) &&
          matchPriceRange(room) &&
          filterDestination(room)
      )
      .sort(sortRooms);
  }, [rooms, selectedFilters, selectSort, searchParams]);

  const clearFilters = () => {
    setSelectedFilters({
      roomType: [],
      priceRange: [],
    });
    setSelectSort('');
    setSearchParams({});
  };

  return (
    <div className="pt-28 md:pt-36 px-4 md:px-16 lg:px-24 xl:px-32 mb-16">
      <h1 className="font-playfair text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
        All Rooms
      </h1>
      <p className="text-gray-600 mb-10">
        Explore our wide range of rooms available for booking.
      </p>

      <div className="flex flex-col lg:flex-row gap-10">
        {/* Rooms Section */}
        <div className="flex flex-col gap-8 flex-1">
          {filteredRooms.length === 0 ? (
            <p className="text-gray-500">No rooms match the selected filters.</p>
          ) : (
            filteredRooms.map((room) => (
              <div
                key={room._id}
                className="flex flex-col md:flex-row bg-white rounded-2xl shadow-md hover:shadow-lg transition duration-300 p-5 gap-6"
              >
                <img
                  onClick={() => {
                    navigate(`/rooms/${room._id}`);
                    scrollTo(0, 0);
                  }}
                  src={room.images[0]}
                  alt="room"
                  title="View Room Detail"
                  className="w-full md:w-64 h-48 object-cover rounded-lg cursor-pointer"
                />

                <div className="flex flex-col flex-1 gap-3 justify-between">
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {room.hotel?.city}
                    </p>
                    <p className="text-sm text-gray-500">
                      {room.hotel?.name}
                      <button type="button" onClick={() => navigate(`/hotels/${room.hotel?._id || room.hotel}`)} className="ml-2 text-blue-600 text-xs">查看酒店</button>
                    </p>
                  </div>

                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <CiLocationOn className="text-gray-500" size={20} />
                    <span>{room.hotel.address}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 mt-3">
                    {room.amenties.map((item, index) => (
                      <div
                        key={index}
                        className="flex flex-col items-center w-16"
                      >
                        <img
                          src={facilityIcons[item]}
                          alt={item}
                          className="w-6 h-6 mb-1"
                        />
                        <p className="text-xs text-gray-600 text-center">
                          {item}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex flex-col justify-between items-end min-w-max">
                  <p>
                    <span className="text-xl font-bold text-gray-800">
                      ${room.pricePerNight}
                    </span>
                    <span className="text-sm text-gray-500 ml-1">/night</span>
                  </p>
                </div>
              </div>
            ))
          )}
          {/* 上滑自动加载：大作业要求 */}
          <div ref={bottomRef} className="h-10 flex items-center justify-center">
            {loadingMore && <span className="text-gray-500">加载中...</span>}
            {!hasMore && filteredRooms.length > 0 && <span className="text-gray-400 text-sm">已加载全部</span>}
          </div>
        </div>

        {/* Filters Section */}
        <div className="w-full lg:w-64 flex-shrink-0 border rounded-2xl p-5 h-fit shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <p className="text-lg font-semibold text-gray-800">Filters</p>
            <button
              onClick={clearFilters}
              className="text-sm text-red-500 hover:underline hidden lg:inline"
            >
              CLEAR
            </button>
          </div>

          <div className="mb-6 flex flex-col gap-2">
            <p className="text-sm font-semibold text-gray-800 mb-2">Room Type</p>
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
            <p className="text-sm font-semibold text-gray-800 mb-2">Price Range</p>
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
            <p className="text-sm font-semibold text-gray-800 mb-2">Sort By</p>
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
      </div>
    </div>
  );
}

export default AllRooms;
