import { useState, useEffect, useCallback, useMemo } from 'react';
import { domesticHotCities, overseasHotCities, popularPlacesByCity, getPopularPlacesForCity } from '../assets/assets';
import { matchKeyword, formatRecentSubtitle } from '../utils/destinationSearch';

function LocationIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function BuildingIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function AirplaneIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" />
    </svg>
  );
}

function PlaceIcon({ icon, className = 'w-4 h-4' }) {
  if (icon === 'airplane') return <AirplaneIcon className={className} />;
  if (icon === 'building') return <BuildingIcon className={className} />;
  return <LocationIcon className={className} />;
}

function ClockIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function TrashIcon({ className = 'w-4 h-4' }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

export default function DestinationDropdown({
  destination,
  recentSearchRecords = [],
  clearRecentSearch,
  cityOptions = [],
  axios,
  onSelect,
  onClose,
}) {
  const kw = (destination || '').trim();
  const [hotels, setHotels] = useState([]);

  const fetchHotels = useCallback(() => {
    if (!kw || kw.length < 1 || !axios) return;
    axios.get(`/api/hotels/public/search?q=${encodeURIComponent(kw)}`)
      .then(({ data }) => data.success && setHotels(data.hotels || []))
      .catch(() => setHotels([]));
  }, [kw, axios]);

  useEffect(() => {
    if (!kw) { setHotels([]); return; }
    const t = setTimeout(fetchHotels, 200);
    return () => clearTimeout(t);
  }, [kw, fetchHotels]);

  const match = useCallback((text) => matchKeyword(text, kw), [kw]);

  /** 当地热门地点推荐：当输入匹配某城市时，显示该城市的热门地点（预设或自动生成） */
  const popularPlaces = useMemo(() => {
    if (!kw) return [];
    const presetCities = Object.keys(popularPlacesByCity);
    const presetMatch = presetCities.find((c) => matchKeyword(c, kw));
    if (presetMatch) return popularPlacesByCity[presetMatch];
    const domesticMatch = domesticHotCities.find((c) => matchKeyword(c, kw));
    if (domesticMatch) return getPopularPlacesForCity(domesticMatch, true);
    const overseasMatch = overseasHotCities.find((c) => matchKeyword(c, kw));
    if (overseasMatch) return getPopularPlacesForCity(overseasMatch, false);
    const moreMatch = cityOptions.find((c) => matchKeyword(c, kw));
    if (moreMatch) return getPopularPlacesForCity(moreMatch, domesticHotCities.includes(moreMatch));
    return [];
  }, [kw, cityOptions]);

  const recent = recentSearchRecords.filter((r) => r.destination && match(r.destination));
  const domestic = domesticHotCities.filter(match);
  const overseas = overseasHotCities.filter(match);
  const more = cityOptions.filter(
    (c) => match(c) && !domesticHotCities.includes(c) && !overseasHotCities.includes(c)
      && !recent.some((r) => r.destination === c),
  );

  const handleSelect = (val) => {
    onSelect(val);
    onClose?.();
  };

  const hasAny =
    popularPlaces.length > 0 ||
    recent.length > 0 ||
    domestic.length > 0 ||
    overseas.length > 0 ||
    more.length > 0 ||
    hotels.length > 0;

  if (!hasAny) {
    return (
      <div className="absolute top-full left-0 mt-1 min-w-[480px] max-w-[95vw] py-4 px-4 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-xl z-[100]">
        <p className="text-sm text-gray-500">未找到匹配的目的地或酒店</p>
      </div>
    );
  }

  return (
    <div className="absolute top-full left-0 mt-1 min-w-[480px] max-w-[95vw] py-3 max-h-[70vh] overflow-y-auto rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-xl z-[100]">
      {popularPlaces.length > 0 && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">当地热门地点推荐</p>
          <ul className="space-y-0.5">
            {popularPlaces.map((place, i) => (
              <li
                key={`${place.name}-${i}`}
                role="option"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => handleSelect(place.name)}
              >
                <PlaceIcon icon={place.icon} className="w-4 h-4 text-gray-500 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="font-medium text-gray-900">{place.name}</span>
                  {place.subtitle && (
                    <span className="ml-2 text-xs text-gray-500">{place.subtitle}</span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {recent.length > 0 && (
        <div className="mb-4 px-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">最近搜索记录</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); clearRecentSearch?.(); }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-red-500"
            >
              <TrashIcon className="w-3.5 h-3.5" />
              清除历史
            </button>
          </div>
          <div className="space-y-1">
            {recent.map((r, i) => (
              <button
                key={`${r.destination}-${i}`}
                type="button"
                onClick={() => handleSelect(r.destination)}
                className="w-full flex items-center gap-2 px-3 py-2 text-left rounded-lg hover:bg-gray-50 text-gray-700"
              >
                <ClockIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{r.destination}</span>
                  {formatRecentSubtitle(r) && (
                    <span className="ml-2 text-xs text-gray-500">{formatRecentSubtitle(r)}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {hotels.length > 0 && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">酒店</p>
          <ul className="space-y-1">
            {hotels.map((h) => (
              <li
                key={h._id || h.name}
                role="option"
                className="px-3 py-2 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-blue-50"
                onClick={() => handleSelect(h.name)}
              >
                <span className="font-medium">{h.name}</span>
                {h.city && <span className="ml-2 text-gray-500">{h.city}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {domestic.length > 0 && !kw && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">国内热门城市</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {domestic.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelect(c)}
                className="px-2 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-blue-50 text-center"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {overseas.length > 0 && !kw && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">海外热门城市</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
            {overseas.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => handleSelect(c)}
                className="px-2 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-blue-50 text-center"
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      {more.length > 0 && (
        <div className="px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">更多城市</p>
          <ul className="space-y-0.5">
            {more.map((c) => (
              <li
                key={c}
                role="option"
                className="px-3 py-2 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-blue-50"
                onClick={() => handleSelect(c)}
              >
                {c}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
