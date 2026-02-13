import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { facilityIcons } from '../assets/assets';
import Title from '../components/Title';

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;
const facilityLabelMap = {
  'Free Wifi': '免费 Wi-Fi',
  'Free Breakfast': '免费早餐',
  'Room Service': '客房服务',
  'Mountain View': '山景',
  'Pool Access': '泳池使用',
  'Parking': '免费停车',
  'Gym': '健身房',
  'Sea View': '海景',
  'Air Conditioning': '空调',
  'Spa': '水疗中心',
  'Restaurant': '餐厅',
  'Airport Shuttle': '机场接送',
};

function SmartSearchResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const criteria = state?.criteria;
  const rooms = Array.isArray(state?.rooms) ? state.rooms : [];

  if (!state || !criteria) {
    navigate('/rooms', { replace: true });
    return null;
  }

  const { destination, adults, children, nights, budget } = criteria;
  const guestText = children > 0 ? `${adults} 成人 ${children} 儿童` : `${adults} 人`;
  const summary = [
    destination && `目的地：${destination}`,
    `人数：${guestText}`,
    `入住：${nights} 晚`,
    budget > 0 ? `预算：${budget} 元` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div className="px-4 py-20 md:px-16 lg:px-24 xl:px-32 bg-gray-50 min-h-screen">
      <Title
        title="AI 智能搜索结果"
        subtitle="根据您的要求为您推荐以下酒店房型"
        align="left"
        className="pt-28 md:pt-36 mb-8"
      />
      <div className="mb-8 p-4 rounded-xl bg-white/80 border border-gray-200">
        <p className="text-gray-700 font-medium">您的要求</p>
        <p className="text-gray-600 text-sm mt-1">{summary}</p>
      </div>
      {rooms.length === 0 ? (
        <p className="text-gray-500 py-8">暂无符合条件的房型，可尝试放宽预算或更换目的地。</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rooms.map((room) => (
            <div
              key={room._id}
              className="flex flex-col bg-white rounded-xl border border-gray-100 overflow-hidden hover:shadow-md transition duration-200"
            >
              <img
                onClick={() => { navigate(`/rooms/${room._id}`); window.scrollTo(0, 0); }}
                src={room.images?.[0]}
                alt="房间"
                className="w-full h-40 object-cover cursor-pointer"
              />
              <div className="p-4 flex flex-col flex-1">
                <p className="text-base font-semibold text-gray-800 mb-2">{getRoomTypeLabel(room.roomType)}</p>
                {room.hotel && (
                  <p className="text-sm text-gray-500 mb-2">{room.hotel.name} · {room.hotel.city}</p>
                )}
                <div className="flex flex-wrap gap-2 mb-3">
                  {(room.amenties || []).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex items-center gap-1">
                      {facilityIcons[item] && <img src={facilityIcons[item]} alt="" className="w-3.5 h-3.5 flex-shrink-0" />}
                      <span className="text-xs text-gray-600">{facilityLabelMap[item] || item}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-auto flex items-center justify-between">
                  <p>
                    <span className="text-lg font-bold text-gray-800">{room.pricePerNight} 元</span>
                    <span className="text-sm text-gray-500 ml-0.5">/晚</span>
                    {nights > 1 && (
                      <span className="text-sm text-gray-500 ml-1">约 {room.pricePerNight * nights} 元 / {nights} 晚</span>
                    )}
                  </p>
                  <button
                    type="button"
                    onClick={() => { navigate(`/rooms/${room._id}`); window.scrollTo(0, 0); }}
                    className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700"
                  >
                    预订
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default SmartSearchResults;
