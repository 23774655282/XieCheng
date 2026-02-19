import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAppContext } from '../context/AppContext';
import { geocodeAmap, wgs84ToGcj02, AMAP_TILE_URL } from '../utils/amap';
import 'leaflet/dist/leaflet.css';

// 修复 Leaflet 默认 marker 图标在打包后路径问题
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const DEFAULT_CENTER = [39.9042, 116.4074]; // 北京，GCJ-02
const DEFAULT_ZOOM = 4;

/** 去掉右下角版权里的 "Leaflet" 前缀 */
function AttributionNoLeafletPrefix() {
  const map = useMap();
  useEffect(() => {
    if (map.attributionControl) map.attributionControl.setPrefix('');
  }, [map]);
  return null;
}

/** 地图内飞行到指定位置 */
function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length >= 2) map.flyTo(center, typeof zoom === 'number' ? zoom : 12, { duration: 1.2 });
  }, [map, center, zoom]);
  return null;
}

/** 监听地图视野变化，防抖后回调 bounds */
function MapBoundsListener({ onBoundsChange }) {
  const map = useMap();
  const debounceRef = useRef(null);
  const onBoundsChangeRef = useRef(onBoundsChange);
  onBoundsChangeRef.current = onBoundsChange;

  useEffect(() => {
    function updateBounds() {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const b = map.getBounds();
        const sw = b.getSouthWest();
        const ne = b.getNorthEast();
        onBoundsChangeRef.current({
          minLat: sw.lat,
          maxLat: ne.lat,
          minLng: sw.lng,
          maxLng: ne.lng,
        });
      }, 350);
    }
    updateBounds();
    map.on('moveend', updateBounds);
    return () => {
      map.off('moveend', updateBounds);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [map]);
  return null;
}

