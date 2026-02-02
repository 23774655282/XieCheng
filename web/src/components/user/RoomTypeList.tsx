/**
 * 用户端 - 房型列表（服务端按 price 升序）
 */
import { useEffect, useState } from 'react';
import { hotelsApi } from '../../api';

interface RoomTypeListProps {
  hotelId?: string;
}

export default function RoomTypeList({ hotelId }: RoomTypeListProps) {
  const [list, setList] = useState<{ name: string; price: number; stock: number }[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotelId) return;
    hotelsApi
      .rooms(hotelId)
      .then((res) => {
        if (res.code === 0 && res.data) {
          setList(res.data.list);
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [hotelId]);

  if (error) return <section className="room-type-list" style={{ padding: '1rem', color: '#ff4d4f' }}>{error}</section>;
  if (list.length === 0 && !error) return null;

  return (
    <section className="room-type-list" style={{ padding: '1rem' }}>
      <h3 style={{ margin: '0 0 0.75rem' }}>房型</h3>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {list.map((r, i) => (
          <li
            key={i}
            style={{
              padding: '0.75rem',
              borderBottom: '1px solid #eee',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span>{r.name}</span>
            <span style={{ color: '#1677ff', fontWeight: 600 }}>¥{r.price}/晚</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
