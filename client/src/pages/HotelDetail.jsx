import { useEffect, useState, useRef, useMemo } from "react";
import { addDays, differenceInCalendarDays } from "date-fns";
import DatePicker from "react-datepicker";
import { flip, offset } from "@floating-ui/react";
import { zhCN } from "date-fns/locale/zh-CN";
import { formatLocalDate, formatDateShort, formatDateSuffix, getTodayLocal, parseLocalDate } from "../utils/dateUtils";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import HotelReviews from "../components/HotelReviews";
import { HotelImageCarousel } from "../components/HotelImageCarousel";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { IoLocationOutline } from "react-icons/io5";
import { assets } from "../assets/assets";
import toast from "react-hot-toast";
import "react-datepicker/dist/react-datepicker.css";
import { SkeletonHotelDetail } from "../components/Skeleton";

import { getRoomTypeLabel } from '../utils/roomTypes';

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

const ROOMS_PER_PAGE = 10;

/** 酒店详情页 - 房型列表分页展示，每页最多 10 条 */
function HotelDetail() {
    const { id } = useParams();
    const [currentPage, setCurrentPage] = useState(1);
    const navigate = useNavigate();
    const { axios, getToken, isAuthenticated, userInfo, setUserInfo, fetchUser, role } = useAppContext();
    const isFavorited = isAuthenticated && userInfo?.favoriteHotels?.some((hid) => String(hid) === id);
    const [searchParams] = useSearchParams();
    const [hotel, setHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [showOwnHotelModal, setShowOwnHotelModal] = useState(false);
    const roomsSectionRef = useRef(null);
    const [roomAvailability, setRoomAvailability] = useState({});
    const [loadingRoomsSection, setLoadingRoomsSection] = useState(false);
    const [favoriteLoading, setFavoriteLoading] = useState(false);

    // 可动态调整的搜索条件（与首页搜索栏一致，无目的地）
    const [checkIn, setCheckIn] = useState("");
    const [checkOut, setCheckOut] = useState("");
    const [adults, setAdults] = useState(2);
    const [children, setChildren] = useState(0);
    const [roomCount, setRoomCount] = useState(1);
    const [pets, setPets] = useState(false);
    const [guestsOpen, setGuestsOpen] = useState(false);
    const [datePickerOpen, setDatePickerOpen] = useState(false);
    const guestsRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/api/hotels/public/${id}`);
                if (data.success) {
                    setHotel(data.hotel);
                    setRooms(data.rooms || []);
                }
            } catch (e) {
                setHotel(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    useEffect(() => {
        if (!hotel || role !== 'merchant' || !userInfo?._id) return;
        const isOwn = hotel?.owner && String(hotel.owner) === String(userInfo._id);
        if (isOwn) setShowOwnHotelModal(true);
    }, [hotel, role, userInfo]);

    const totalPages = Math.max(1, Math.ceil(rooms.length / ROOMS_PER_PAGE));
    const roomsToShow = useMemo(() => {
        const start = (currentPage - 1) * ROOMS_PER_PAGE;
        return rooms.slice(start, start + ROOMS_PER_PAGE);
    }, [rooms, currentPage]);

    useEffect(() => {
        if (currentPage > totalPages) setCurrentPage(1);
    }, [currentPage, totalPages]);

    useEffect(() => {
        setCurrentPage(1);
    }, [id]);

    // 从 URL 同步搜索条件
    useEffect(() => {
        const cIn = searchParams.get("checkIn") || getTodayLocal();
        const cOut = searchParams.get("checkOut") || (cIn ? formatLocalDate(addDays(parseLocalDate(cIn), 1)) : "");
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
        if (!guestsOpen) return;
        const handleClickOutside = (e) => {
            if (guestsRef.current && !guestsRef.current.contains(e.target)) setGuestsOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [guestsOpen]);

    // 日期或人数变化时，刷新下半部分房间与价格：重新拉取房型数据并检查库存
    useEffect(() => {
        if (!id) return;
        if (!checkIn || !checkOut) {
            setRoomAvailability({});
            return;
        }
        let cancelled = false;
        setLoadingRoomsSection(true);
        axios
            .get(`/api/hotels/public/${id}`)
            .then(({ data }) => {
                if (cancelled) return;
                const roomList = data.success ? (data.rooms || []) : [];
                if (data.success) {
                    setHotel(data.hotel);
                    setRooms(roomList);
                }
                if (roomList.length === 0) {
                    setRoomAvailability({});
                    return;
                }
                return Promise.all(
                    roomList.map((r) =>
                        axios.post("/api/bookings/check-availability", {
                            room: r._id,
                            checkInDate: checkIn,
                            checkOutDate: checkOut,
                            roomQuantity: roomCount,
                        })
                    )
                ).then((responses) => {
                    if (cancelled) return;
                    const map = {};
                    responses.forEach(({ data: res }, i) => {
                        map[roomList[i]._id] = res.success && res.isAvail;
                    });
                    setRoomAvailability(map);
                });
            })
            .catch(() => {
                if (!cancelled) setRoomAvailability({});
            })
            .finally(() => {
                if (!cancelled) setLoadingRoomsSection(false);
            });
        return () => { cancelled = true; };
    }, [checkIn, checkOut, adults, children, roomCount, id, axios]);

    async function toggleFavorite(e) {
        e.stopPropagation();
        if (!isAuthenticated) {
            toast.error("请先登录");
            navigate("/login");
            return;
        }
        if (favoriteLoading) return;
        setFavoriteLoading(true);
        try {
            const token = await getToken();
            const willUnfavorite = isFavorited;
            const headers = { Authorization: `Bearer ${token}` };
            const { data } = willUnfavorite
                ? await axios.delete(`/api/users/favorites/${id}`, { headers })
                : await axios.post(`/api/users/favorites/${id}`, {}, { headers });
            if (data.success) {
                setUserInfo((prev) => ({
                    ...prev,
                    favoriteHotels: (data.favoriteHotels || []).map((hid) => String(hid)),
                }));
                toast.success(willUnfavorite ? "已取消收藏" : "已添加收藏");
                await fetchUser(); // 刷新用户数据，确保收藏状态同步
            }
        } catch (err) {
            toast.error(err.response?.data?.message || "操作失败");
        } finally {
            setFavoriteLoading(false);
        }
    }

    if (loading) return <SkeletonHotelDetail />;
    if (!hotel) return <div className="pt-28 p-4">酒店不存在</div>;

    return (
        <div className="pt-24 pb-16 px-4 md:px-8 lg:px-12 max-w-5xl mx-auto">
            {showOwnHotelModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4" onClick={() => setShowOwnHotelModal(false)} role="dialog" aria-modal="true">
                    <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full text-center" onClick={(e) => e.stopPropagation()}>
                        <p className="text-gray-800 font-medium mb-6">不能预定自己名下的酒店哦</p>
                        <button
                            type="button"
                            onClick={() => setShowOwnHotelModal(false)}
                            className="w-full py-2.5 rounded-lg bg-black text-white font-medium hover:bg-gray-800"
                        >
                            知道了
                        </button>
                    </div>
                </div>
            )}
            <div className="mb-4">
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => {
                            const params = new URLSearchParams();
                            if (hotel?.city) params.set("destination", hotel.city);
                            if (checkIn) params.set("checkIn", checkIn);
                            if (checkOut) params.set("checkOut", checkOut);
                            params.set("adults", String(adults));
                            params.set("children", String(children));
                            params.set("rooms", String(roomCount));
                            const q = params.toString();
                            navigate(q ? `/rooms?${q}` : "/rooms");
                        }}
                        className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                    >
                        返回
                    </button>
                    <div className="flex-1" />
                    <button
                        type="button"
                        onClick={toggleFavorite}
                        disabled={favoriteLoading}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        title={isFavorited ? "点击取消收藏" : "收藏"}
                    >
                        {isFavorited ? (
                            <FaHeart className="w-5 h-5 text-red-500" />
                        ) : (
                            <FaRegHeart className="w-5 h-5" />
                        )}
                        <span className="text-sm">{isFavorited ? "已收藏" : "收藏"}</span>
                    </button>
                </div>
                <h1 className="text-4xl font-extrabold text-gray-800 mt-4 mb-1">
                    {hotel.name}
                    {(hotel.starRating ?? 0) > 0 && (
                        <span className="text-[#f7ad1a] text-2xl ml-2">
                            {Array.from({ length: hotel.starRating }, (_, i) => (
                                <svg key={i} viewBox="0 0 24 24" className="inline-block w-6 h-6 align-middle">
                                    <path d="M12 2l3 7h7l-5.5 4 2 7-6.5-4.5L5.5 20l2-7L2 9h7z" fill="currentColor" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
                                </svg>
                            ))}
                        </span>
                    )}
                </h1>
                {(hotel.address || hotel.doorNumber) && (
                    <a
                        href={hotel.latitude != null && hotel.longitude != null
                            ? `/travel-map?lat=${hotel.latitude}&lng=${hotel.longitude}`
                            : `/travel-map?q=${encodeURIComponent([hotel.address, hotel.doorNumber].filter(Boolean).join(' '))}`}
                        onClick={(e) => {
                            e.preventDefault();
                            if (hotel.latitude != null && hotel.longitude != null) {
                                navigate(`/travel-map?lat=${hotel.latitude}&lng=${hotel.longitude}`);
                            } else {
                                navigate(`/travel-map?q=${encodeURIComponent([hotel.address, hotel.doorNumber].filter(Boolean).join(' '))}`);
                            }
                        }}
                        className="inline-flex items-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors mt-2"
                    >
                        <IoLocationOutline className="w-4 h-4 flex-shrink-0" />
                        <span>{[hotel.address, hotel.doorNumber].filter(Boolean).join(' ')}</span>
                    </a>
                )}
            </div>

            {/* 顶部轮播：商户中心酒店展示图，点击打开查看 */}
            <div className="relative rounded-xl overflow-hidden mb-6" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                {(() => {
                    const displayImages =
                        (hotel?.images?.length
                            ? hotel.images
                            : (hotel?.hotelExteriorImages?.length
                                ? hotel.hotelExteriorImages
                                : (hotel?.hotelInteriorImages || []))) || [];
                    return (
                <HotelImageCarousel
                    images={displayImages}
                    fallbackImage={rooms?.[0]?.images?.[0]}
                    className="w-full h-64 md:h-96"
                    imageClassName="min-h-[16rem] md:min-h-[24rem]"
                    onImageClick={(url) => { setLightboxImage(url); setLightboxOpen(true); }}
                />
                    );
                })()}
            </div>
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
                        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 text-white flex items-center justify-center hover:bg-white/30 text-xl leading-none z-10 cursor-pointer"
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

            {/* 酒店基础信息 + 酒店介绍 */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                {hotel.hotelIntro && (
                    <div className="mt-3">
                        <h2 className="text-base font-semibold text-gray-800 mb-1">酒店介绍</h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {hotel.hotelIntro}
                        </p>
                    </div>
                )}
            </div>

            {/* 当前搜索条件：与首页搜索栏一致（无目的地），可动态调整 */}
            <div className="bg-white rounded-xl p-6 mb-6" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">当前搜索条件</h2>
                <div
                    className="flex flex-col sm:flex-row sm:items-end gap-4 flex-wrap"
                    onClick={(e) => {
                        if (!e.target.closest("input, button, label, .react-datepicker-wrapper")) document.activeElement?.blur?.();
                    }}
                >
                    <div className="w-full sm:w-auto sm:min-w-[320px] sm:flex-shrink-0">
                        <DatePicker
                            selectsRange
                            startDate={checkIn ? parseLocalDate(checkIn) : null}
                            endDate={checkOut ? parseLocalDate(checkOut) : null}
                            onChange={(dates) => {
                                let [start, end] = dates || [null, null];
                                if (start && end && end <= start) end = addDays(start, 1);
                                setCheckIn(start ? formatLocalDate(start) : "");
                                setCheckOut(end ? formatLocalDate(end) : "");
                            }}
                            onCalendarOpen={() => setDatePickerOpen(true)}
                            onCalendarClose={() => setDatePickerOpen(false)}
                            minDate={new Date()}
                            monthsShown={2}
                            customInput={
                                <button
                                    type="button"
                                    className={`rounded-lg border px-3 py-2.5 text-sm outline-none w-full text-left min-h-[48px] flex items-stretch gap-3 overflow-hidden ${datePickerOpen ? "border-gray-700 bg-gray-100/50" : "border-gray-200"}`}
                                >
                                    <div className="flex flex-col justify-center min-w-0 shrink">
                                        <span className="text-xs text-gray-600">入住</span>
                                        <span className="font-semibold text-gray-900 truncate">
                                            {checkIn ? formatDateShort(parseLocalDate(checkIn)) : "—"}
                                            {checkIn && <span className="text-xs font-normal text-gray-500 ml-0.5">{formatDateSuffix(parseLocalDate(checkIn))}</span>}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 text-gray-500 text-sm">
                                        <span className="text-gray-400">—</span>
                                        <span className="whitespace-nowrap">{checkIn && checkOut ? differenceInCalendarDays(parseLocalDate(checkOut), parseLocalDate(checkIn)) : 0}晚</span>
                                        <span className="text-gray-400">—</span>
                                    </div>
                                    <div className="flex flex-col justify-center items-end min-w-0 shrink">
                                        <span className="text-xs text-gray-600">退房</span>
                                        <span className="font-semibold text-gray-900 truncate text-right">
                                            {checkOut ? formatDateShort(parseLocalDate(checkOut)) : "—"}
                                            {checkOut && <span className="text-xs font-normal text-gray-500 ml-0.5">{formatDateSuffix(parseLocalDate(checkOut))}</span>}
                                        </span>
                                    </div>
                                </button>
                            }
                            popperClassName="hero-datepicker-popper"
                            popperPlacement="bottom-start"
                            popperProps={{ middleware: [flip({ padding: 15 }), offset(0)] }}
                            locale={zhCN}
                            calendarStartDay={0}
                        />
                    </div>
                    <div className="relative w-full sm:w-[220px] sm:flex-shrink-0" ref={guestsRef}>
                        <div className="flex items-center gap-2 mb-1">
                            <img src={assets.guestsIcon} alt="" className="w-4 h-4 flex-shrink-0 opacity-70" />
                            <label className="text-sm text-gray-600">人数</label>
                        </div>
                        <button
                            type="button"
                            onClick={() => setGuestsOpen((o) => !o)}
                            className={`flex items-center gap-2 rounded-lg border px-3 py-2.5 text-sm outline-none w-full min-h-[48px] text-left cursor-pointer ${guestsOpen ? "border-gray-700 bg-gray-100/50" : "border-gray-200"}`}
                        >
                            <span className="text-gray-900 font-semibold flex-1 truncate">
                                {adults}位成人 · {children}名儿童 · {roomCount}间客房
                            </span>
                            <svg className="w-4 h-4 flex-shrink-0 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                        {guestsOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 py-4 px-4 rounded-lg bg-white/95 backdrop-blur-sm border border-gray-200/80 shadow-lg z-20">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">成人</span>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => setAdults((a) => Math.max(1, a - 1))} disabled={adults <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                            <span className="w-8 text-center text-sm font-medium">{adults}</span>
                                            <button type="button" onClick={() => setAdults((a) => Math.min(9, a + 1))} disabled={adults >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">儿童</span>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => setChildren((c) => Math.max(0, c - 1))} disabled={children <= 0} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                            <span className="w-8 text-center text-sm font-medium">{children}</span>
                                            <button type="button" onClick={() => setChildren((c) => Math.min(9, c + 1))} disabled={children >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm text-gray-700">客房</span>
                                        <div className="flex items-center gap-1">
                                            <button type="button" onClick={() => setRoomCount((r) => Math.max(1, r - 1))} disabled={roomCount <= 1} className="w-8 h-8 flex items-center justify-center rounded border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed">−</button>
                                            <span className="w-8 text-center text-sm font-medium">{roomCount}</span>
                                            <button type="button" onClick={() => setRoomCount((r) => Math.min(9, r + 1))} disabled={roomCount >= 9} className="w-8 h-8 flex items-center justify-center rounded border border-gray-600 text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                        </div>
                                    </div>
                                    <div className="pt-2 border-t border-gray-100">
                                        <div className="flex items-center justify-between">
                                            <span className="text-sm text-gray-700">携带宠物?</span>
                                            <button type="button" role="switch" aria-checked={pets} onClick={() => setPets((p) => !p)} className={`relative inline-flex w-11 h-6 rounded-full transition-colors ${pets ? "bg-blue-500" : "bg-gray-300"}`}>
                                                <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-all duration-200 ${pets ? "left-[22px]" : "left-0.5"}`} />
                                            </button>
                                        </div>
                                        <p className="text-xs text-gray-500 mt-2">辅助动物不视为宠物。</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setGuestsOpen(false)} className="mt-4 w-full py-2.5 rounded-lg bg-black text-white text-sm font-medium hover:bg-gray-800">完成</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* 用户评价 */}
            <HotelReviews hotelId={id} />

            {/* 房型价格列表：分页展示，每页最多 10 条 */}
            <div ref={roomsSectionRef}>
            <h2 className="text-lg font-bold mb-4">
                房型与价格{rooms.length > 0 ? `（共 ${rooms.length} 间）` : ""}
                {loadingRoomsSection && <span className="ml-2 text-sm font-normal text-gray-500">正在更新…</span>}
            </h2>
            <div className="space-y-4">
                {rooms.length === 0 ? (
                    <p className="text-gray-500">暂无房型</p>
                ) : (
                    <div className="space-y-4 rounded-xl">
                        {roomsToShow.map((room) => {
                                    const isUnavailable = checkIn && checkOut && roomAvailability[room._id] === false;
                                    const isAdmin = role === 'admin';
                                    const isOwnHotel = role === 'merchant' && hotel?.owner && userInfo?._id && String(hotel.owner) === String(userInfo._id);
                                    const canBook = !isAdmin && !isOwnHotel && !isUnavailable;
                                    const handleCardClick = () => {
                                        if (isAdmin) { toast('管理员不能预订酒店'); return; }
                                        if (isOwnHotel) { toast('不能预定自己名下的酒店哦'); return; }
                                        if (isUnavailable) return;
                                        const params = new URLSearchParams();
                                        if (checkIn) params.set("checkIn", checkIn);
                                        if (checkOut) params.set("checkOut", checkOut);
                                        params.set("adults", String(adults));
                                        params.set("children", String(children));
                                        params.set("rooms", String(roomCount));
                                        const q = params.toString();
                                        navigate(q ? `/rooms/${room._id}?${q}` : `/rooms/${room._id}`);
                                    };
                                    return (
                                        <div
                                            key={room._id}
                                            role="button"
                                            tabIndex={0}
                                            onClick={handleCardClick}
                                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleCardClick(); } }}
                                            className={`bg-white rounded-xl p-4 flex flex-col md:flex-row md:items-center gap-4 transition-transform duration-200 hover:scale-[1.02] cursor-pointer ${isUnavailable ? "opacity-75" : ""}`}
                                            style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}
                                        >
                                            <div className="relative w-full md:w-48 h-32 flex-shrink-0">
                                                {room.images?.[0] && (
                                                    <img src={room.images[0]} alt="" className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" />
                                                )}
                                                {isUnavailable && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-lg">
                                                        <span className="bg-gray-700/90 text-white px-3 py-1.5 rounded-lg text-sm font-medium">已订完</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{getRoomTypeLabel(room.roomType)}</p>
                                                <div className="flex flex-wrap gap-2 mt-2">
                                                    {room.amenties?.map((a, i) => (
                                                        <span key={i} className="text-xs text-gray-600">{facilityLabelMap[a] || a}</span>
                                                    ))}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-xl font-bold">
                                                    {(room.promoDiscount != null && room.promoDiscount > 0)
                                                        ? Math.round(room.pricePerNight * (1 - room.promoDiscount / 100))
                                                        : room.pricePerNight} 元
                                                </span>
                                                <span className="text-gray-500 text-sm">/晚</span>
                                                {(room.promoDiscount != null && room.promoDiscount > 0) && (
                                                    <span className="text-sm text-amber-600">已享{room.promoDiscount}%优惠</span>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); handleCardClick(); }}
                                                    className={`ml-2 px-4 py-2 rounded text-sm font-medium ${!canBook ? "bg-gray-400 text-gray-200 cursor-not-allowed" : "bg-black text-white hover:bg-gray-800 cursor-pointer"}`}
                                                    title={isAdmin ? '管理员不能预订酒店' : isOwnHotel ? '不能预订自己的酒店' : undefined}
                                                    disabled={!canBook}
                                                >
                                                    预订
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                    </div>
                )}
                {rooms.length > ROOMS_PER_PAGE && (
                    <div className="mt-4 flex items-center justify-center gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                            disabled={currentPage <= 1}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            上一页
                        </button>
                        <span className="text-sm text-gray-600">
                            第 {currentPage} / {totalPages} 页，共 {rooms.length} 间房型
                        </span>
                        <button
                            type="button"
                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                            disabled={currentPage >= totalPages}
                            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                        >
                            下一页
                        </button>
                    </div>
                )}
            </div>
            </div>
        </div>
    );
}

export default HotelDetail;
