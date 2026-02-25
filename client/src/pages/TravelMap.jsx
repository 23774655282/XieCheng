import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { loadAMap } from '../utils/loadAmap';
import { geocodeAmap, wgs84ToGcj02 } from '../utils/amap';
import { clusterHotels } from '../utils/mapCluster';
import { useAppContext } from '../context/AppContext';

const DEFAULT_CENTER = [39.9042, 116.4074]; // 北京 [lat, lng] GCJ-02
const DEFAULT_ZOOM = 4;

/** 从高德 Bounds 得到 { minLat, maxLat, minLng, maxLng } */
function boundsToParams(bounds) {
  if (!bounds) return null;
  const sw = bounds.getSouthWest && bounds.getSouthWest();
  const ne = bounds.getNorthEast && bounds.getNorthEast();
  if (!sw || !ne) return null;
  const lng1 = typeof sw.getLng === 'function' ? sw.getLng() : sw.lng;
  const lat1 = typeof sw.getLat === 'function' ? sw.getLat() : sw.lat;
  const lng2 = typeof ne.getLng === 'function' ? ne.getLng() : ne.lng;
  const lat2 = typeof ne.getLat === 'function' ? ne.getLat() : ne.lat;
  return {
    minLat: Math.min(lat1, lat2),
    maxLat: Math.max(lat1, lat2),
    minLng: Math.min(lng1, lng2),
    maxLng: Math.max(lng1, lng2),
  };
}

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
  const [mapReady, setMapReady] = useState(false);
  const [zoomVersion, setZoomVersion] = useState(0);
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const markersRef = useRef([]);
  const boundsRef = useRef(null);
  const onBoundsChangeRef = useRef(null);

  useEffect(() => {
    axios.get('/api/hotels/public/cities')
      .then(({ data }) => data.success && data.cities && setCities(data.cities || []))
      .catch(() => {});
  }, [axios]);

  useEffect(() => {
    if (targetPosition) {
      setMapCenter(targetPosition);
      setMapZoom(15);
    }
  }, [targetPosition?.[0], targetPosition?.[1]]);

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

  onBoundsChangeRef.current = onBoundsChange;

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

  // 初始化高德地图
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    let map = null;
    let debounceTimer = null;
    loadAMap()
      .then((AMap) => {
        map = new AMap.Map(el, {
          center: [mapCenter[1], mapCenter[0]],
          zoom: mapZoom,
          viewMode: '2D',
        });
        mapRef.current = map;

        function emitBounds() {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const b = map.getBounds();
            const params = boundsToParams(b);
            if (params) onBoundsChangeRef.current(params);
          }, 350);
        }
        map.on('moveend', () => {
          emitBounds();
          setZoomVersion((v) => v + 1);
        });
        emitBounds();
        setMapReady(true);
      })
      .catch((err) => {
        console.error('[TravelMap] loadAMap failed', err);
      });
    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (map) {
        map.destroy();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // 同步 mapCenter / mapZoom 到地图（搜索或 URL 变化）
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    map.setCenter([mapCenter[1], mapCenter[0]]);
    map.setZoom(Math.max(4, Math.min(18, mapZoom)));
  }, [mapReady, mapCenter[0], mapCenter[1], mapZoom]);

  // 目标点 + 酒店聚合/单点 标记
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const AMap = window.AMap;
    const zoom = typeof map.getZoom === 'function' ? map.getZoom() : mapZoom;
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
    if (targetPosition && targetPosition.length >= 2) {
      const marker = new AMap.Marker({
        position: [targetPosition[1], targetPosition[0]],
        map,
        zIndex: 1000,
      });
      markersRef.current.push(marker);
    }
    const { clusters, singles } = clusterHotels(hotels, zoom, wgs84ToGcj02);
    clusters.forEach((c) => {
      const div = document.createElement('div');
      div.className = 'amap-cluster-marker';
      div.innerHTML = `<span style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#2563eb;color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${c.count}</span>`;
      const markerOpt = {
        position: [c.centerLng, c.centerLat],
        content: div,
        map,
      };
      if (typeof AMap.Pixel === 'function') markerOpt.offset = new AMap.Pixel(-18, -18);
      const marker = new AMap.Marker(markerOpt);
      marker.on('click', () => {
        setMapCenter([c.centerLat, c.centerLng]);
        setMapZoom(Math.min(18, zoom + 2));
      });
      markersRef.current.push(marker);
    });
    singles.forEach(({ hotel: h, lat, lng }) => {
      const marker = new AMap.Marker({
        position: [lng, lat],
        map,
      });
      marker.on('click', () => {
        setSelectedHotel(h);
        setMapCenter([lat, lng]);
        setMapZoom(16);
      });
      markersRef.current.push(marker);
    });
  }, [mapReady, targetPosition, hotels, zoomVersion, mapZoom]);

  return (
    <div className="flex flex-col h-screen pt-16">
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
          <div ref={containerRef} className="w-full h-full" />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
              地图加载中…
            </div>
          )}
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
