/**
 * 百度地图相关工具（国内地图）
 * - 地理编码：地址 -> 经纬度（百度返回 BD-09，转为 WGS84 供 Leaflet 使用）
 * - 与 leaflet.chinatmsproviders 配合时，瓦片已纠偏为 WGS84，点位直接用 WGS84 即可
 */

const BAIDU_GEOCODE_URL = 'https://api.map.baidu.com/geocoding/v3/';

/**
 * 百度地理编码：根据地址/城市名获取经纬度
 * 百度返回 BD-09，转为 WGS84 以便在 Leaflet（纠偏后百度瓦片）中使用
 * @param {string} ak - 百度地图 AK
 * @param {string} address - 地址或城市名
 * @returns {{ lat: number, lng: number } | null} WGS84
 */
export async function geocodeBaidu(ak, address) {
  const q = String(address || '').trim();
  if (!q) return null;
  const key = (ak || import.meta.env.VITE_BAIDU_AK || '').trim();
  if (!key) {
    console.warn('[baidu] 未配置 VITE_BAIDU_AK，地理编码不可用');
    return null;
  }
  const url = `${BAIDU_GEOCODE_URL}?address=${encodeURIComponent(q)}&output=json&ak=${encodeURIComponent(key)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== 0 || !data.result?.location) return null;
    const { lng, lat } = data.result.location; // 百度返回 BD-09
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
    const [wgsLat, wgsLng] = bd09ToWgs84(lat, lng);
    return { lat: wgsLat, lng: wgsLng };
  } catch (e) {
    console.warn('[baidu] geocode error', e);
    return null;
  }
}

/**
 * BD-09 转 GCJ-02
 */
function bd09ToGcj02(bdLat, bdLng) {
  if (!Number.isFinite(bdLat) || !Number.isFinite(bdLng)) return [bdLat, bdLng];
  const x = bdLng - 0.0065;
  const y = bdLat - 0.006;
  const z = Math.sqrt(x * x + y * y) - 0.00002 * Math.sin(y * Math.PI * 3000 / 180);
  const theta = Math.atan2(y, x) - 0.000003 * Math.cos(x * Math.PI * 3000 / 180);
  const gcjLng = z * Math.cos(theta);
  const gcjLat = z * Math.sin(theta);
  return [gcjLat, gcjLng];
}

/**
 * GCJ-02 转 WGS84（近似）
 */
function gcj02ToWgs84(gcjLat, gcjLng) {
  if (!Number.isFinite(gcjLat) || !Number.isFinite(gcjLng)) return [gcjLat, gcjLng];
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  function transformLat(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }
  function transformLng(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
    return ret;
  }
  let dLat = transformLat(gcjLng - 105.0, gcjLat - 35.0);
  let dLng = transformLng(gcjLng - 105.0, gcjLat - 35.0);
  const radLat = (gcjLat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  const wgsLat = gcjLat - dLat;
  const wgsLng = gcjLng - dLng;
  return [wgsLat, wgsLng];
}

/**
 * BD-09 转 WGS84（先转 GCJ-02 再转 WGS84），用于把百度地理编码结果放到 Leaflet 纠偏瓦片上
 */
export function bd09ToWgs84(bdLat, bdLng) {
  const [gcjLat, gcjLng] = bd09ToGcj02(bdLat, bdLng);
  return gcj02ToWgs84(gcjLat, gcjLng);
}
