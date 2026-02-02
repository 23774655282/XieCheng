/**
 * 用户端 - 筛选区（星级/价格/标签）
 */
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';

const STARS = [1, 2, 3, 4, 5];
const TAG_OPTIONS = ['亲子', '豪华', '停车', '近地铁', '含早'];

export default function FilterPanel() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [star, setStar] = useState(searchParams.get('star') ?? '');
  const [priceMin, setPriceMin] = useState(searchParams.get('priceMin') ?? '');
  const [priceMax, setPriceMax] = useState(searchParams.get('priceMax') ?? '');
  const [tags, setTags] = useState<string[]>(() => {
    const t = searchParams.get('tags');
    return t ? t.split(',').map((s) => s.trim()).filter(Boolean) : [];
  });

  useEffect(() => {
    setStar(searchParams.get('star') ?? '');
    setPriceMin(searchParams.get('priceMin') ?? '');
    setPriceMax(searchParams.get('priceMax') ?? '');
    const t = searchParams.get('tags');
    setTags(t ? t.split(',').map((s) => s.trim()).filter(Boolean) : []);
  }, [searchParams]);

  const apply = () => {
    const next = new URLSearchParams(searchParams);
    if (star) next.set('star', star);
    else next.delete('star');
    if (priceMin) next.set('priceMin', priceMin);
    else next.delete('priceMin');
    if (priceMax) next.set('priceMax', priceMax);
    else next.delete('priceMax');
    if (tags.length) next.set('tags', tags.join(','));
    else next.delete('tags');
    next.delete('page');
    setSearchParams(next);
  };

  const toggleTag = (tag: string) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    setTags(next);
  };

  return (
    <div className="filter-panel" style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>星级:</span>
        {STARS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStar(star === String(s) ? '' : String(s))}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              border: star === String(s) ? '1px solid #1677ff' : '1px solid #ddd',
              background: star === String(s) ? '#e6f4ff' : '#fff',
            }}
          >
            {s}星
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>价格:</span>
        <input
          type="number"
          placeholder="最低"
          value={priceMin}
          onChange={(e) => setPriceMin(e.target.value)}
          style={{ width: 80, padding: '0.25rem', borderRadius: 4, border: '1px solid #ddd' }}
        />
        <span>-</span>
        <input
          type="number"
          placeholder="最高"
          value={priceMax}
          onChange={(e) => setPriceMax(e.target.value)}
          style={{ width: 80, padding: '0.25rem', borderRadius: 4, border: '1px solid #ddd' }}
        />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 8 }}>
        <span>标签:</span>
        {TAG_OPTIONS.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            style={{
              padding: '0.25rem 0.5rem',
              borderRadius: 4,
              border: tags.includes(tag) ? '1px solid #1677ff' : '1px solid #ddd',
              background: tags.includes(tag) ? '#e6f4ff' : '#fff',
            }}
          >
            {tag}
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={apply}
        style={{ padding: '0.5rem 1rem', background: '#1677ff', color: '#fff', border: 'none', borderRadius: 6 }}
      >
        应用筛选
      </button>
    </div>
  );
}
