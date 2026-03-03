import { useEffect, useState } from 'react';
import { addDays, differenceInCalendarDays } from 'date-fns';
import { formatLocalDate, formatDateShort, formatDateSuffix, getTodayLocal, parseLocalDate } from '../utils/dateUtils';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import { facilityIcons, roomCommonData, assets } from '../assets/assets';
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
    const [searchParams] = useSearchParams();
    const { rooms, getToken, axios, navigate, user: userInfo, role } = useAppContext();
    const [room, setRoom] = useState(null);
    const [mainImage, setMainImage] = useState(null);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);

    const [checkIn, setCheckIn] = useState('');
    const [checkOut, setCheckOut] = useState('');
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [roomCount, setRoomCount] = useState(1);
    const [roomNotFound, setRoomNotFound] = useState(false);
    const [availableInventory, setAvailableInventory] = useState(null);
    const [inventoryExceededModal, setInventoryExceededModal] = useState(false);
    const [guestName, setGuestName] = useState('');
    const [guestEmail, setGuestEmail] = useState('');
    const [guestPhone, setGuestPhone] = useState('');
    const [guestRemark, setGuestRemark] = useState('');

    // 从 URL 预填首页带来的入住/退房/人数，与首页搜索栏一致
    useEffect(() => {
        const cIn = searchParams.get("checkIn") || getTodayLocal();
        const cOut = searchParams.get("checkOut") || (cIn ? formatLocalDate(addDays(parseLocalDate(cIn), 1)) : '');
        setCheckIn(cIn);
        setCheckOut(cOut);
        const a = searchParams.get("adults");
        if (a != null && Number(a) >= 1) setAdults(Number(a));
        const c = searchParams.get("children");
        if (c != null && Number(c) >= 0) setChildren(Number(c));
        const r = searchParams.get("rooms");
        if (r != null && Number(r) >= 1) setRoomCount(Number(r));
    }, [searchParams]);

    useEffect(() => {
        setRoomNotFound(false);
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
            } else {
                setRoomNotFound(true);
            }
        }).catch((err) => {
            if (err.response?.status === 404) setRoomNotFound(true);
        });
    }, [rooms, id]);

    const isOwnHotel = role === 'merchant' && room?.hotel?.owner && userInfo?._id && String(room.hotel.owner) === String(userInfo._id);
    useEffect(() => {
        if (isOwnHotel) toast('不能预定自己名下的酒店哦');
    }, [isOwnHotel]);

    useEffect(() => {
        if (userInfo?.username) setGuestName(userInfo.username);
    }, [userInfo?.username]);

    // 日期或房间变化时检查剩余库存
    useEffect(() => {
        if (!id || !checkIn || !checkOut || checkIn >= checkOut) {
            setAvailableInventory(null);
            return;
        }
        axios
            .post('/api/bookings/check-availability', {
                room: id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                roomQuantity: 1,
            })
            .then(({ data }) => {
                if (data.success && typeof data.available === 'number') {
                    setAvailableInventory(data.available);
                } else {
                    setAvailableInventory(null);
                }
            })
            .catch(() => setAvailableInventory(null));
    }, [id, checkIn, checkOut, axios]);

    async function handleSubmit(e) {
        e.preventDefault();
        if (!checkIn || !checkOut || checkIn >= checkOut) {
            toast.error("请选择入住与退房日期，且入住应早于退房");
            return;
        }
        if (!guestName?.trim()) {
            toast.error("请填写姓名");
            return;
        }
        if (!guestEmail?.trim()) {
            toast.error("请填写邮箱");
            return;
        }
        if (!guestPhone?.trim()) {
            toast.error("请填写手机号");
            return;
        }
        const token = await getToken();
        if (!token) {
            toast.error("请先登录后再预订");
            navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            return;
        }
        try {
            const guests = adults + children;
            const { data } = await axios.post("/api/bookings/book", {
                room: id,
                checkInDate: checkIn,
                checkOutDate: checkOut,
                guests,
                roomQuantity: roomCount,
                paymentMethod: "Pay At Hotel",
                guestName: guestName?.trim() || undefined,
                guestEmail: guestEmail?.trim() || undefined,
                guestPhone: guestPhone?.trim() || undefined,
                guestRemark: guestRemark?.trim() || undefined,
            }, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (data.success) {
                toast.success(data.message);
                navigate("/my-bookings");
                scrollTo(0, 0);
            } else {
                toast.error(data.message || "预订失败");
            }
        } catch (error) {
            const msg = error.response?.status === 401
                ? "登录已过期，请重新登录"
                : (error.response?.data?.message || "预订失败");
            toast.error(msg);
            if (error.response?.status === 401) {
                navigate(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`);
            }
        }
    }

    if (roomNotFound) {
        return (
            <div className="pt-28 md:pt-36 px-4 flex flex-col items-center justify-center min-h-[40vh]">
                <p className="text-gray-600 text-lg">房间不存在或已下架</p>
                <button
                    onClick={() => { navigate("/rooms"); scrollTo(0, 0); }}
                    className="mt-4 bg-black hover:bg-gray-800 text-white px-6 py-2 rounded-full"
                >
                    查看全部房间
                </button>
            </div>
        );
    }

    return room ? (
        <div className='pt-28 md:pt-36 px-4 md:px-8 lg:px-12 max-w-5xl mx-auto mb-16'>

            {/* Room Title */}
            <div className="mb-6">
                <h1 className='text-2xl md:text-3xl font-bold text-gray-800'>
                    {room.hotel?._id ? (
                        <Link to={`/hotels/${room.hotel._id}`} className="hover:text-blue-600 hover:underline transition">
                            {room.hotel.name}
                        </Link>
                    ) : (
                        room.hotel?.name
                    )}
                    <span className='text-lg font-medium text-gray-600'> - {getRoomTypeLabel(room.roomType)}</span>
                </h1>
                <p className='text-green-600 font-semibold mt-2'>限时优惠</p>
            </div>

            {/* Location */}
            <div className="flex items-center text-sm text-gray-500 mb-8 gap-2">
                <FaLocationArrow className='text-gray-500' />
                <span>{[room.hotel.address, room.hotel.doorNumber].filter(Boolean).join(' ')}</span>
            </div>

            {/* Images：点击可放大展示 */}
            <div className="flex flex-col lg:flex-row gap-4 mb-10">
                <div className="flex-1 cursor-zoom-in rounded-xl overflow-hidden" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }} onClick={() => { setLightboxImage(mainImage); setLightboxOpen(true); }}>
                    <img src={mainImage} alt="房间主图" className="rounded-xl object-cover w-full h-64 md:h-96" />
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
                    在 {room.hotel?._id ? (
                        <Link to={`/hotels/${room.hotel._id}`} className="hover:text-blue-600 hover:underline transition">
                            {room.hotel.name}
                        </Link>
                    ) : (
                        room.hotel?.name
                    )}{' '}
                    体验 {getRoomTypeLabel(room.roomType)} 的舒适空间
                </h2>

                <div className="flex flex-wrap gap-4 mb-4">
                    {room.amenties.map((item, index) => (
                        <div key={index} className='flex items-center gap-2 border px-3 py-2 rounded-full text-sm shadow-sm'>
                            {facilityIcons[item] && <img src={facilityIcons[item]} alt="" className='w-5 h-5' />}
                            <span>{facilityLabelMap[item] || item}</span>
                        </div>
                    ))}
                </div>

                <p className="text-xl font-bold text-gray-800">
                    {(room.promoDiscount != null && room.promoDiscount > 0)
                        ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100))
                        : room.pricePerNight} 元
                    <span className="text-sm text-gray-500">/晚</span>
                    {(room.promoDiscount != null && room.promoDiscount > 0) && (
                        <span className="ml-2 text-sm font-normal text-amber-600">已享{room.promoDiscount}%优惠</span>
                    )}
                </p>
            </div>

            {/* Booking Form - 与首页搜索栏一致（无目的地）；管理员不可订，商家不可订自己的酒店 */}
            {(() => {
                const isAdmin = role === 'admin';
                const isOwnHotel = role === 'merchant' && room?.hotel?.owner && userInfo?._id && String(room.hotel.owner) === String(userInfo._id);
                const canBook = !isAdmin && !isOwnHotel;
                if (!canBook) {
                    return (
                        <div className="bg-white rounded-2xl p-6 mb-12" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                            <h3 className="text-lg font-semibold mb-4 text-gray-800">立即预订</h3>
                            <p className="text-gray-600 py-4">
                                {isAdmin ? '管理员不能预订酒店' : '不能预定自己名下的酒店哦'}
                            </p>
                        </div>
                    );
                }
                const nights = checkIn && checkOut ? differenceInCalendarDays(parseLocalDate(checkOut), parseLocalDate(checkIn)) : 0;
                return (
            <>
            <form
                onSubmit={handleSubmit}
                className="bg-white rounded-2xl p-6 mb-12"
                style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}
            >
                <h3 className="text-lg font-semibold mb-4 text-gray-800">预定信息确认单</h3>
                {/* 第一行：日期、人数、酒店、房型（只读） */}
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 mb-4 space-y-2">
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                        <span>入住：{checkIn ? formatDateShort(parseLocalDate(checkIn)) + (formatDateSuffix(parseLocalDate(checkIn)) || '') : '—'}</span>
                        <span>退房：{checkOut ? formatDateShort(parseLocalDate(checkOut)) + (formatDateSuffix(parseLocalDate(checkOut)) || '') : '—'}</span>
                        <span>{nights}晚</span>
                        <span>{adults}位成人 · {children}名儿童 ·</span>
                        <span className="flex items-center gap-1">
                            间数：
                            <button type="button" onClick={() => setRoomCount((r) => Math.max(1, r - 1))} disabled={roomCount <= 1} className="w-7 h-7 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm">−</button>
                            <span className="w-7 text-center font-medium">{roomCount}</span>
                            <button
                                type="button"
                                onClick={() => {
                                    const next = roomCount + 1;
                                    if (typeof availableInventory === 'number' && next > availableInventory) {
                                        setInventoryExceededModal(true);
                                    } else {
                                        setRoomCount((r) => Math.min(9, r + 1));
                                    }
                                }}
                                disabled={roomCount >= 9}
                                className="w-7 h-7 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                            >
                                +
                            </button>
                        </span>
                    </div>
                    <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-700">
                        <span>酒店：{room?.hotel?._id ? (
                            <Link to={`/hotels/${room.hotel._id}`} className="hover:text-blue-600 hover:underline transition">
                                {room.hotel.name}
                            </Link>
                        ) : (
                            room?.hotel?.name || '—'
                        )}</span>
                        <span>房型：{room ? getRoomTypeLabel(room.roomType) : '—'}</span>
                        <span className="font-medium">预估总价：{room && checkIn && checkOut ? (() => {
                            const pricePerNight = (room.promoDiscount != null && room.promoDiscount > 0)
                                ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100))
                                : room.pricePerNight;
                            return (pricePerNight * nights * roomCount).toFixed(0);
                        })() : '—'} 元</span>
                    </div>
                </div>
                <div className="space-y-4 mb-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">姓名 <span className="text-red-500">*</span></label>
                        <input
                            type="text"
                            value={guestName}
                            onChange={(e) => setGuestName(e.target.value)}
                            placeholder="请输入姓名"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">邮箱 <span className="text-red-500">*</span></label>
                        <input
                            type="email"
                            value={guestEmail}
                            onChange={(e) => setGuestEmail(e.target.value)}
                            placeholder="请输入邮箱"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">手机号 <span className="text-red-500">*</span></label>
                        <input
                            type="tel"
                            value={guestPhone}
                            onChange={(e) => setGuestPhone(e.target.value)}
                            placeholder="请输入手机号"
                            className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800"
                            required
                        />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">备注（选填）</label>
                    <textarea
                        value={guestRemark}
                        onChange={(e) => setGuestRemark(e.target.value)}
                        placeholder="如有特殊需求可在此填写"
                        rows={2}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-800 focus:border-gray-800 resize-none"
                    />
                </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                    <button type="submit" className="bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition">
                        确认预订
                    </button>
                    <button type="button" onClick={() => navigate(-1)} className="bg-white border border-gray-300 text-gray-700 px-5 py-2 rounded-lg hover:bg-gray-50 transition">
                        返回
                    </button>
                </div>
            </form>

            {/* 间数超出库存弹窗 */}
            {inventoryExceededModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setInventoryExceededModal(false)}>
                    <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">库存不足</h3>
                        <p className="text-sm text-gray-600 mb-4">
                            当前选择数量已超过剩余最大库存，最多可订 {availableInventory ?? 0} 间
                        </p>
                        <button
                            type="button"
                            onClick={() => setInventoryExceededModal(false)}
                            className="w-full py-2.5 bg-black text-white rounded-lg hover:bg-gray-800"
                        >
                            知道了
                        </button>
                    </div>
                </div>
            )}
            </>
                );
            })()}

            {/* Room Specs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                {roomCommonData.map((spec, index) => (
                    <div key={index} className="flex items-start gap-4 bg-white rounded-xl p-4" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                        <img src={spec.icon} alt={spec.title} className="w-10 h-10" />
                        <div>
                            <h3 className="font-semibold text-gray-800">{spec.title}</h3>
                            <p className="text-sm text-gray-600">{spec.description}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Room Story */}
            <div className="bg-gray-50 p-6 rounded-xl mb-8" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                    在我们的客房中享受舒适与雅致，无论是商务出行还是休闲度假，均可享受完善设施、宽敞空间与贴心服务。立即预订，开启难忘入住体验。
                </p>
            </div>

        </div>
    ) : null;
}

export default RoomDetail;
