/**
 * 动态加载高德 JS API 2.0，按 key 只加载一次
 * 用于 TravelMap / HomeMap 等使用 AMap 的页面
 */

let loadPromise = null;

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
