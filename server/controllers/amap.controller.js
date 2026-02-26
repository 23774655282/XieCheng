/**
 * 高德输入提示/POI 联想代理：根据关键词返回地址建议
 * GET /api/amap/inputtips?keywords=关键词&city=城市(可选)
 */
export async function inputtipsProxy(req, res) {
    try {
        const keywords = (req.query.keywords || '').trim();
        const city = (req.query.city || '').trim();
        if (!keywords || keywords.length < 1) {
            return res.status(400).json({ success: false, message: '缺少 keywords 参数', tips: [] });
        }
        const key = (process.env.AMAP_KEY || process.env.VITE_AMAP_KEY || '').trim();
        if (!key) {
            return res.status(503).json({
                success: false,
                message: '未配置 AMAP_KEY，请在服务端 .env 中配置',
                tips: [],
            });
        }
        const params = new URLSearchParams({ keywords, key });
        if (city) params.set('city', city);
        const url = `https://restapi.amap.com/v3/assistant/inputtips?${params.toString()}`;
        const resp = await fetch(url);
        const data = await resp.json();
        if (data.status !== '1') {
            return res.status(200).json({
                success: false,
                message: data.info || data.infocode || '输入提示请求失败',
                tips: [],
            });
        }
        const tips = (data.tips || []).map((t) => ({
            id: t.id,
            name: t.name || '',
            address: t.address || t.district || '',
            district: t.district || '',
            location: t.location || null,
            adcode: t.adcode || null,
        }));
        return res.status(200).json({ success: true, tips });
    } catch (error) {
        console.error('[amap inputtips proxy]', error);
        return res.status(500).json({
            success: false,
            message: error?.message || '输入提示请求失败',
            tips: [],
        });
    }
}

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
        const formattedAddress = data.regeocode.formatted_address || null;
        const township = comp.township || '';
        const street = comp.street || '';
        const streetNumber = (comp.streetNumber && comp.streetNumber.number) ? comp.streetNumber.number : '';
        const place = formattedAddress || [province, district, township, street, streetNumber].filter(Boolean).join('') || district || city || null;
        return res.status(200).json({
            success: true,
            city: city || null,
            province: province || null,
            district: district || null,
            place: place || null,
        });
    } catch (error) {
        console.error('[amap regeo proxy]', error);
        return res.status(500).json({
            success: false,
            message: error?.message || '逆地理请求失败',
        });
    }
}
