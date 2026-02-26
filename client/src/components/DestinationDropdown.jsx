import { useState, useEffect, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { IoLocationOutline } from 'react-icons/io5';
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
  compact = false,
  destination,
  recentSearchRecords = [],
  clearRecentSearch,
  cityOptions = [],
  axios,
  onSelect,
  onCityClick,
  onRestoreRecent,
  onClose,
  onLocationClick,
  showDomestic: showDomesticProp,
  onShowDomesticChange,
}) {
  const kw = (destination || '').trim();
  const [hotels, setHotels] = useState([]);
  const [poiTips, setPoiTips] = useState([]);
  const [poiLoading, setPoiLoading] = useState(false);
  const [showDomesticInternal, setShowDomesticInternal] = useState(true);
  const showDomestic = showDomesticProp !== undefined ? showDomesticProp : showDomesticInternal;
  const setShowDomestic = onShowDomesticChange ?? setShowDomesticInternal;

  const fetchPoiTips = useCallback(() => {
    if (!kw || kw.length < 1 || !axios) return;
    setPoiLoading(true);
    axios
      .get('/api/amap/inputtips', { params: { keywords: kw }, timeout: 8000 })
      .then(({ data }) => {
        if (!data?.success || !Array.isArray(data.tips)) return setPoiTips([]);
        // 展示：有街道地址的联想项，或有经纬度（location）的 POI（地标、机场等，用于附近酒店搜索）
        const list = data.tips.filter(
          (t) =>
            (t.address && String(t.address).trim() && t.address !== t.district) ||
            (t.location && String(t.location).trim())
        );
        setPoiTips(list);
      })
      .catch(() => setPoiTips([]))
      .finally(() => setPoiLoading(false));
  }, [kw, axios]);

  useEffect(() => {
    if (!kw) return setPoiTips([]);
    if (!showDomestic) return setPoiTips([]); // 海外模式禁用联想
    const t = setTimeout(fetchPoiTips, 200);
    return () => clearTimeout(t);
  }, [kw, showDomestic, fetchPoiTips]);

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

  /** 当地热门地点推荐：仅海外模式展示（海外地图数据不便，用预设推荐）；国内用联想，海外用热门推荐 */
  const popularPlaces = useMemo(() => {
    if (showDomestic) return [];
    if (!kw) return [];
    const presetCities = Object.keys(popularPlacesByCity);
    const presetMatch = presetCities.find((c) => matchKeyword(c, kw));
    if (presetMatch && overseasHotCities.includes(presetMatch)) return popularPlacesByCity[presetMatch];
    const overseasMatch = overseasHotCities.find((c) => matchKeyword(c, kw));
    if (overseasMatch) return getPopularPlacesForCity(overseasMatch, false);
    const moreMatch = cityOptions.find((c) => matchKeyword(c, kw));
    if (moreMatch && !domesticHotCities.includes(moreMatch)) return getPopularPlacesForCity(moreMatch, false);
    return [];
  }, [kw, cityOptions, showDomestic]);

  const recent = recentSearchRecords.filter((r) => r.destination && match(r.destination));
  const domestic = domesticHotCities.filter(match);
  const overseas = overseasHotCities.filter(match);

  const handleSelect = (val, opts = {}) => {
    onSelect(val, opts);
    onClose?.();
  };

  /** 点击热门城市：仅更新输入，不关闭，展示下一级（联想或热门地点） */
  const handleCityClick = (val) => {
    if (onCityClick) {
      onCityClick(val);
    } else {
      onSelect(val);
      onClose?.();
    }
  };

  /** 点击最近搜索：还原完整搜索条件 */
  const handleRecentClick = (record) => {
    if (onRestoreRecent && record) {
      onRestoreRecent(record);
      onClose?.();
    } else {
      handleSelect(record?.destination ?? '');
    }
  };

  const hasAny =
    (!kw && onLocationClick) ||
    (kw && showDomestic) ||
    popularPlaces.length > 0 ||
    (!kw && (recent.length > 0 || domestic.length > 0 || overseas.length > 0 || hotels.length > 0));

  const gridCols = compact ? 'grid-cols-5' : 'grid-cols-3 sm:grid-cols-4 md:grid-cols-5';

  if (!hasAny) {
    return (
      <div
        className={
          compact
            ? 'fixed left-0 top-[7.5rem] w-full py-4 px-4 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-xl z-[100]'
            : 'absolute top-full left-0 mt-1 w-full md:min-w-[480px] md:max-w-[95vw] py-4 px-4 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-xl z-[100]'
        }
      >
        <p className="text-sm text-gray-500">未找到匹配的目的地或酒店</p>
      </div>
    );
  }

  const content = (
    <div
      data-destination-dropdown
      className={
        compact
          ? 'fixed left-0 top-[7.5rem] w-full max-h-[calc(100vh-7.5rem)] overflow-y-auto py-4 px-4 bg-white/95 backdrop-blur-sm border-b border-gray-200/80 shadow-xl z-[100]'
          : 'absolute top-full left-0 mt-1 w-full md:min-w-[480px] md:max-w-[95vw] py-3 max-h-[70vh] overflow-y-auto rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-xl z-[100]'
      }
    >
      {kw && showDomestic && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">地点 / 地址联想</p>
          {poiLoading ? (
            <p className="text-sm text-gray-500 py-2">加载中...</p>
          ) : poiTips.length > 0 ? (
            <ul className="space-y-0.5">
              {poiTips.map((tip) => {
                const primary = tip.name || tip.district || '';
                const detail = tip.address || (tip.district ? `${tip.district}` : '');
                if (!primary && !detail) return null;
                // 用户端：搜的什么显示什么，不解析成门牌号格式
                const displayVal = tip.name || tip.district || '';
                return (
                  <li
                    key={tip.id || primary || detail}
                    role="option"
                    className="flex items-start gap-3 px-3 py-2.5 text-left rounded-lg hover:bg-gray-50 transition-colors cursor-pointer"
                    onClick={() => handleSelect(displayVal, { exact: true, location: tip.location })}
                  >
                    <span className="shrink-0 w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center mt-0.5">
                      <IoLocationOutline className="w-3.5 h-3.5 text-white" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-gray-800 truncate">{primary}</span>
                      {detail && <span className="block text-xs text-gray-500 mt-0.5 truncate">{detail}</span>}
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 py-2">暂无联想结果</p>
          )}
        </div>
      )}
      {!kw && onLocationClick && (
        <div className="mb-4 px-4">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onLocationClick(); onClose?.(); }}
            className="flex items-center gap-2 w-full px-3 py-2.5 text-left rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          >
            <LocationIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
            <span className="text-sm font-medium">我的位置</span>
          </button>
        </div>
      )}
      {popularPlaces.length > 0 && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">当地热门地点推荐</p>
          <ul className="space-y-0.5">
            {popularPlaces.map((place, i) => (
              <li
                key={`${place.name}-${i}`}
                role="option"
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-gray-100 transition-colors"
                onClick={() => handleSelect(place.name, { exact: true })}
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

      {recent.length > 0 && !(kw && showDomestic) && (
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
                onClick={() => handleRecentClick(r)}
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

      {hotels.length > 0 && !(kw && showDomestic) && (
        <div className="mb-4 px-4">
          <p className="text-sm font-medium text-gray-700 mb-2">酒店</p>
          <ul className="space-y-1">
            {hotels.map((h) => (
              <li
                key={h._id || h.name}
                role="option"
                className="px-3 py-2 text-sm text-gray-700 cursor-pointer rounded-lg hover:bg-blue-50"
                onClick={() => handleSelect(h.name, { exact: true })}
              >
                <span className="font-medium">{h.name}</span>
                {h.city && <span className="ml-2 text-gray-500">{h.city}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!kw && (domestic.length > 0 || overseas.length > 0) && (
        <div className="mb-4 px-4">
          <div className="flex items-center justify-between gap-3 mb-3">
            <p className="text-sm font-medium text-gray-700">
              {showDomestic ? '国内热门城市' : '海外热门城市'}
            </p>
            <div className="flex items-center gap-2 shrink-0">
              <span className={`text-xs font-medium select-none ${showDomestic ? 'text-gray-900' : 'text-gray-400'}`}>国内</span>
              <button
                type="button"
                role="switch"
                aria-checked={!showDomestic}
                onClick={(e) => { e.stopPropagation(); setShowDomestic((v) => !v); }}
                className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${showDomestic ? 'bg-gray-300' : 'bg-black'}`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${
                    showDomestic ? 'left-0.5' : 'left-[22px]'
                  }`}
                />
              </button>
              <span className={`text-xs font-medium select-none ${showDomestic ? 'text-gray-400' : 'text-gray-900'}`}>海外</span>
            </div>
          </div>
          {showDomestic && domestic.length > 0 && (
            <div className={`grid ${gridCols} gap-2`}>
              {domestic.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCityClick(c)}
                  className="px-2 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 text-center"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
          {!showDomestic && overseas.length > 0 && (
            <div className={`grid ${gridCols} gap-2`}>
              {overseas.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => handleCityClick(c)}
                  className="px-2 py-1.5 text-sm text-gray-700 rounded-lg hover:bg-gray-100 text-center"
                >
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );

  if (compact) {
    return createPortal(
      <>
        <div
          className="fixed inset-0 top-14 z-[99] bg-transparent"
          onClick={(e) => { e.stopPropagation(); onClose?.(); }}
          aria-hidden
        />
        {content}
      </>,
      document.body
    );
  }
  return content;
}
