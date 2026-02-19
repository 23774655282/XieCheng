import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAppContext } from "../context/AppContext";
import HotelReviews from "../components/HotelReviews";

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;

const facilityLabelMap = {
    'Free Wifi': '免费 Wi-Fi',
    'Free Breakfast': '免费早餐',
    'Room Service': '客房服务',
    'Mountain View': '山景',
    'Pool Access': '泳池使用',
};

const ROOMS_PER_PAGE = 5;

/** 大作业：酒店详情页 - 大图Banner左右滚动、基础信息、房型价格列表从低到高，房间最多先显示 5 间，支持下拉加载更多 */
function HotelDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { axios } = useAppContext();
    const [searchParams] = useSearchParams();
    const [hotel, setHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [displayedCount, setDisplayedCount] = useState(ROOMS_PER_PAGE);
    const [bannerIndex, setBannerIndex] = useState(0);
    const [loading, setLoading] = useState(true);
    const loadMoreRef = useRef(null);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/api/hotels/public/${id}`);
                if (data.success) {
                    setHotel(data.hotel);
                    setRooms(data.rooms || []);
                    setDisplayedCount(ROOMS_PER_PAGE);
                    if (data.rooms?.[0]?.images?.[0]) setBannerIndex(0);
                }
            } catch (e) {
                setHotel(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const loadMore = useCallback(() => {
        setDisplayedCount((prev) => Math.min(prev + ROOMS_PER_PAGE, rooms.length));
    }, [rooms.length]);

    useEffect(() => {
        const el = loadMoreRef.current;
        if (!el || displayedCount >= rooms.length) return;
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) loadMore();
            },
            { rootMargin: "100px", threshold: 0.1 }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [loadMore, displayedCount, rooms.length]);

    const displayedRooms = rooms.slice(0, displayedCount);
    const hasMore = displayedCount < rooms.length;

    // 当前搜索条件（从 URL 读取），仅用于展示，不含具体目的地
    const checkIn = searchParams.get("checkIn") || "";
    const checkOut = searchParams.get("checkOut") || "";
    const adults = Number(searchParams.get("adults") || 0);
    const children = Number(searchParams.get("children") || 0);
    const roomsCount = Number(searchParams.get("rooms") || 0);

    const images = [];
    if (hotel?.images?.length) images.push(...hotel.images);
    rooms.forEach((r) => r.images?.forEach((url) => images.push(url)));
    if (images.length === 0 && hotel) images.push("https://via.placeholder.com/800x400?text=Hotel");

    if (loading) return <div className="pt-28 p-4">加载中...</div>;
    if (!hotel) return <div className="pt-28 p-4">酒店不存在</div>;

    return (
        <div className="pt-24 pb-16 px-4 md:px-16">
            <div className="mb-4 flex items-center gap-3">
                <button
                    type="button"
                    onClick={() => navigate("/rooms")}
                    className="flex items-center gap-1 text-sm font-medium px-3 py-2 rounded-md bg-black text-white hover:bg-gray-800"
                >
                    <span>←</span> 返回
                </button>
                <h1 className="text-xl font-bold">{hotel.name}</h1>
            </div>

            {/* 大图 Banner 左右滚动 */}
            <div className="relative rounded-xl overflow-hidden shadow-lg mb-6">
                <div className="flex overflow-x-auto snap-x snap-mandatory gap-2 scroll-smooth" style={{ scrollbarWidth: "none" }}>
                    {images.map((url, i) => (
                        <img
                            key={i}
                            src={url}
                            alt=""
                            className="w-full flex-shrink-0 snap-center h-64 md:h-96 object-cover"
                            onClick={() => setBannerIndex(i)}
                        />
                    ))}
                </div>
                {images.length > 1 && (
                    <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                        {images.map((_, i) => (
                            <button
                                key={i}
                                type="button"
                                className={`w-2 h-2 rounded-full ${i === bannerIndex ? "bg-white" : "bg-white/50"}`}
                                onClick={() => setBannerIndex(i)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* 酒店基础信息 + 酒店介绍 */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <p className="text-gray-600">星级：{"★".repeat(hotel.starRating || 0)}</p>
                <p className="text-gray-600 mt-1">地址：{hotel.address}</p>
                {hotel.hotelIntro && (
                    <div className="mt-3">
                        <h2 className="text-base font-semibold text-gray-800 mb-1">酒店介绍</h2>
                        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                            {hotel.hotelIntro}
                        </p>
                    </div>
                )}
            </div>

            {/* 当前搜索筛选条件（无具体地点） */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-800 mb-3">当前搜索条件</h2>
                {!checkIn && !checkOut && !adults && !children && !roomsCount ? (
                    <p className="text-sm text-gray-500">暂未选择日期和人数。</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
                        <div>
                            <p className="text-gray-500 mb-1">入住日期</p>
                            <p className="font-medium">{checkIn || "未选择"}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">退房日期</p>
                            <p className="font-medium">{checkOut || "未选择"}</p>
                        </div>
                        <div>
                            <p className="text-gray-500 mb-1">人数与房间</p>
                            <p className="font-medium">
                                {adults || 0} 位成人
                                {typeof children === "number" && children > 0 ? ` · ${children} 名儿童` : ""}
                                {typeof roomsCount === "number" && roomsCount > 0 ? ` · ${roomsCount} 间客房` : ""}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* 用户评价 */}
            <HotelReviews hotelId={id} />

            {/* 房型价格列表：先显示 5 间，滚动到底部加载更多 */}
            <h2 className="text-lg font-bold mb-4">房型与价格{rooms.length > 0 ? `（共 ${rooms.length} 间）` : ""}</h2>
            <div className="space-y-4">
                {rooms.length === 0 ? (
                    <p className="text-gray-500">暂无房型</p>
                ) : (
                    <>
                        {displayedRooms.map((room) => (
                            <div
                                key={room._id}
                                className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center gap-4"
                            >
                                {room.images?.[0] && (
                                    <img src={room.images[0]} alt="" className="w-full md:w-48 h-32 object-cover rounded-lg" />
                                )}
                                <div className="flex-1">
                                    <p className="font-semibold">{getRoomTypeLabel(room.roomType)}</p>
                                    <div className="flex flex-wrap gap-2 mt-2">
{room.amenties?.map((a, i) => (
                                        <span key={i} className="text-xs text-gray-600">{facilityLabelMap[a] || a}</span>
                                    ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xl font-bold">{room.pricePerNight} 元</span>
                                    <span className="text-gray-500 text-sm">/晚</span>
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/rooms/${room._id}`)}
                                        className="ml-2 bg-blue-500 text-white px-4 py-2 rounded text-sm"
                                    >
                                        预订
                                    </button>
                                </div>
                            </div>
                        ))}
                        <div ref={loadMoreRef} className="h-12 flex items-center justify-center">
                            {hasMore ? (
                                <span className="text-gray-500 text-sm">加载更多房型...</span>
                            ) : rooms.length > ROOMS_PER_PAGE ? (
                                <span className="text-gray-400 text-sm">已加载全部 {rooms.length} 间房型</span>
                            ) : null}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default HotelDetail;
