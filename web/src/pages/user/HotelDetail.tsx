/**
 * 用户端 - 酒店详情页
 * 路由: /hotels/:id
 * 模块: 轮播图 + 基础信息 + 日期/间夜 + 房型列表（按价格升序）
 */
import { useParams } from 'react-router-dom';
import NavHeader from '../../components/user/NavHeader';
import ImageCarousel from '../../components/user/ImageCarousel';
import HotelBaseInfo from '../../components/user/HotelBaseInfo';
import DateNightsBanner from '../../components/user/DateNightsBanner';
import RoomTypeList from '../../components/user/RoomTypeList';
import './HotelDetail.css';

export default function HotelDetail() {
  const { id } = useParams<{ id: string }>();

  return (
    <div className="page-hotel-detail">
      <NavHeader title="酒店详情" backTo="/hotels" />
      <ImageCarousel hotelId={id} />
      <HotelBaseInfo hotelId={id} />
      <DateNightsBanner />
      <RoomTypeList hotelId={id} />
    </div>
  );
}
