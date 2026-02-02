/**
 * 用户端 - 日期与间夜信息
 */
import { useSearchParams } from 'react-router-dom';

export default function DateNightsBanner() {
  const [searchParams] = useSearchParams();
  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';

  const nights = checkIn && checkOut
    ? Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / (24 * 3600 * 1000)))
    : 0;

  return (
    <div className="date-nights-banner" style={{ padding: '0.5rem 1rem', background: '#fafafa' }}>
      {checkIn && checkOut ? (
        <span>入住 {checkIn} · 离店 {checkOut} · {nights} 晚</span>
      ) : (
        <span style={{ color: '#999' }}>请选择入住和离店日期</span>
      )}
    </div>
  );
}
