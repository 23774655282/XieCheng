import { useState, useEffect, useRef, useCallback } from 'react';
import { IoLocationOutline } from 'react-icons/io5';
import { useAppContext } from '../context/AppContext';

/** 从高德 district 解析行政区名，如 "上海市徐汇区" -> "徐汇区"，"江苏省徐州市睢宁县" -> "睢宁县" */
function parseDistrictFromDistrict(district) {
  if (!district || typeof district !== 'string') return '';
  const m = district.match(/([^省市区县]+[区县])$/);
  return m ? m[1] : '';
}

/** 从高德 district 解析城市名，如 "江苏省徐州市睢宁县" -> "徐州市" */
function parseCityFromDistrict(district) {
  if (!district || typeof district !== 'string') return '';
  const afterProvince = district.replace(/^.+?省/, '');
  const cityMatch = afterProvince.match(/^.+?[市州]/) || district.match(/^.+?[市]/);
  return cityMatch ? cityMatch[0] : (afterProvince || district);
}

/**
 * 城市输入框：带联想下拉
 * 使用高德 inputtips，从返回的 district 提取城市名去重展示
 */
function CityInput({ value, onChange, placeholder = '请输入城市', className = '', id, required }) {
  const { axios } = useAppContext();
  const [open, setOpen] = useState(false);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const fetchCities = useCallback(
    async (keywords) => {
      const kw = String(keywords || '').trim();
      if (kw.length < 1) {
        setCities([]);
        return;
      }
      setLoading(true);
      try {
        const { data } = await axios.get('/api/amap/inputtips', {
          params: { keywords: kw },
          timeout: 8000,
        });
        if (!data?.success || !Array.isArray(data.tips)) {
          setCities([]);
          return;
        }
        const seen = new Set();
        const list = [];
        for (const tip of data.tips) {
          const city = parseCityFromDistrict(tip.district);
          if (city && !seen.has(city)) {
            seen.add(city);
            list.push(city);
          }
        }
        setCities(list);
      } catch (err) {
        setCities([]);
      } finally {
        setLoading(false);
      }
    },
    [axios]
  );

  useEffect(() => {
    if (!open || !value) return;
    const t = setTimeout(() => fetchCities(value), 200);
    return () => clearTimeout(t);
  }, [value, open, fetchCities]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (city) => {
    onChange(city);
    setOpen(false);
    setCities([]);
  };

  const inputCls = className || 'w-full p-2 border border-gray-300 rounded-md';
  const safeValue = value ?? '';

  return (
    <div className="relative" ref={wrapperRef}>
      <input
        id={id}
        type="text"
        value={safeValue}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={placeholder}
        className={inputCls}
        required={required}
        autoComplete="off"
      />
      {open && cities.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {cities.map((city) => (
            <button
              key={city}
              type="button"
              onClick={() => handleSelect(city)}
              className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors"
            >
              <span className="shrink-0 w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center">
                <IoLocationOutline className="w-3.5 h-3.5 text-white" />
              </span>
              {city}
            </button>
          ))}
        </div>
      )}
      {loading && open && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">加载中...</div>
      )}
    </div>
  );
}

export default CityInput;
export { parseCityFromDistrict, parseDistrictFromDistrict };
