import { useState, useEffect, useRef, useCallback } from 'react';
import { IoLocationOutline } from 'react-icons/io5';
import { useAppContext } from '../context/AppContext';

/**
 * 地址输入框：带 POI 联想下拉
 * 调用高德 inputtips 接口，输入后展示联想地址列表
 */
/**
 * @param {Object} props
 * @param {string} props.value
 * @param {function(string)} props.onChange - 地址字符串
 * @param {function(Object)} [props.onSelect] - 选择联想项时回调，传入 tip { name, address, district, location: 'lng,lat' }
 * @param {string} [props.city] - 已选城市，传入时地址联想限定在该城市内
 */
function AddressInput({ value, onChange, onSelect, city, placeholder = '请输入地址', className = '', id, required }) {
  const { axios } = useAppContext();
  const [open, setOpen] = useState(false);
  const [tips, setTips] = useState([]);
  const [loading, setLoading] = useState(false);
  const wrapperRef = useRef(null);

  const fetchTips = useCallback(
    async (keywords) => {
      const kw = String(keywords || '').trim();
      if (kw.length < 1) {
        setTips([]);
        return;
      }
      setLoading(true);
      try {
        const params = { keywords: kw };
        if (city && String(city).trim()) params.city = String(city).trim();
        const { data } = await axios.get('/api/amap/inputtips', {
          params,
          timeout: 8000,
        });
        let list = data?.success && Array.isArray(data.tips) ? data.tips : [];
        // 只展示有详细地址的联想项（address 不为空且与 district 不同，即街道+门牌）
        list = list.filter(
          (t) => t.address && String(t.address).trim() && t.address !== t.district
        );
        setTips(list);
      } catch (err) {
        setTips([]);
      } finally {
        setLoading(false);
      }
    },
    [axios, city]
  );

  useEffect(() => {
    if (!open || !(value ?? '').trim()) return;
    const t = setTimeout(() => fetchTips(value), 200);
    return () => clearTimeout(t);
  }, [value, open, city, fetchTips]);

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  const handleSelect = (tip) => {
    // 商户端：地址栏写地名，门牌号由 onSelect 填充到门牌号文本框
    const placeName = tip.name || tip.district || '';
    onChange(placeName);
    onSelect?.(tip);
    setOpen(false);
    setTips([]);
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
      {open && tips.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 z-50 max-h-60 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg py-1">
          {tips.map((tip) => {
            const primary = tip.name || tip.district || '';
            const detail = tip.address || (tip.district ? `${tip.district}` : '');
            if (!primary && !detail) return null;
            return (
              <button
                key={tip.id || primary || detail}
                type="button"
                onClick={() => handleSelect(tip)}
                className="w-full flex items-start gap-3 px-3 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="shrink-0 w-7 h-7 rounded-full bg-gray-400 flex items-center justify-center mt-0.5">
                  <IoLocationOutline className="w-3.5 h-3.5 text-white" />
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block text-sm font-semibold text-gray-800 truncate">{primary}</span>
                  {detail && (
                    <span className="block text-xs text-gray-500 mt-0.5 truncate">{detail}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {loading && open && (
        <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400">加载中...</div>
      )}
    </div>
  );
}

export default AddressInput;
