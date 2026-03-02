import { useNavigate } from 'react-router-dom';
import beijingImg from '../assets/beijing.jpg';
import shanghaiImg from '../assets/shanghai.jpg';
import tianjinImg from '../assets/tianjin.jpg';
import chongqingImg from '../assets/chongqing.jpg';
import xiamenImg from '../assets/xiamen.jpg';
import { geocodeAmap } from '../utils/amap';

const CITIES = ['北京', '上海', '天津', '重庆', '厦门'];
const CITY_IMGS = [beijingImg, shanghaiImg, tianjinImg, chongqingImg, xiamenImg];

function HotCities() {
  const navigate = useNavigate();

  const handleCityClick = async (city) => {
    const key = import.meta.env.VITE_AMAP_KEY;
    let lat = null;
    let lng = null;
    try {
      const coords = await geocodeAmap(key, city);
      if (coords && Number.isFinite(coords.lat) && Number.isFinite(coords.lng)) {
        lat = coords.lat;
        lng = coords.lng;
      }
    } catch {
      // 地理编码失败时退化为仅按城市名搜索
    }
    const params = new URLSearchParams();
    params.set('destination', city);
    if (lat != null && lng != null) {
      params.set('lat', String(lat));
      params.set('lng', String(lng));
    }
    navigate(`/rooms?${params.toString()}`);
    scrollTo(0, 0);
  };

  const cities = CITIES;
  const row1 = cities.slice(0, 2);
  const row2 = cities.slice(2, 5);
  return (
    <div className="flex flex-col items-center px-6 md:px-16 pt-16 md:pt-20 pb-8 md:pb-10 bg-slate-50 overflow-hidden">
      <div className="w-full max-w-6xl mx-auto flex flex-col items-start text-left mb-12 md:mb-16">
        <h2 className="text-2xl md:text-4xl font-bold tracking-tight text-gray-800" style={{ fontFamily: 'system-ui, sans-serif' }}>
          推荐热门城市
        </h2>
        <p className="text-gray-600 mt-2 text-sm md:text-base tracking-wide">探索热门目的地</p>
      </div>
      <div className="w-full max-w-6xl mx-auto flex flex-col gap-5 md:gap-6">
        {/* 第一行：2 个 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 md:gap-6">
          {row1.map((city, i) => (
            <button
              key={city}
              type="button"
              onClick={() => { handleCityClick(city); }}
              className="relative min-h-[260px] md:min-h-[320px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
            >
              <img src={CITY_IMGS[i]} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity group-hover:from-black/70 group-hover:via-black/10" />
              <div className="absolute inset-0 border border-white/10 rounded-lg md:rounded-xl group-hover:border-white/25 transition-colors" />
              <span className="absolute bottom-5 left-5 right-5 text-white text-xl md:text-2xl font-semibold tracking-tight drop-shadow-lg">{city}</span>
            </button>
          ))}
        </div>
        {/* 第二行：3 个 */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 md:gap-6">
          {row2.map((city, i) => (
            <button
              key={city}
              type="button"
              onClick={() => { handleCityClick(city); }}
              className="relative min-h-[220px] md:min-h-[280px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
            >
              <img src={CITY_IMGS[i + 2]} alt="" loading="lazy" decoding="async" className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-110" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity group-hover:from-black/70 group-hover:via-black/10" />
              <div className="absolute inset-0 border border-white/10 rounded-lg md:rounded-xl group-hover:border-white/25 transition-colors" />
              <span className="absolute bottom-4 left-4 right-4 text-white text-lg md:text-xl font-semibold tracking-tight drop-shadow-lg">{city}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default HotCities;
