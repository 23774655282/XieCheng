/**
 * 用户端 - 酒店列表页
 * 路由: /hotels
 * 模块: 条件条 + 筛选 + 列表 + 无限滚动
 */
import { useSearchParams } from 'react-router-dom';
import TopCriteriaBar from '../../components/user/TopCriteriaBar';
import FilterPanel from '../../components/user/FilterPanel';
import ActiveFiltersChips from '../../components/user/ActiveFiltersChips';
import HotelCardList from '../../components/user/HotelCardList';
import './HotelsList.css';

export default function HotelsList() {
  const [searchParams] = useSearchParams();

  return (
    <div className="page-hotels-list">
      <TopCriteriaBar searchParams={searchParams} />
      <FilterPanel />
      <ActiveFiltersChips />
      <main className="hotels-list-main">
        <HotelCardList />
      </main>
    </div>
  );
}
