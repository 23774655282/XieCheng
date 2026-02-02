/**
 * 用户端 - 酒店基础信息（名称/星级/设施/地址）
 */
import { useEffect, useState } from 'react';
import { hotelsApi } from '../../api';

interface HotelBaseInfoProps {
  hotelId?: string;
}

export default function HotelBaseInfo({ hotelId }: HotelBaseInfoProps) {
  const [data, setData] = useState<{
    nameZh: string;
    nameEn: string;
    address: string;
    star: number;
    tags: string[];
  } | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!hotelId) return;
    hotelsApi
      .detail(hotelId)
      .then((res) => {
        if (res.code === 0 && res.data) {
          setData({
            nameZh: res.data.nameZh,
            nameEn: res.data.nameEn,
            address: res.data.address,
            star: res.data.star,
            tags: res.data.tags ?? [],
          });
        }
      })
      .catch((err) => setError(err instanceof Error ? err.message : '加载失败'));
  }, [hotelId]);

  if (error) return <section className="hotel-base-info" style={{ padding: '1rem', color: '#ff4d4f' }}>{error}</section>;
  if (!data) return <section className="hotel-base-info" style={{ padding: '1rem', color: '#999' }}>加载中...</section>;

  return (
    <section className="hotel-base-info" style={{ padding: '1rem' }}>
      <h2 style={{ margin: '0 0 0.5rem' }}>{data.nameZh}</h2>
      {data.nameEn && <p style={{ fontSize: 14, color: '#666', margin: '0 0 0.5rem' }}>{data.nameEn}</p>}
      <p style={{ margin: '0 0 0.5rem' }}>星级: {data.star}星</p>
      {data.tags.length > 0 && (
        <p style={{ margin: '0 0 0.5rem', fontSize: 14 }}>标签: {data.tags.join('、')}</p>
      )}
      <p style={{ fontSize: 14, color: '#666' }}>地址: {data.address}</p>
    </section>
  );
}
