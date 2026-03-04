import React, { useState, useEffect, useRef, useCallback } from 'react';
import { loadAMap, setupMoveendDebounce } from '../utils/loadAmap';
import { geocodeAmap, wgs84ToGcj02, getDistrictBounds } from '../utils/amap';
import { useAppContext } from '../context/AppContext';

const DEFAULT_CENTER = [39.9042, 116.4074];
const DEFAULT_ZOOM = 4;

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
  const smallContainerRef = useRef(null);
  const bigContainerRef = useRef(null);
  const smallMapRef = useRef(null);
  const bigMapRef = useRef(null);
  const bigClusterRef = useRef(null);
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

  const handleCloseHotelCard = useCallback(async () => {
    const hotel = selectedHotel;
    setSelectedHotel(null);
    const map = bigMapRef.current;
    if (!map || !hotel?.city) return;
    const AMap = window.AMap;
    if (!AMap) return;
    const city = String(hotel.city || '').trim();
    if (!city) return;
    try {
      const result = await getDistrictBounds(import.meta.env.VITE_AMAP_KEY, city);
      if (result?.bounds && Array.isArray(result.bounds) && result.bounds.length >= 2) {
        const [[minLng, minLat], [maxLng, maxLat]] = result.bounds;
        if (Number.isFinite(minLng) && Number.isFinite(maxLng)) {
          const bounds = new AMap.Bounds([minLng, minLat], [maxLng, maxLat]);
          map.setBounds(bounds);
          return;
        }
      }
    } catch (_) {}
    const lat = hotel._lat ?? hotel.latitude;
    const lng = hotel._lng ?? hotel.longitude;
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      const [gcjLat, gcjLng] = wgs84ToGcj02(lat, lng);
      map.setCenter([gcjLng, gcjLat]);
      map.setZoom(12);
    }
  }, [selectedHotel]);

  const handleSearch = async () => {
    const q = searchInput.trim();
    if (!q) return;
    setLoadingGeo(true);
    try {
      const key = import.meta.env.VITE_AMAP_KEY;
      let result = await getDistrictBounds(key, q);
      if (result?.bounds && Array.isArray(result.bounds) && result.bounds.length >= 2) {
        const map = bigMapRef.current;
        const AMap = window.AMap;
        if (map && AMap) {
          const [[minLng, minLat], [maxLng, maxLat]] = result.bounds;
          if (Number.isFinite(minLng) && Number.isFinite(maxLng)) {
            map.setBounds(new AMap.Bounds([minLng, minLat], [maxLng, maxLat]));
            setLoadingGeo(false);
            return;
          }
        }
      }
      const coords = await geocodeAmap(key, q);
      if (coords?.city) {
        result = await getDistrictBounds(key, coords.city);
        if (result?.bounds && Array.isArray(result.bounds) && result.bounds.length >= 2) {
          const map = bigMapRef.current;
          const AMap = window.AMap;
          if (map && AMap) {
            const [[minLng, minLat], [maxLng, maxLat]] = result.bounds;
            if (Number.isFinite(minLng) && Number.isFinite(maxLng)) {
              map.setBounds(new AMap.Bounds([minLng, minLat], [maxLng, maxLat]));
              setLoadingGeo(false);
              return;
            }
          }
        }
      }
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

  // 放大后的全屏地图（防抖与按视口请求由 setupMoveendDebounce 统一处理）
  useEffect(() => {
    if (!expanded) return;
    const el = bigContainerRef.current;
    if (!el) return;
    let map = null;
    let cleanup = null;
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
        cleanup = setupMoveendDebounce(map, (params) => fetchRef.current(params), 350);
        setBigMapReady(true);
      })
      .catch((err) => console.error('[HomeMap] big loadAMap failed', err));

    return () => {
      if (cleanup) cleanup();
      if (bigClusterRef.current) {
        bigClusterRef.current.setMap(null);
        bigClusterRef.current = null;
      }
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
    if (!map || !bigMapReady || !window.AMap) return;

    const AMap = window.AMap;

    const destroyCluster = () => {
      if (bigClusterRef.current) {
        bigClusterRef.current.setMap(null);
        bigClusterRef.current = null;
      }
    };

    if (hotels.length === 0) {
      destroyCluster();
      return;
    }

    const points = hotels
      .filter((h) => h._lat != null && h._lng != null && Number.isFinite(h._lat) && Number.isFinite(h._lng))
      .map((h) => {
        const [lat, lng] = wgs84ToGcj02(h._lat, h._lng);
        return { lnglat: [lng, lat], extData: { hotel: h } };
      });

    if (points.length === 0) {
      destroyCluster();
      return;
    }

    map.plugin(['AMap.MarkerCluster'], () => {
      destroyCluster();
      const cluster = new AMap.MarkerCluster(map, points, {
        gridSize: 60,
        renderClusterMarker: (context) => {
          const count = context.count;
          context.marker.setContent(
            `<div style="display:flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#2563eb;color:#fff;font-weight:700;font-size:14px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,0.3);">${count}</div>`
          );
          if (typeof AMap.Pixel === 'function') {
            context.marker.setOffset(new AMap.Pixel(-18, -18));
          }
        },
        renderMarker: (context) => {
          context.marker.setIcon(
            new AMap.Icon({
              image: '//a.amap.com/jsapi_demos/static/demo-center/icons/poi-marker-red.png',
              size: new AMap.Size(24, 36),
              imageSize: new AMap.Size(24, 36),
            })
          );
          if (typeof AMap.Pixel === 'function') {
            context.marker.setOffset(new AMap.Pixel(-12, -36));
          }
        },
      });

      cluster.on('click', (ev) => {
        const data = ev.clusterData || [];
        const getLatLng = (p) => {
          const ll = p?.lnglat;
          if (Array.isArray(ll)) return { lat: ll[1], lng: ll[0] };
          if (ll && (ll.lat != null || ll.lng != null)) return { lat: ll.lat, lng: ll.lng };
          return null;
        };
        if (data.length > 1) {
          const coords = data.map(getLatLng).filter(Boolean);
          if (coords.length > 0) {
            const lat = coords.reduce((s, c) => s + c.lat, 0) / coords.length;
            const lng = coords.reduce((s, c) => s + c.lng, 0) / coords.length;
            setMapCenter([lat, lng]);
            const zoom = typeof map.getZoom === 'function' ? map.getZoom() : 12;
            setMapZoom(Math.min(18, zoom + 2));
          }
        } else if (data.length === 1) {
          const hotel = data[0].extData?.hotel;
          const pos = getLatLng(data[0]);
          if (hotel) setSelectedHotel(hotel);
          if (pos) {
            setMapCenter([pos.lat, pos.lng]);
            setMapZoom(16);
          }
        }
      });

      bigClusterRef.current = cluster;
    });

    return destroyCluster;
  }, [bigMapReady, hotels]);

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
                    onClick={handleCloseHotelCard}
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
