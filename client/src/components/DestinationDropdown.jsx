import { useState, useEffect, useCallback } from 'react';
import { domesticHotCities, overseasHotCities } from '../assets/assets';
import { matchKeyword, formatRecentSubtitle } from '../utils/destinationSearch';

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

      {domestic.length > 0 && (
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

      {overseas.length > 0 && (
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
