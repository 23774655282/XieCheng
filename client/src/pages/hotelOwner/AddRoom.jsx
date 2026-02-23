import React, { useState } from 'react';
import Title from '../../components/Title';
import { MdOutlineCloudUpload } from 'react-icons/md';
import { useAppContext } from '../../context/AppContext';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { checkImageResolution, MIN_RECOMMENDED_LONG_EDGE } from '../../utils/imageUtils';

function AddRoom() {

  const { axios, getToken } = useAppContext();
  const { hotelId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const returnToSupplement = location.state?.returnTo === "supplement";

  const [images, setImages] = useState({
    1: null,
    2: null,
    3: null,
    4: null,
  });

  const [inputData, setInputData] = useState({
    roomType: '',
    pricePerNight: 0,
    promoDiscount: 0,
    amenities: {
      'Free Wifi': false,
      'Free Breakfast': false,
      'Room Service': false,
      'Mountain View': false,
      'Pool Access': false,
      'Parking': false,
      'Gym': false,
      'Sea View': false,
      'Air Conditioning': false,
      'Spa': false,
      'Restaurant': false,
      'Airport Shuttle': false,
    },
  });

  const amenityLabelMap = {
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

  const [newAmenity, setNewAmenity] = useState("");

  const handleAddAmenity = () => {
    const name = newAmenity.trim();
    if (!name) {
      toast.error('请输入设施名称');
      return;
    }
    if (inputData.amenities[name] !== undefined) {
      toast.error('该设施已存在');
      return;
    }
    setInputData(prev => ({
      ...prev,
      amenities: {
        ...prev.amenities,
        [name]: true,
      },
    }));
    setNewAmenity("");
  };

  const handleRemoveAmenity = (name) => {
    setInputData(prev => {
      const nextAmenities = { ...prev.amenities };
      delete nextAmenities[name];
      return {
        ...prev,
        amenities: nextAmenities,
      };
    });
  };

  const handleImageChange = (key, file) => {
    if (!file) return;
    setImages(prev => ({ ...prev, [key]: file }));
    checkImageResolution(file, (dim, longEdge) => {
      toast.error(`建议上传更长边不少于 ${MIN_RECOMMENDED_LONG_EDGE} 像素的图片，放大后更清晰。当前为 ${dim.width}×${dim.height}，可能模糊。`);
    });
  };

  const [loading, setLoading] = useState(false);

  async function handleSumbit(e) {
    e.preventDefault();

    if (!inputData.roomType) {
      toast.error('请选择房型');
      return;
    }
    const price = Number(inputData.pricePerNight);
    if (!inputData.pricePerNight || isNaN(price) || price <= 0) {
      toast.error('请输入有效的价格（需大于 0）');
      return;
    }
    if (!Object.values(images).some((img) => img)) {
      toast.error('请至少上传一张房间图片');
      return;
    }
    const selectedAmenities = Object.keys(inputData.amenities).filter(amenity => inputData.amenities[amenity]);
    if (selectedAmenities.length === 0) {
      toast.error('请至少选择一项房间设施');
      return;
    }

    setLoading(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('roomType', inputData.roomType);
      formData.append('pricePerNight', inputData.pricePerNight);
      formData.append('promoDiscount', String(inputData.promoDiscount));
      if (hotelId) formData.append('hotelId', hotelId);
      formData.append('amenities', JSON.stringify(selectedAmenities));

      Object.keys(images).forEach((key)=>{
        images[key] && formData.append(`images`, images[key]);
      })

      const {data} = await axios.post('/api/rooms',formData,{
        headers:{
          Authorization: `Bearer ${token}`,
        }
      })
      
      if (data.success) {
        toast.success(data.message || '房间已提交，等待管理员审核');
        const backTo = returnToSupplement && hotelId ? `/owner/hotels/${hotelId}/supplement` : (hotelId ? `/owner/hotels/${hotelId}/rooms` : '/owner/hotel-info');
        navigate(backTo);
        setInputData({
          roomType: '',
          pricePerNight: 0,
          promoDiscount: 0,
          amenities: {
            'Free Wifi': false,
            'Free Breakfast': false,
            'Room Service': false,
            'Mountain View': false,
            'Pool Access': false,
            'Parking': false,
            'Gym': false,
            'Sea View': false,
            'Air Conditioning': false,
            'Spa': false,
            'Restaurant': false,
            'Airport Shuttle': false,
          },
        })
        setImages({
          1: null,
          2: null,
          3: null,
          4: null,
        });
      }
      setLoading(false);
    } catch (error) {
      console.error('Error adding room:', error);
      toast.error('新增房间失败，请稍后重试');
      setLoading(false);
    }

  }

  if (loading) {
    return <AiOutlineLoading3Quarters
      className="animate-spin text-4xl text-blue-600 mx-auto my-20"
      style={{ display: 'block' }}
    />
  }

  const goBack = () => {
    if (returnToSupplement && hotelId) navigate(`/owner/hotels/${hotelId}/supplement`);
    else if (hotelId) navigate(`/owner/hotels/${hotelId}/rooms`);
    else navigate('/owner/hotel-info');
  };

  return (
    <form
    onSubmit={handleSumbit}
    className="w-full max-w-3xl mx-auto min-w-0 p-3 sm:p-6 bg-white shadow-md rounded-lg">
      <div className="flex items-center justify-between mb-4">
        <Title
          align="left"
          font="outfit"
          title="新增房间"
          subtitle="为您的酒店添加新的房型"
        />
        <button type="button" onClick={goBack} className="text-gray-600 hover:text-gray-800 text-sm">
          {returnToSupplement ? "返回酒店信息表" : "返回房间列表"}
        </button>
      </div>

      {/* Images Section */}
      <p className="text-lg font-semibold text-neutral-800 mb-4">房间图片 <span className="text-red-500">*</span></p>
      <p className="text-sm text-gray-500 mb-2">建议上传 1200×800 或更高分辨率（更长边 ≥ {MIN_RECOMMENDED_LONG_EDGE} 像素），保证放大后不模糊。</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {Object.keys(images).map(key => (
          <label
            htmlFor={`roomImage${key}`}
            key={key}
            className="relative flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-gray-500 cursor-pointer overflow-hidden"
          >
            {images[key] ? (
              <img
                src={URL.createObjectURL(images[key])}
                alt={`房间图 ${key}`}
                className="absolute w-full h-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center text-gray-400">
                <MdOutlineCloudUpload className="text-4xl mb-1" />
                <span className="text-xs">上传</span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              id={`roomImage${key}`}
              hidden
              onChange={e => handleImageChange(key, e.target.files?.[0])}
            />
          </label>
        ))}
      </div>

        <div className='w-full flex max-sm:flex-col gap-4 mt-4'>
          <div className='flex-1 max-w-48'>
            <p className='text-gray-800 mt-4'>
              房型 <span className="text-red-500">*</span>
            </p>
            <select
              value={inputData.roomType}
              onChange={(e) => setInputData({ ...inputData, roomType: e.target.value })}
            className='w-full p-2 border border-gray-300 rounded-lg'>
              <option value="">
                请选择房型
              </option>
              <option value="Single Bed">单人间</option>
              <option value="Double Bed">双人间</option>
              <option value="Luxury Room">豪华房</option>
              <option value="Family Suite">家庭套房</option>
            </select>
          </div>
          <div>
            <p className='mt-4 text-gray-800'>
              价格（元/晚） <span className="text-red-500">*</span>
            </p>
            <input type="number"
              placeholder='0' className='w-full p-2 border border-gray-300 rounded-lg'
              value={inputData.pricePerNight}
              onChange={(e) => setInputData({ ...inputData, pricePerNight: e.target.value })}
            />
          </div>
        </div>

        <div className="mt-6">
          <p className="text-gray-800 font-medium mb-2">优惠促销（%）</p>
          <div className="flex items-center gap-4">
            <input
              type="range"
              min={0}
              max={100}
              value={inputData.promoDiscount}
              onChange={(e) => setInputData({ ...inputData, promoDiscount: Number(e.target.value) })}
              className="flex-1 h-2 rounded-lg appearance-none cursor-pointer bg-gray-200"
            />
            <input
              type="number"
              min={0}
              max={100}
              value={inputData.promoDiscount}
              onChange={(e) => {
                const v = parseInt(e.target.value, 10);
                setInputData({ ...inputData, promoDiscount: Number.isNaN(v) ? 0 : Math.min(100, Math.max(0, v)) });
              }}
              className="w-20 p-2 border border-gray-300 rounded-lg text-center"
            />
            <span className="text-gray-600">%</span>
          </div>
          <p className="mt-2 text-gray-700">
            优惠后价格为：<span className="font-semibold text-gray-900">{Math.round((Number(inputData.pricePerNight) || 0) * (1 - (Number(inputData.promoDiscount) || 0) / 100))} 元/晚</span>
          </p>
        </div>

        <p className='text-lg font-semibold text-neutral-800 mt-4 mb-2'>
          房间设施
        </p>
        <div>
          {
            Object.keys(inputData.amenities).map((amenity,index)=>(
              <div key={index} className='flex items-center gap-2 mb-2'>
                <input
                  type="checkbox"
                  id={`amenities${index+1}`}
                  checked={inputData.amenities[amenity]} 
                  onChange={(e) => setInputData({
                    ...inputData,
                    amenities: {
                      ...inputData.amenities,
                      [amenity]: e.target.checked
                    }
                  })} />

                <label htmlFor={`amenities${index+1}`} className='text-gray-800'>
                  {amenityLabelMap[amenity] || amenity}
                </label>

                <button
                  type="button"
                  onClick={() => handleRemoveAmenity(amenity)}
                  className="text-xs text-red-500 hover:underline"
                >
                  删除
                </button>
              </div>
            ))
          }
          <div className="flex items-center gap-2 mt-3">
            <input
              type="text"
              value={newAmenity}
              onChange={(e) => setNewAmenity(e.target.value)}
              placeholder="输入自定义设施，如 健身房"
              className="w-48 max-w-full border rounded p-2 text-sm"
            />
            <button
              type="button"
              onClick={handleAddAmenity}
              className="shrink-0 px-3 py-1 text-xs bg-blue-500 text-white rounded"
            >
              添加设施
            </button>
          </div>
        </div>
        <button type='submit' className='w-1/2 min-w-[10rem] mx-auto block mt-6 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors duration-200'>
          确认新增房间
        </button>
    </form>
  );
}

export default AddRoom;
