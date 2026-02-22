import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { geocodeAmap, wgs84ToGcj02, AMAP_TILE_URL } from '../utils/amap';
import 'leaflet/dist/leaflet.css';

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

function MapFlyTo({ center, zoom }) {
  const map = useMap();
  useEffect(() => {
    if (center && center.length >= 2) map.flyTo(center, typeof zoom === 'number' ? zoom : 12, { duration: 1.2 });
  }, [map, center, zoom]);
  return null;
}

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

const hotelIcon = new L.DivIcon({
  className: 'hotel-marker',
  html: `<span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white shadow-lg border-2 border-white" style="font-size:18px">📍</span>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const targetIcon = new L.DivIcon({
  className: 'target-marker',
  html: `<span class="inline-flex items-center justify-center w-10 h-10 rounded-full bg-red-500 text-white shadow-lg border-2 border-white" style="font-size:20px">📍</span>`,
  iconSize: [40, 40],
  iconAnchor: [20, 20],
});

function TravelMap() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { axios } = useAppContext();
  const [searchInput, setSearchInput] = useState('');
  const latParam = searchParams.get('lat');
  const lngParam = searchParams.get('lng');
  const qParam = searchParams.get('q') || searchParams.get('address');
  const hasLatLng = latParam != null && lngParam != null && !Number.isNaN(parseFloat(latParam)) && !Number.isNaN(parseFloat(lngParam));
  const rawLat = hasLatLng ? parseFloat(latParam) : null;
  const rawLng = hasLatLng ? parseFloat(lngParam) : null;
  const targetPosition = hasLatLng ? wgs84ToGcj02(rawLat, rawLng) : null;
  const initialCenter = targetPosition || DEFAULT_CENTER;
  const [mapCenter, setMapCenter] = useState(initialCenter);
  const [mapZoom, setMapZoom] = useState(hasLatLng ? 15 : DEFAULT_ZOOM);
  const [hotels, setHotels] = useState([]);
  const [selectedHotel, setSelectedHotel] = useState(null);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const [loadingHotels, setLoadingHotels] = useState(false);
  const [cities, setCities] = useState([]);
  const [filterCity, setFilterCity] = useState('');
  const [filterStar, setFilterStar] = useState('');
  const boundsRef = useRef(null);

  useEffect(() => {
    axios.get('/api/hotels/public/cities')
      .then(({ data }) => data.success && data.cities && setCities(data.cities || []))
      .catch(() => {});
  }, [axios]);

  // 当 URL 的 lat/lng 变化时，同步地图中心与缩放
  useEffect(() => {
    if (targetPosition) {
      setMapCenter(targetPosition);
      setMapZoom(15);
    }
  }, [targetPosition?.[0], targetPosition?.[1]]);

  // 支持通过 ?q=地址 或 ?address=地址 定位，与首页旅行地图使用相同 geocodeAmap API
  useEffect(() => {
    const q = (qParam || '').trim();
    if (!q) return;
    (async () => {
      setLoadingGeo(true);
      try {
        const coords = await geocodeAmap(import.meta.env.VITE_AMAP_KEY, q);
        if (coords) {
          setMapCenter([coords.lat, coords.lng]);
          setMapZoom(15);
        }
      } finally {
        setLoadingGeo(false);
      }
    })();
  }, [qParam]);

  const fetchHotels = useCallback(async (bounds, city, star) => {
    if (!bounds || typeof bounds.minLat !== 'number') return;
    setLoadingHotels(true);
    try {
      const params = {
        minLat: bounds.minLat,
        maxLat: bounds.maxLat,
        minLng: bounds.minLng,
        maxLng: bounds.maxLng,
      };
      if (city && city.trim()) params.city = city.trim();
      if (star !== '' && star != null) params.starRating = Number(star);
      const { data } = await axios.get('/api/hotels/public/map', { params });
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

  const onBoundsChange = useCallback((b) => {
    boundsRef.current = b;
    fetchHotels(b, filterCity, filterStar);
  }, [filterCity, filterStar, fetchHotels]);

  useEffect(() => {
    if (boundsRef.current) fetchHotels(boundsRef.current, filterCity, filterStar);
  }, [filterCity, filterStar, fetchHotels]);

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

  return (
    <div className="flex flex-col h-screen pt-16">
      {/* 搜索栏：移动端两行（搜索行 + 筛选行），桌面端一行 */}
      <div className="flex-shrink-0 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-2 w-full sm:flex-1 sm:min-w-0 min-h-[44px]">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex-shrink-0 p-2.5 -ml-1 rounded-lg hover:bg-gray-100 text-gray-600 touch-manipulation"
            aria-label="返回"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="输入城市或地点定位"
            className="flex-1 min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleSearch}
            disabled={loadingGeo}
            className="flex-shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm text-white hover:bg-blue-700 disabled:opacity-50 min-h-[44px] touch-manipulation"
          >
            {loadingGeo ? '定位中…' : '定位'}
          </button>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap min-h-[44px]">
          <label className="text-sm text-gray-600 shrink-0">城市</label>
          <select
            value={filterCity}
            onChange={(e) => setFilterCity(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">全部</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="text-sm text-gray-600 shrink-0">星级</label>
          <select
            value={filterStar}
            onChange={(e) => setFilterStar(e.target.value)}
            className="flex-1 sm:flex-none min-w-0 rounded-lg border border-gray-200 px-3 py-2.5 text-base sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            <option value="">全部</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>{n} 星</option>
            ))}
          </select>
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
            <MapBoundsListener onBoundsChange={onBoundsChange} />
            {targetPosition && (
              <Marker position={targetPosition} icon={targetIcon} zIndexOffset={1000} />
            )}
            {hotels.map((h) => {
              const [lat, lng] = wgs84ToGcj02(h._lat, h._lng);
              return (
                <Marker
                  key={h._id}
                  position={[lat, lng]}
                  icon={hotelIcon}
                  eventHandlers={{ click: () => setSelectedHotel(h) }}
                />
              );
            })}
          </MapContainer>
          <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:left-4 sm:max-w-[280px] rounded-lg bg-white/95 shadow px-3 py-2 text-sm text-gray-600 z-[1000]">
            {loadingHotels ? '加载中…' : `当前范围 ${hotels.length} 家酒店`}
          </div>
        </div>
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
              {selectedHotel.images?.[0] && (
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
                onClick={() => navigate(`/hotels/${selectedHotel._id}`)}
                className="w-full py-2.5 rounded-xl bg-blue-600 text-white font-medium hover:bg-blue-700"
              >
                查看详情与预订
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default TravelMap;
