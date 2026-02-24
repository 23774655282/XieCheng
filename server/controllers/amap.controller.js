/**
 * 高德逆地理代理：由服务端请求高德 API，避免浏览器 CORS 与 Key 暴露
 * GET /api/amap/regeo?lng=经度&lat=纬度（GCJ-02）
 */
export async function regeoProxy(req, res) {
    try {
        const lng = parseFloat(req.query.lng);
        const lat = parseFloat(req.query.lat);
        if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
            return res.status(400).json({ success: false, message: '缺少或无效的 lng、lat 参数' });
        }
        const key = (process.env.AMAP_KEY || process.env.VITE_AMAP_KEY || '').trim();
        if (!key) {
            return res.status(503).json({
                success: false,
                message: '未配置 AMAP_KEY，请在服务端 .env 中配置',
            });
        }
        const location = `${lng},${lat}`;
        const url = `https://restapi.amap.com/v3/geocode/regeo?location=${encodeURIComponent(location)}&key=${encodeURIComponent(key)}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status !== '1' || !data.regeocode?.addressComponent) {
            const msg = data.info || data.infocode || '逆地理解析失败';
            return res.status(200).json({
                success: false,
                message: msg,
                city: null,
                province: null,
                district: null,
            });
        }
        const comp = data.regeocode.addressComponent;
        const province = comp.province || '';
        const cityRaw = comp.city;
        const city = Array.isArray(cityRaw)
            ? (cityRaw[0] || province)
            : (cityRaw || province);
        const district = comp.district || '';
        return res.status(200).json({
            success: true,
            city: city || null,
            province: province || null,
            district: district || null,
        });
    } catch (error) {
        console.error('[amap regeo proxy]', error);
        return res.status(500).json({
            success: false,
            message: error?.message || '逆地理请求失败',
        });
    }
}
