import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CiCircleList } from "react-icons/ci";

function HotelInfo() {
    const { axios, getToken } = useAppContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hotels, setHotels] = useState([]);

    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const { data } = await axios.get("/api/hotels/owner/list", {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (data.success) {
                    setHotels(data.hotels || []);
                } else {
                    toast.error(data.message || "获取酒店列表失败");
                }
            } catch (e) {
                toast.error("获取酒店列表失败");
            } finally {
                setLoading(false);
            }
        })();
    }, [axios, getToken]);

    const handleCardClick = (hotelId) => {
        navigate(`/owner/hotels/${hotelId}/rooms`);
    };

    if (loading) return <p className="text-gray-600">加载中...</p>;

    if (hotels.length === 0) {
        return (
            <div className="w-full max-w-2xl">
                <h1 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">酒店信息</h1>
                <p className="text-gray-600">您名下暂无酒店，请先完成商户申请并注册酒店。</p>
            </div>
        );
    }

    return (
        <div className="w-full min-w-0">
            <div className="flex items-center gap-2 mb-3">
                <CiCircleList size={22} className="text-gray-600" />
                <h1 className="text-lg sm:text-xl font-bold">酒店信息</h1>
            </div>
            <p className="text-gray-600 text-sm mb-6">点击酒店卡片进入房间管理</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotels.map((h) => (
                    <button
                        key={h._id}
                        type="button"
                        onClick={() => handleCardClick(h._id)}
                        className="text-left rounded-xl border border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200 transition-all overflow-hidden group flex flex-col"
                    >
                        <div className="aspect-[4/3] bg-gray-100 overflow-hidden shrink-0">
                            {h.images && h.images[0] ? (
                                <img
                                    src={h.images[0]}
                                    alt={h.name}
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                    <CiCircleList size={48} />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 flex flex-col justify-center p-4 gap-1">
                            <h3 className="font-semibold text-gray-900 truncate">{h.name || "未命名酒店"}</h3>
                            <p className="text-sm text-gray-500 truncate">{h.city || h.address || "—"}</p>
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-amber-500 text-sm">{"★".repeat(h.starRating || 0)}</span>
                                <span className="text-gray-400 text-xs">{h.starRating || 0} 星</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}

export default HotelInfo;
