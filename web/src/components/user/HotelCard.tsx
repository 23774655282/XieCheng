/**
 * 用户端 - 单张酒店卡片
 */
import { Link, useSearchParams } from 'react-router-dom';

interface HotelCardProps {
  id: string;
  nameZh: string;
  star: number;
  minPrice: number;
  address: string;
}

export default function HotelCard({ id, nameZh, star, minPrice, address }: HotelCardProps) {
  const [searchParams] = useSearchParams();
  const qs = searchParams.toString();
  const to = qs ? `/hotels/${id}?${qs}` : `/hotels/${id}`;

  return (
    <Link to={to} className="hotel-card" style={{ display: 'block', padding: 12, border: '1px solid #eee', borderRadius: 8, textDecoration: 'none', color: 'inherit' }}>
      <h3>{nameZh}</h3>
      <p>星级: {star} | 起 ¥{minPrice}</p>
      <p style={{ fontSize: 12, color: '#666' }}>{address}</p>
    </Link>
  );
}
