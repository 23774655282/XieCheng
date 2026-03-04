/**
 * 动态加载高德 JS API 2.0，按 key 只加载一次
 * 用于 TravelMap / HomeMap 等使用 AMap 的页面
 * 提供 setupMoveendDebounce：地图移动防抖 + 按视口 bounds 回调
 */

let loadPromise = null;

/** 从高德 Bounds 得到 { minLat, maxLat, minLng, maxLng } */
function boundsToParams(bounds) {
  if (!bounds) return null;
  const sw = bounds.getSouthWest?.();
  const ne = bounds.getNorthEast?.();
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

/**
 * 监听 map 的 moveend，防抖后按视口 bounds 调用回调（解决地图拖动/缩放时的频繁请求）
 * @param {AMap.Map} map - 高德地图实例
 * @param {(params: { minLat, maxLat, minLng, maxLng }) => void} onBoundsChange - 视口变化回调
 * @param {number} [delay=350] - 防抖延迟 ms
 * @returns {() => void} 取消监听的 cleanup 函数
 */
export function setupMoveendDebounce(map, onBoundsChange, delay = 350) {
  if (!map || typeof onBoundsChange !== 'function') return () => {};
  let debounceTimer = null;

  function emitBounds() {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const b = map.getBounds?.();
      const params = boundsToParams(b);
      if (params) onBoundsChange(params);
    }, delay);
  }

  map.on('moveend', emitBounds);
  emitBounds(); // 初始化时触发一次

  return () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    map.off?.('moveend', emitBounds);
  };
}

/**
 * 加载高德地图 JS API，返回 Promise<typeof window.AMap>
 * @param {string} [key] - 高德 Web端(JS API) Key，默认取 VITE_AMAP_JS_KEY（缺省时回退 VITE_AMAP_KEY）
 */
export function loadAMap(key) {
  const k = (key || import.meta.env.VITE_AMAP_JS_KEY || import.meta.env.VITE_AMAP_KEY || '').trim();
  if (!k) {
    return Promise.reject(new Error('未配置 VITE_AMAP_JS_KEY / VITE_AMAP_KEY'));
  }
  if (typeof window !== 'undefined' && window.AMap) {
    return Promise.resolve(window.AMap);
  }
  if (loadPromise) {
    return loadPromise;
  }
  loadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(k)}`;
    script.onload = () => {
      if (window.AMap) {
        resolve(window.AMap);
      } else {
        reject(new Error('AMap 未挂载到 window'));
      }
    };
    script.onerror = () => reject(new Error('高德地图脚本加载失败'));
    document.head.appendChild(script);
  });
  return loadPromise;
}
