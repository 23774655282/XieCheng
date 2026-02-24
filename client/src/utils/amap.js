/**
 * 高德地图相关工具（国内地图）
 * - 地理编码：地址 -> 经纬度（高德使用 GCJ-02 坐标系）
 * - WGS84 转 GCJ-02：若后端坐标为 WGS84，需转换后再在高德瓦片上显示
 */

const AMAP_GEOCODE_URL = 'https://restapi.amap.com/v3/geocode/geo';

/**
 * 高德地理编码：根据地址/城市名获取经纬度（GCJ-02）
 * @param {string} key - 高德 Web 服务 Key
 * @param {string} address - 地址或城市名，如 "北京"、"上海市浦东新区"
 * @returns {{ lat: number, lng: number } | null}
 */
export async function geocodeAmap(key, address) {
  const q = String(address || '').trim();
  if (!q) return null;
  const k = (key || import.meta.env.VITE_AMAP_KEY || '').trim();
  if (!k) {
    console.warn('[amap] 未配置 VITE_AMAP_KEY，地理编码不可用');
    return null;
  }
  const url = `${AMAP_GEOCODE_URL}?address=${encodeURIComponent(q)}&key=${encodeURIComponent(k)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== '1' || !data.geocodes?.length) return null;
    const loc = data.geocodes[0].location; // "lng,lat"
    const [lng, lat] = loc.split(',').map(Number);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
    return null;
  } catch (e) {
    console.warn('[amap] geocode error', e);
    return null;
  }
}

/**
 * WGS84 坐标转 GCJ-02（火星坐标），用于在高德瓦片上正确显示
 * @param {number} wgsLat - WGS84 纬度
 * @param {number} wgsLng - WGS84 经度
 * @returns {[number, number]} [lat, lng] GCJ-02
 */
export function wgs84ToGcj02(wgsLat, wgsLng) {
  if (!Number.isFinite(wgsLat) || !Number.isFinite(wgsLng)) return [wgsLat, wgsLng];
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
  let dLat = transformLat(wgsLng - 105.0, wgsLat - 35.0);
  let dLng = transformLng(wgsLng - 105.0, wgsLat - 35.0);
  const radLat = (wgsLat / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  const gcjLat = wgsLat + dLat;
  const gcjLng = wgsLng + dLng;
  return [gcjLat, gcjLng];
}

/**
 * 高德逆地理编码：根据经纬度获取地址信息（GCJ-02 坐标）
 * @param {string} key - 高德 Web 服务 Key
 * @param {number} lng - 经度
 * @param {number} lat - 纬度
 * @returns {{ city: string, province: string, district: string } | null}
 */
export async function regeoAmap(key, lng, lat) {
  if (!Number.isFinite(lng) || !Number.isFinite(lat)) return null;
  const k = (key || import.meta.env.VITE_AMAP_KEY || '').trim();
  if (!k) {
    console.warn('[amap] 未配置 VITE_AMAP_KEY，逆地理编码不可用');
    return null;
  }
  const location = `${lng},${lat}`;
  const url = `https://restapi.amap.com/v3/geocode/regeo?location=${encodeURIComponent(location)}&key=${encodeURIComponent(k)}`;
  try {
    const res = await fetch(url);
    const data = await res.json();
    if (data.status !== '1' || !data.regeocode?.addressComponent) return null;
    const comp = data.regeocode.addressComponent;
    return {
      province: comp.province || '',
      city: comp.city || comp.province || '',
      district: comp.district || '',
    };
  } catch (e) {
    console.warn('[amap] regeo error', e);
    return null;
  }
}

/** 高德路网瓦片 URL（Leaflet 用），style=8 路网，国内访问稳定 */
export const AMAP_TILE_URL = 'https://wprd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}';