/** 酒店小图标 */
const hotelIcon = new L.DivIcon({
  className: 'hotel-marker',
  html: `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white" style="font-size:18px">📍</span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

function HomeMap() {
  const { axios, navigate } = useAppContext();
  const [expanded, setExpanded] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [mapCenter, setMapCenter] = useState(DEFAULT_CENTER);
  const [mapZoom, setMapZoom] = useState(DEFAULT_ZOOM);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const searchInputRef = useRef(null);

  const fetchHotelsByBounds = useCallback(async (bounds) => {
    if (!bounds || typeof bounds.minLat !== 'number' || typeof bounds.maxLng !== 'number') return;
    setLoadingHotels(true);
    try {
      const { data } = await axios.get('/api/hotels/public/map', {
        params: {
          minLat: bounds.minLat,
          maxLat: bounds.maxLat,
          minLng: bounds.minLng,
          maxLng: bounds.maxLng,
        },
      });
      if (data.success && Array.isArray(data.hotels)) {
        setHotels(data.hotels);
      } else {
        setHotels([]);
      }
    } catch (_) {
      setHotels([]);
    } finally {
      setLoadingHotels(false);
    }
  }, [axios]);

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) return;
    setLoadingGeo(true);
    try {
      const coords = await geocodeAmap(import.meta.env.VITE_AMAP_KEY, q);
      if (coords) {
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(12);
      }
    } finally {
      setLoadingGeo(false);
    }
  };

  useEffect(() => {
    if (expanded) searchInputRef.current?.focus();
  }, [expanded]);

  const openExpanded = () => {
    setExpanded(true);
    setSelectedHotel(null);
    setHotels([]);
  };

  const closeExpanded = () => {
    setExpanded(false);
    setSelectedHotel(null);
  };

  return (
    <>
      {/* 首页右下角小地图：点击放大 */}
      <div
        className="fixed bottom-4 right-4 z-[900] w-[280px] h-[180px] sm:w-[320px] sm:h-[200px] rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100 cursor-pointer group"
        role="button"
        tabIndex={0}
        onClick={openExpanded}
        onKeyDown={(e) => e.key === 'Enter' && openExpanded()}
      >
        <div className="relative w-full h-full">
          <MapContainer
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            className="w-full h-full rounded-xl"
            zoomControl={false}
            dragging={false}
            scrollWheelZoom={false}
            doubleClickZoom={false}
          >
            <TileLayer
              attribution='&copy; 高德地图'
              url={AMAP_TILE_URL}
              subdomains="1234"
            />
            <AttributionNoLeafletPrefix />
          </MapContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 group-hover:bg-black/35 transition rounded-xl">
            <span className="text-white text-sm font-medium drop-shadow text-center px-2">点击查看酒店位置</span>
          </div>
        </div>
      </div>

      {/* 放大后的全屏地图层 */}
      {expanded && (
        <div className="fixed inset-0 z-[9999] flex flex-col bg-white">
          <div className="flex-shrink-0 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-gray-200 bg-white">
            <div className="flex items-center gap-2 w-full min-h-[44px]">
              <button
                type="button"
                onClick={closeExpanded}
                className="flex-shrink-0 p-2.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 touch-manipulation"
                aria-label="关闭"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <input
                ref={searchInputRef}
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="输入城市或地点，如：北京、上海"
                className="flex-1 min-w-0 rounded-xl border border-gray-200 px-4 py-2.5 text-base sm:text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={loadingGeo}
                className="flex-shrink-0 px-4 py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50 min-h-[44px] touch-manipulation"
              >
                {loadingGeo ? '搜索中…' : '定位'}
              </button>
            </div>
          </div>
          <div className="flex-1 flex flex-col sm:flex-row min-h-0 overflow-hidden">
            <div className="flex-1 min-h-0 min-w-0 relative">
              <MapContainer
                center={mapCenter}
                zoom={mapZoom}
                className="w-full h-full"
              >
                <TileLayer
                  attribution='&copy; 高德地图'
                  url={AMAP_TILE_URL}
                  subdomains="1234"
                />
                <AttributionNoLeafletPrefix />
                <MapFlyTo center={mapCenter} zoom={mapZoom} />
                <MapBoundsListener onBoundsChange={fetchHotelsByBounds} />
                {hotels.map((h) => {
                  const [lat, lng] = wgs84ToGcj02(h._lat, h._lng);
                  return (
                    <Marker
                      key={h._id}
                      position={[lat, lng]}
                      icon={hotelIcon}
                      eventHandlers={{
                        click: () => setSelectedHotel(h),
                      }}
                    />
                  );
                })}
              </MapContainer>
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:left-4 sm:max-w-[280px] rounded-lg bg-white/95 shadow px-3 py-2 text-sm text-gray-600 z-[1000]">
                {loadingHotels ? '加载酒店中…' : `当前范围共 ${hotels.length} 家酒店`}
              </div>
            </div>
            {/* 右侧/底部弹窗：酒店信息；移动端底部滑出，桌面端右侧 */}
            {selectedHotel && (
              <div className="w-full sm:w-96 flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-200 bg-white shadow-xl flex flex-col overflow-hidden max-h-[70vh] sm:max-h-none">
                <div className="flex items-center justify-between p-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-800">酒店信息</h3>
                  <button
                    type="button"
                    onClick={() => setSelectedHotel(null)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {selectedHotel.images && selectedHotel.images[0] && (
                    <img
                      src={selectedHotel.images[0]}
                      alt={selectedHotel.name}
                      className="w-full h-40 object-cover rounded-lg mb-4"
                    />
                  )}
                  <h4 className="text-lg font-semibold text-gray-800 mb-1">{selectedHotel.name}</h4>
                  {selectedHotel.starRating != null && (
                    <p className="text-sm text-amber-600 mb-2">{selectedHotel.starRating} 星级</p>
                  )}
                  <p className="text-sm text-gray-600 mb-2">{selectedHotel.address}</p>
                  <p className="text-sm text-gray-500 mb-4">{selectedHotel.city}</p>
                  <button
                    type="button"
                    onClick={() => { navigate(`/hotels/${selectedHotel._id}`); closeExpanded(); }}
                    className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
                  >
                    查看详情与预订
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default HomeMap;
