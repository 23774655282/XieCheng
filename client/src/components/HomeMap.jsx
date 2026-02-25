import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadAMap } from '../utils/loadAmap';
import { geocodeAmap, wgs84ToGcj02 } from '../utils/amap';
import { clusterHotels } from '../utils/mapCluster';
import { useAppContext } from '../context/AppContext';

const DEFAULT_CENTER = [39.9042, 116.4074];
const DEFAULT_ZOOM = 4;

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
  const [smallMapReady, setSmallMapReady] = useState(false);
  const [bigMapReady, setBigMapReady] = useState(false);
  const [bigMapZoomVersion, setBigMapZoomVersion] = useState(0);
  const smallContainerRef = useRef(null);
  const bigContainerRef = useRef(null);
  const smallMapRef = useRef(null);
  const bigMapRef = useRef(null);
  const bigMarkersRef = useRef([]);
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

  // 首页右下角小地图（固定视野、不可拖拽缩放）
  useEffect(() => {
    const el = smallContainerRef.current;
    if (!el) return;
    loadAMap()
      .then((AMap) => {
        const map = new AMap.Map(el, {
          center: [DEFAULT_CENTER[1], DEFAULT_CENTER[0]],
          zoom: DEFAULT_ZOOM,
          viewMode: '2D',
          dragEnable: false,
          zoomEnable: false,
          scrollWheel: false,
          doubleClickZoom: false,
        });
        smallMapRef.current = map;
        setSmallMapReady(true);
      })
      .catch((err) => console.error('[HomeMap] small loadAMap failed', err));
    return () => {
      if (smallMapRef.current) {
        smallMapRef.current.destroy();
        smallMapRef.current = null;
      }
      setSmallMapReady(false);
    };
  }, []);

  // 放大后的全屏地图
  useEffect(() => {
    if (!expanded) return;
    const el = bigContainerRef.current;
    if (!el) return;
    let map = null;
    let debounceTimer = null;
    const fetchRef = { current: fetchHotelsByBounds };
    fetchRef.current = fetchHotelsByBounds;

    loadAMap()
      .then((AMap) => {
        map = new AMap.Map(el, {
          center: [mapCenter[1], mapCenter[0]],
          zoom: mapZoom,
          viewMode: '2D',
        });
        bigMapRef.current = map;

        function emitBounds() {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            const b = map.getBounds();
            const params = boundsToParams(b);
            if (params) fetchRef.current(params);
          }, 350);
        }
        map.on('moveend', () => {
          emitBounds();
          setBigMapZoomVersion((v) => v + 1);
        });
        emitBounds();
        setBigMapReady(true);
      })
      .catch((err) => console.error('[HomeMap] big loadAMap failed', err));

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      bigMarkersRef.current.forEach((m) => m.setMap(null));
      bigMarkersRef.current = [];
      if (map) {
        map.destroy();
        bigMapRef.current = null;
      }
      setBigMapReady(false);
    };
  }, [expanded]);

  useEffect(() => {
    const map = bigMapRef.current;
    if (!map || !bigMapReady) return;
    map.setCenter([mapCenter[1], mapCenter[0]]);
    map.setZoom(Math.max(4, Math.min(18, mapZoom)));
  }, [bigMapReady, mapCenter[0], mapCenter[1], mapZoom]);

  useEffect(() => {
    const map = bigMapRef.current;
    if (!map || !bigMapReady) return;
    const AMap = window.AMap;
    const zoom = typeof map.getZoom === 'function' ? map.getZoom() : mapZoom;
    bigMarkersRef.current.forEach((m) => m.setMap(null));
    bigMarkersRef.current = [];
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
      bigMarkersRef.current.push(marker);
    });
    singles.forEach(({ hotel: h, lat, lng }) => {
      const marker = new AMap.Marker({ position: [lng, lat], map });
      marker.on('click', () => {
        setSelectedHotel(h);
        setMapCenter([lat, lng]);
        setMapZoom(16);
      });
      bigMarkersRef.current.push(marker);
    });
  }, [bigMapReady, hotels, bigMapZoomVersion, mapZoom]);

  return (
    <>
      <div
        className="fixed bottom-4 right-4 z-[900] w-[280px] h-[180px] sm:w-[320px] sm:h-[200px] rounded-xl overflow-hidden border border-gray-200 shadow-lg bg-gray-100 cursor-pointer group"
        role="button"
        tabIndex={0}
        onClick={openExpanded}
        onKeyDown={(e) => e.key === 'Enter' && openExpanded()}
      >
        <div className="relative w-full h-full">
          <div ref={smallContainerRef} className="w-full h-full rounded-xl" />
          {!smallMapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 text-gray-500 text-sm">
              加载中…
            </div>
          )}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/25 group-hover:bg-black/35 transition rounded-xl">
            <span className="text-white text-sm font-medium drop-shadow text-center px-2">点击查看酒店位置</span>
          </div>
        </div>
      </div>

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
              <div ref={bigContainerRef} className="w-full h-full" />
              {!bigMapReady && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
                  地图加载中…
                </div>
              )}
              <div className="absolute bottom-3 left-3 right-3 sm:right-auto sm:left-4 sm:max-w-[280px] rounded-lg bg-white/95 shadow px-3 py-2 text-sm text-gray-600 z-[1000]">
                {loadingHotels ? '加载酒店中…' : `当前范围共 ${hotels.length} 家酒店`}
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
