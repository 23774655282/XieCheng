/**
 * 用户端 - 酒店卡片列表（对接 API，支持无限滚动）
 */
import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { hotelsApi } from '../../api';
import HotelCard from './HotelCard';

const PAGE_SIZE = 10;

export default function HotelCardList() {
  const [searchParams] = useSearchParams();
  const [list, setList] = useState<{ id: string; nameZh: string; star: number; minPrice: number; address: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [error, setError] = useState('');

  const keyword = searchParams.get('keyword') ?? '';
  const city = searchParams.get('city') ?? '';
  const star = searchParams.get('star') ?? '';
  const priceMin = searchParams.get('priceMin') ?? '';
  const priceMax = searchParams.get('priceMax') ?? '';
  const tags = searchParams.get('tags') ?? '';

  const fetchList = useCallback(
    async (pageNum: number, append: boolean) => {
      setLoading(true);
      setError('');
      try {
        const res = await hotelsApi.list({
          keyword: keyword || undefined,
          city: city || undefined,
          star: star ? Number(star) : undefined,
          priceMin: priceMin ? Number(priceMin) : undefined,
          priceMax: priceMax ? Number(priceMax) : undefined,
          tags: tags || undefined,
          page: pageNum,
          pageSize: PAGE_SIZE,
        });
        if (res.code === 0 && res.data) {
          const items = res.data.list.map((h) => ({
            id: h.id,
            nameZh: h.nameZh,
            star: h.star,
            minPrice: h.minPrice,
            address: h.address,
          }));
          setList((prev) => (append ? [...prev, ...items] : items));
          setHasMore(items.length >= PAGE_SIZE && res.data.total > pageNum * PAGE_SIZE);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '加载失败');
      } finally {
        setLoading(false);
      }
    },
    [keyword, city, star, priceMin, priceMax, tags]
  );

  // 参数变化时重新加载第一页
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchList(1, false);
  }, [fetchList]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchList(next, true);
  }, [page, loading, hasMore, fetchList]);

  return (
    <div className="hotel-card-list" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {error && <p style={{ padding: '1rem', color: '#ff4d4f', textAlign: 'center' }}>{error}</p>}
      {!error && list.length === 0 && !loading && (
        <p style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>暂无酒店数据</p>
      )}
      {list.map((item) => (
        <HotelCard key={item.id} {...item} />
      ))}
      <InfiniteScrollTrigger onLoadMore={loadMore} hasMore={hasMore} loading={loading} />
    </div>
  );
}

function InfiniteScrollTrigger({
  onLoadMore,
  hasMore,
  loading,
}: {
  onLoadMore: () => void;
  hasMore: boolean;
  loading: boolean;
}) {
  useEffect(() => {
    if (!hasMore || loading) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) onLoadMore();
      },
      { threshold: 0.1 }
    );
    const el = document.getElementById('infinite-scroll-sentinel');
    if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [onLoadMore, hasMore, loading]);

  if (!hasMore) return null;
  return <div id="infinite-scroll-sentinel" style={{ height: 1 }} />;
}
