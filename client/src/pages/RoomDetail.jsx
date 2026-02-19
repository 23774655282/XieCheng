import { useEffect, useState } from 'react';
import { addDays } from 'date-fns';
import { formatLocalDate, getTodayLocal, parseLocalDate } from '../utils/dateUtils';
import { useParams } from 'react-router-dom';
import { facilityIcons, roomCommonData } from '../assets/assets';
import { FaLocationArrow } from 'react-icons/fa';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

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
const roomTypeLabelMap = {
    'Single Bed': '单人间',
    'Double Bed': '双人间',
    'Luxury Room': '豪华房',
    'Family Suite': '家庭套房',
};
function getRoomTypeLabel(roomType) {
    return roomTypeLabelMap[roomType] || roomType;
}

function RoomDetail() {
    const { id } = useParams();
    const {rooms,getToken,axios,navigate} = useAppContext(); 
    const [room, setRoom] = useState(null);
    const [mainImage, setMainImage] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    const [checkInDate,setCheckInDate] = useState(null);

    const [guests, setGuests] = useState(1);

    const [isAvailable, setIsAvailable] = useState(false)


    const [checkOutDate, setCheckOutDate] = useState(null);



    console.log(rooms)

    useEffect(() => {
        const selectedRoom = rooms.find((r) => r._id === id);
        if (selectedRoom) {
            setRoom(selectedRoom);
            setMainImage(selectedRoom.images?.[0]);
            return;
        }
        // 分页后可能不在 context 中，按 id 拉取
        axios.get(`/api/rooms/${id}`).then(({ data }) => {
            if (data.success && data.room) {
                setRoom(data.room);
                setMainImage(data.room.images?.[0]);
            }
        }).catch(() => {});
    }, [rooms, id]);


    async function checkAvailability() {
        try {
            if (checkInDate >= checkOutDate) {
                toast.error("入住日期应早于退房日期");
                return;
            }

            const {data} = await axios.post("/api/bookings/check-availability",{
                room:id,
                checkInDate,
                checkOutDate
            })

            console.log(data)

            if (data.success) {
                if (data.isAvail) {
                    setIsAvailable(true);
                    toast.success("该日期可选")
                }else{
                    setIsAvailable(false)
                    toast.error("该日期不可选")
                }
            }else{
                toast.error(data.message)
            }
        } catch (error) {
            toast.error("查询可用性失败")
        }
    }

    async function handleSubmit(e) {
        e.preventDefault();
        const token = await getToken();
        try {
            if (!isAvailable) {
                return checkAvailability();
            }else{
                const {data} = await axios.post("/api/bookings/book",{
                    room:id,
                    checkInDate,
                    checkOutDate,
                    guests,
                    paymentMethod:"Pay At Hotel"
                },{
                    headers:{
                        Authorization:`Bearer ${token}`
                    }
                })

                if (data.success) {
                    toast.success(data.message)
                    navigate("/my-bookings")
                    scrollTo(0,0)
                }else{
                    toast.error(data.message)
                }
            }
        } catch (error) {
            toast.error("预订失败")
        }
    }

    return room && (
        <div className='pt-28 md:pt-36 px-4 md:px-16 lg:px-24 xl:px-32 mb-16'>

            {/* Room Title */}
            <div className="mb-6">
                <h1 className='text-2xl md:text-3xl font-bold text-gray-800'>
                    {room.hotel.name}
                    <span className='text-lg font-medium text-gray-600'> - {getRoomTypeLabel(room.roomType)}</span>
                </h1>
                <p className='text-green-600 font-semibold mt-2'>限时优惠</p>
            </div>

            {/* Location */}
            <div className="flex items-center text-sm text-gray-500 mb-8 gap-2">
                <FaLocationArrow className='text-gray-500' />
                <span>{room.hotel.address}</span>
            </div>

            {/* Images：点击可放大展示 */}
            <div className="flex flex-col lg:flex-row gap-4 mb-10">
                <div className="flex-1 cursor-zoom-in" onClick={() => { setLightboxImage(mainImage); setLightboxOpen(true); }}>
                    <img src={mainImage} alt="房间主图" className="rounded-xl object-cover w-full h-64 md:h-96 shadow" />
                </div>
                <div className="flex flex-row lg:flex-col gap-3 overflow-x-auto">
                    {room.images.length > 1 && room.images.map((image, index) => (
                        <img
                            key={index}
                            onClick={() => { setMainImage(image); setLightboxImage(image); setLightboxOpen(true); }}
                            src={image}
                            alt={`房间图 ${index + 1}`}
                            className="w-24 h-20 rounded-lg object-cover cursor-pointer border hover:scale-105 transition"
                        />
                    ))}
                </div>
            </div>

            {/* 图片放大灯箱 */}
            {lightboxOpen && lightboxImage && (
                <div
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
                    onClick={() => setLightboxOpen(false)}
                    role="dialog"
                    aria-modal="true"
                    aria-label="放大查看图片"
                >
                    <button
                        type="button"
                        onClick={() => setLightboxOpen(false)}
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl leading-none z-10"
                        aria-label="关闭"
                    >
                        ×
                    </button>
                    <img
                        src={lightboxImage}
                        alt="放大查看"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            {/* Room Description */}
            <div className="mb-10">
                <h2 className="text-xl font-semibold mb-4 text-gray-800">
                    在 {room.hotel.name} 体验 {getRoomTypeLabel(room.roomType)} 的舒适空间
                </h2>

                <div className="flex flex-wrap gap-4 mb-4">
                    {room.amenties.map((item, index) => (
                        <div key={index} className='flex items-center gap-2 border px-3 py-2 rounded-full text-sm shadow-sm'>
                            {facilityIcons[item] && <img src={facilityIcons[item]} alt="" className='w-5 h-5' />}
                            <span>{facilityLabelMap[item] || item}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xl font-bold text-gray-800">{room.pricePerNight} 元 <span className="text-sm text-gray-500">/晚</span></p>
            </div>

            {/* Booking Form */}
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl shadow-md p-6 mb-12">
                <h3 className='text-lg font-semibold mb-4 text-gray-800'>立即预订</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="flex flex-col">
                        <label htmlFor="checkInDate" className="text-sm text-gray-600 mb-1">入住日期</label>
                        <input type="date" id="checkInDate" required className="border rounded-lg p-2 outline-none"
                        onChange={(e)=>setCheckInDate(e.target.value)}
                        value={checkInDate}
                        min={getTodayLocal()}
                        
                        />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="checkOutDate" className="text-sm text-gray-600 mb-1">退房日期</label>
                        <input
                            type="date"
                            id="checkOutDate"
                            required
                            className="border rounded-lg p-2 outline-none"
                            onChange={(e) => setCheckOutDate(e.target.value)}
                            value={checkOutDate}
                            min={checkInDate ? formatLocalDate(addDays(parseLocalDate(checkInDate), 1)) : getTodayLocal()}
                            />
                    </div>
                    <div className="flex flex-col">
                        <label htmlFor="guests" className="text-sm text-gray-600 mb-1">人数</label>
                        <input type="number" id="guests" required min={1} step={1} className="border rounded-lg p-2 outline-none"
                         placeholder="1"
                        onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            setGuests((Number.isInteger(v) && v >= 1) ? v : 1);
                        }}
                        value={guests} />
                    </div>
                </div>
                <button type='submit' className="bg-blue-600 text-white px-5 py-2 rounded-lg hover:bg-blue-700 transition">
                    {isAvailable ? "立即预订" : "查询可订"}
                </button>
            </form>

            {/* Room Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {roomCommonData.map((spec, index) => (
                    <div key={index} className="flex items-start gap-4 bg-white rounded-xl shadow p-4">
                        <img src={spec.icon} alt={spec.title} className="w-10 h-10" />
                        <div>
                            <h3 className="font-semibold text-gray-800">{spec.title}</h3>
                            <p className="text-sm text-gray-600">{spec.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Room Story */}
            <div className="bg-gray-50 p-6 rounded-xl shadow mb-8">
                <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                    在我们的客房中享受舒适与雅致，无论是商务出行还是休闲度假，均可享受完善设施、宽敞空间与贴心服务。立即预订，开启难忘入住体验。
                </p>
            </div>

        </div>
    );
}

export default RoomDetail;
