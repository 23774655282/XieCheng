/** 约 40px 在给定缩放级别下对应的经纬度跨度（Web 墨卡托近似，用于"地标重合"判断） */
function pixelToDegreesAtZoom(zoom, pixelSize = 40) {
  const worldPixels = 256 * Math.pow(2, zoom);
  return (pixelSize / worldPixels) * 360;
}

/**
 * 按"地标是否重合"聚合：仅当两个酒店在当前缩放下会重叠（同格）时才合并为一簇
 * @param {Array<{ _id: string, _lat: number, _lng: number }>} hotels
 * @param {number} zoom - 地图缩放级别 4~18
 * @param {(lat: number, lng: number) => [number, number]} toGCJ - wgs84ToGcj02
 * @returns {{ clusters: Array<{ centerLat: number, centerLng: number, hotels: any[], count: number }>, singles: Array<{ hotel: any, lat: number, lng: number }> }}
 */
export function clusterHotels(hotels, zoom, toGCJ) {
  if (!Array.isArray(hotels) || hotels.length === 0) {
    return { clusters: [], singles: [] };
  }
  const zoomClamped = Math.max(4, Math.min(18, Number(zoom) || 10));
  // 格子大小 = 当前缩放下约 40px 对应的经度/纬度，只有落在同一格（地标重合）才合并
  const cellSize = Math.max(1e-6, pixelToDegreesAtZoom(zoomClamped));
  const groups = new Map();
  const points = hotels.map((h) => {
    const [lat, lng] = toGCJ(h._lat, h._lng);
    const key = `${Math.floor(lat / cellSize)}_${Math.floor(lng / cellSize)}`;
    return { hotel: h, lat, lng, key };
  });
  for (const p of points) {
    if (!groups.has(p.key)) groups.set(p.key, []);
    groups.get(p.key).push(p);
  }
  const clusters = [];
  const singles = [];
  for (const [, arr] of groups) {
    if (arr.length > 1) {
      const centerLat = arr.reduce((s, p) => s + p.lat, 0) / arr.length;
      const centerLng = arr.reduce((s, p) => s + p.lng, 0) / arr.length;
      clusters.push({
        centerLat,
        centerLng,
        hotels: arr.map((p) => p.hotel),
        count: arr.length,
      });
    } else {
      singles.push({ hotel: arr[0].hotel, lat: arr[0].lat, lng: arr[0].lng });
    }
  }
  return { clusters, singles };
}
