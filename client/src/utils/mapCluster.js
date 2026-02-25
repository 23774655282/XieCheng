/**
 * 按缩放级别对酒店进行网格聚合，同一区域多家酒店显示为一个簇
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
  // 放大到一定级别（例如街道级 >= 14）时不再聚合，全部展示为单点，避免近邻酒店合并成一个簇
  if (zoomClamped >= 14) {
    const singles = hotels.map((h) => {
      const [lat, lng] = toGCJ(h._lat, h._lng);
      return { hotel: h, lat, lng };
    });
    return { clusters: [], singles };
  }
  // 缩放越小格子越大，聚合越强
  const cellSize = 0.5 / Math.pow(2, (zoomClamped - 4) * 0.4);
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
