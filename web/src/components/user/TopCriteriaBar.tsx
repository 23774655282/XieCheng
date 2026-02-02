/**
 * 用户端 - 列表页顶部条件条（城市/日期/间夜）
 */
interface TopCriteriaBarProps {
  searchParams: URLSearchParams;
}

export default function TopCriteriaBar({ searchParams }: TopCriteriaBarProps) {
  const city = searchParams.get('city') ?? '';
  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';

  return (
    <div className="top-criteria-bar" style={{ padding: '0.75rem', background: '#fafafa', borderBottom: '1px solid #eee' }}>
      <span>城市: {city || '-'}</span>
      <span>入住: {checkIn || '-'}</span>
      <span>离店: {checkOut || '-'}</span>
    </div>
  );
}
