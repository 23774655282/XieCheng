import React, { useState, useEffect } from 'react';
import Title from '../../components/Title';
import { MdOutlineCloudUpload } from 'react-icons/md';
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import { AiOutlineLoading3Quarters } from 'react-icons/ai';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { checkImageResolution, MIN_RECOMMENDED_LONG_EDGE } from '../../utils/imageUtils';

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

const defaultAmenities = {
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
};

function EditRoom() {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { state } = useLocation();
  const { axios, getToken } = useAppContext();
  const hotelIdFromState = state?.hotelId;
  const getBackUrl = () => {
    const id = hotelIdFromState || room?.hotel?._id || room?.hotel;
    return id ? `/owner/hotels/${id}/rooms` : '/owner/hotel-info';
  };

  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [images, setImages] = useState({ 1: null, 2: null, 3: null, 4: null });
  const [inputData, setInputData] = useState({
    roomType: '',
    pricePerNight: 0,
    promoDiscount: 0,
    amenities: { ...defaultAmenities },
  });
  const [newAmenity, setNewAmenity] = useState('');


  useEffect(() => {
    (async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      try {
        const roomRes = await axios.get(`/api/rooms/owner/${roomId}`, { headers });
        if (roomRes.data?.success && roomRes.data.room) {
          const r = roomRes.data.room;
          setRoom(r);
          setInputData({
            roomType: r.roomType || '',
            pricePerNight: r.pricePerNight || 0,
            promoDiscount: r.promoDiscount ?? 0,
            amenities: (r.amenties && r.amenties.length)
              ? r.amenties.reduce((acc, a) => ({ ...acc, [a]: true }), { ...defaultAmenities })
              : { ...defaultAmenities },
          });
          const imgs = r.images || [];
          setImages({
            1: imgs[0] || null,
            2: imgs[1] || null,
            3: imgs[2] || null,
            4: imgs[3] || null,
          });
        } else {
          toast.error('房间不存在');
        }
      } catch (e) {
        toast.error('加载房间失败');
      } finally {
        setLoading(false);
      }
    })();
  }, [roomId]);

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
    setInputData((prev) => ({
      ...prev,
      amenities: { ...prev.amenities, [name]: true },
    }));
    setNewAmenity('');
  };

  const handleRemoveAmenity = (name) => {
    setInputData((prev) => {
      const next = { ...prev.amenities };
      delete next[name];
      return { ...prev, amenities: next };
    });
  };

  const handleImageChange = (key, file) => {
    if (!file) return;
    setImages((prev) => ({ ...prev, [key]: file }));
    checkImageResolution(file, (dim) => {
      toast.error(`建议上传更长边不少于 ${MIN_RECOMMENDED_LONG_EDGE} 像素的图片，放大后更清晰。当前为 ${dim.width}×${dim.height}，可能模糊。`);
    });
  };

  async function handleSubmit(e) {
    e.preventDefault();
    if (!inputData.roomType || !inputData.pricePerNight) {
      toast.error('请填写房型与价格');
      return;
    }
    const hasImage = Object.values(images).some((v) => v != null);
    if (!hasImage) {
      toast.error('请至少保留或上传一张房间图片');
      return;
    }

    setSaving(true);
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('roomType', inputData.roomType);
      formData.append('pricePerNight', String(inputData.pricePerNight));
      formData.append('promoDiscount', String(inputData.promoDiscount));
      const amenitiesList = Object.keys(inputData.amenities).filter((a) => inputData.amenities[a]);
      formData.append('amenities', JSON.stringify(amenitiesList));
      Object.keys(images).forEach((key) => {
        const v = images[key];
        if (v instanceof File) formData.append('images', v);
      });

      const { data } = await axios.put(`/api/rooms/${roomId}`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success(data.needsApproval ? '修改已提交，等待管理员审核' : '房间已更新');
        navigate(getBackUrl());
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || '更新房间失败，请稍后重试');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <AiOutlineLoading3Quarters
        className="animate-spin text-4xl text-blue-600 mx-auto my-20"
        style={{ display: 'block' }}
      />
    );
  }

  if (!room) {
    return (
      <div className="max-w-3xl mx-auto p-3 sm:p-6 min-w-0">
        <button
          type="button"
          onClick={() => navigate(getBackUrl())}
          className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800 mb-4"
        >
          返回房间列表
        </button>
        <p className="text-gray-600">未找到该房间</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-3xl mx-auto min-w-0 p-3 sm:p-6 bg-white shadow-md rounded-lg">
      <button
        type="button"
        onClick={() => navigate(getBackUrl())}
        className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800 mb-4"
      >
        返回房间列表
      </button>
      <Title align="left" font="outfit" title="编辑房间" subtitle={room.roomType || '修改房型信息'} />

      <p className="text-lg font-semibold text-neutral-800 mb-4">房间图片（可保留原图或重新上传）</p>
      <p className="text-sm text-gray-500 mb-2">建议上传更长边 ≥ {MIN_RECOMMENDED_LONG_EDGE} 像素的图片，保证放大后不模糊。</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map((key) => (
          <label
            key={key}
            htmlFor={`editRoomImage${key}`}
            className="relative flex items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 hover:border-gray-500 cursor-pointer overflow-hidden"
          >
            {images[key] ? (
              <img
                src={images[key] instanceof File ? URL.createObjectURL(images[key]) : images[key]}
                alt=""
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
              id={`editRoomImage${key}`}
              hidden
              onChange={(e) => handleImageChange(key, e.target.files?.[0])}
            />
          </label>
        ))}
      </div>

      <div className="w-full flex max-sm:flex-col gap-4 mt-4">
        <div className="flex-1 max-w-48">
          <p className="text-gray-800 mt-4">房型</p>
          <select
            value={inputData.roomType}
            onChange={(e) => setInputData({ ...inputData, roomType: e.target.value })}
            className="w-full p-2 border border-gray-300 rounded-lg"
          >
            <option value="">请选择房型</option>
            <option value="Single Bed">单人间</option>
            <option value="Double Bed">双人间</option>
            <option value="Luxury Room">豪华房</option>
            <option value="Family Suite">家庭套房</option>
          </select>
        </div>
        <div>
          <p className="mt-4 text-gray-800">价格（元/晚）</p>
          <input
            type="number"
            placeholder="0"
            className="w-full p-2 border border-gray-300 rounded-lg"
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

      <p className="text-lg font-semibold text-neutral-800 mt-4 mb-2">房间设施</p>
      <div>
        {Object.keys(inputData.amenities).map((amenity, index) => (
          <div key={amenity} className="flex items-center gap-2 mb-2">
            <input
              type="checkbox"
              id={`editAmenity${index}`}
              checked={inputData.amenities[amenity]}
              onChange={(e) =>
                setInputData({
                  ...inputData,
                  amenities: { ...inputData.amenities, [amenity]: e.target.checked },
                })
              }
            />
            <label htmlFor={`editAmenity${index}`} className="text-gray-800">
              {amenityLabelMap[amenity] || amenity}
            </label>
            <button type="button" onClick={() => handleRemoveAmenity(amenity)} className="text-xs text-red-500 hover:underline">
              删除
            </button>
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            placeholder="输入自定义设施，如 健身房"
            className="flex-1 border rounded p-2 text-sm"
          />
          <button type="button" onClick={handleAddAmenity} className="px-3 py-1 text-xs bg-blue-500 text-white rounded">
            添加设施
          </button>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          type="button"
          onClick={() => navigate(getBackUrl())}
          className="px-4 py-2 rounded-lg bg-black text-white hover:bg-gray-800"
        >
          返回房间列表
        </button>
        <button
          type="submit"
          disabled={saving}
          className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '保存中...' : '保存修改'}
        </button>
      </div>
    </form>
  );
}

export default EditRoom;
