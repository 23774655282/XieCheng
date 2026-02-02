/**
 * 用户端 - 酒店查询页（首页）
 * 路由: /
 * 模块: Banner + 条件输入 + 快捷标签 + 查询跳转
 */
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import BannerCarousel from '../../components/user/BannerCarousel';
import KeywordInput from '../../components/user/KeywordInput';
import DateRangePicker from '../../components/user/DateRangePicker';
import QuickTags from '../../components/user/QuickTags';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const [keyword, setKeyword] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');

  const handleSearch = (extraParams: Record<string, string> = {}) => {
    const params: Record<string, string> = { ...extraParams };
    if (keyword.trim()) params.keyword = keyword.trim();
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    const search = new URLSearchParams(params).toString();
    navigate(`/hotels?${search}`);
  };

  return (
    <div className="page-home">
      <BannerCarousel />
      <section className="home-search">
        <KeywordInput placeholder="城市 / 关键词" value={keyword} onChange={setKeyword} />
        <DateRangePicker
          checkIn={checkIn}
          checkOut={checkOut}
          onChange={(a, b) => {
            setCheckIn(a);
            setCheckOut(b);
          }}
        />
        <QuickTags onSelect={(tag) => handleSearch({ tags: tag })} />
        <button type="button" className="home-search-btn" onClick={() => handleSearch()}>
          搜索酒店
        </button>
        <p className="home-admin-link">
          <Link to="/admin/login">管理端入口</Link>
        </p>
      </section>
    </div>
  );
}
