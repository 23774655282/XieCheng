/**
 * 用户端 - 已选条件标签，可一键清空
 */
import { useSearchParams } from 'react-router-dom';

export default function ActiveFiltersChips() {
  const [searchParams, setSearchParams] = useSearchParams();

  const star = searchParams.get('star');
  const priceMin = searchParams.get('priceMin');
  const priceMax = searchParams.get('priceMax');
  const tags = searchParams.get('tags');
  const keyword = searchParams.get('keyword');

  const chips: { label: string; key: string }[] = [];
  if (star) chips.push({ label: `${star}星`, key: 'star' });
  if (priceMin) chips.push({ label: `¥${priceMin}起`, key: 'priceMin' });
  if (priceMax) chips.push({ label: `¥${priceMax}止`, key: 'priceMax' });
  if (tags) chips.push({ label: tags, key: 'tags' });
  if (keyword) chips.push({ label: keyword, key: 'keyword' });

  if (chips.length === 0) return null;

  const remove = (key: string) => {
    const next = new URLSearchParams(searchParams);
    next.delete(key);
    setSearchParams(next);
  };

  const clearAll = () => {
    setSearchParams(new URLSearchParams());
  };

  return (
    <div className="active-filters-chips" style={{ padding: '0.5rem', display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
      {chips.map((c) => (
        <span
          key={c.key}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '0.25rem 0.5rem',
            background: '#f0f0f0',
            borderRadius: 4,
            fontSize: 14,
          }}
        >
          {c.label}
          <button type="button" onClick={() => remove(c.key)} style={{ border: 'none', background: 'none', cursor: 'pointer' }}>
            ×
          </button>
        </span>
      ))}
      <button type="button" onClick={clearAll} style={{ fontSize: 14, color: '#1677ff' }}>
        清空
      </button>
    </div>
  );
}
