import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../context/AppContext";

/** 大作业：酒店详情页 - 大图Banner左右滚动、基础信息、房型价格列表从低到高 */
function HotelDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { axios } = useAppContext();
    const [hotel, setHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [bannerIndex, setBannerIndex] = useState(0);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const { data } = await axios.get(`/api/hotels/public/${id}`);
                if (data.success) {
                    setHotel(data.hotel);
                    setRooms(data.rooms || []);
                    if (data.rooms?.[0]?.images?.[0]) setBannerIndex(0);
                }
            } catch (e) {
                setHotel(null);
            } finally {
                setLoading(false);
            }
        })();
    }, [id]);

    const images = [];
    rooms.forEach((r) => r.images?.forEach((url) => images.push(url)));
    if (images.length === 0 && hotel) images.push("https://via.placeholder.com/800x400?text=Hotel");

    if (loading) return <div className="pt-28 p-4">加载中...</div>;
    if (!hotel) return <div className="pt-28 p-4">酒店不存在</div>;

    return (
        <div className="pt-24 pb-16 px-4 md:px-16">
            {/* 顶部导航：酒店名 + 返回列表 */}
            <div className="flex items-center gap-4 mb-4">
                <button type="button" onClick={() => navigate("/rooms")} className="text-blue-600 text-sm">← 返回列表</button>
                <h1 className="text-xl font-bold">{hotel.name} {hotel.nameEn && ` / ${hotel.nameEn}`}</h1>
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

            {/* 酒店基础信息 */}
            <div className="bg-white rounded-xl shadow p-6 mb-6">
                <p className="text-gray-600">星级：{"★".repeat(hotel.starRating || 0)}</p>
                <p className="text-gray-600 mt-1">地址：{hotel.address}</p>
                {hotel.nearbyAttractions?.length > 0 && (
                    <p className="text-gray-600 mt-1">附近：{hotel.nearbyAttractions.join("、")}</p>
                )}
            </div>

            {/* 房型价格列表（从低到高） */}
            <h2 className="text-lg font-bold mb-4">房型与价格</h2>
            <div className="space-y-4">
                {rooms.length === 0 ? (
                    <p className="text-gray-500">暂无房型</p>
                ) : (
                    rooms.map((room) => (
                        <div
                            key={room._id}
                            className="bg-white rounded-xl shadow p-4 flex flex-col md:flex-row md:items-center gap-4"
                        >
                            {room.images?.[0] && (
                                <img src={room.images[0]} alt="" className="w-full md:w-48 h-32 object-cover rounded-lg" />
                            )}
                            <div className="flex-1">
                                <p className="font-semibold">{room.roomType}</p>
                                <div className="flex flex-wrap gap-2 mt-2">
                                    {room.amenties?.map((a, i) => (
                                        <span key={i} className="text-xs text-gray-600">{a}</span>
                                    ))}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="text-xl font-bold">${room.pricePerNight}</span>
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
                    ))
                )}
            </div>
        </div>
    );
}

export default HotelDetail;
