import { useNavigate } from 'react-router-dom';
import beijingImg from '../assets/beijing.jpg';
import shanghaiImg from '../assets/shanghai.jpg';
import tianjinImg from '../assets/tianjin.jpg';
import chongqingImg from '../assets/chongqing.jpg';
import xiamenImg from '../assets/xiamen.jpg';

const CITIES = ['北京', '上海', '天津', '重庆', '厦门'];
const CITY_IMGS = [beijingImg, shanghaiImg, tianjinImg, chongqingImg, xiamenImg];

function HotCities() {
  const navigate = useNavigate();
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
              onClick={() => { navigate(`/rooms?destination=${encodeURIComponent(city)}`); scrollTo(0, 0); }}
              className="relative min-h-[260px] md:min-h-[320px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110" style={{ backgroundImage: `url(${CITY_IMGS[i]})` }} />
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
              onClick={() => { navigate(`/rooms?destination=${encodeURIComponent(city)}`); scrollTo(0, 0); }}
              className="relative min-h-[220px] md:min-h-[280px] rounded-lg md:rounded-xl overflow-hidden cursor-pointer group"
            >
              <div className="absolute inset-0 bg-cover bg-center transition-transform duration-500 ease-out group-hover:scale-110" style={{ backgroundImage: `url(${CITY_IMGS[i + 2]})` }} />
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
