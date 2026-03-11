import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import { getRoomTypeLabel } from "../../utils/roomTypes";

const facilityLabelMap = {
    "Free Wifi": "免费 Wi-Fi", "Free Breakfast": "免费早餐", "Room Service": "客房服务", "Mountain View": "山景",
    "Pool Access": "泳池使用", "Parking": "免费停车", "Gym": "健身房", "Sea View": "海景",
    "Air Conditioning": "空调", "Spa": "水疗中心", "Restaurant": "餐厅", "Airport Shuttle": "机场接送",
};

function PendingRoomAdds() {
    const { axios, getToken } = useAppContext();
    const [rooms, setRooms] = useState([]);
    const [filter, setFilter] = useState(""); // '' | pending_audit | approved
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);
    const [totalCount, setTotalCount] = useState(0);

    const fetchList = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
            if (filter) params.set("status", filter);
            const { data } = await axios.get(`/api/rooms/admin/pending-adds?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                setRooms(data.rooms || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } catch (e) {
            toast.error("获取列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { setPage(1); }, [filter]);
    useEffect(() => { fetchList(); }, [filter, page, pageSize]);

    const handleApprove = async (roomId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post(
                `/api/rooms/admin/pending-adds/${roomId}/approve`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已通过上架");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    const handleReject = async (roomId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post(
                `/api/rooms/admin/pending-adds/${roomId}/reject`,
                {},
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已驳回");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    return (
        <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">房间上架申请</h1>
            <p className="text-sm text-gray-600 mb-2">商户在已上架酒店中<strong>新增的房型</strong>在此审核，通过后即可对外展示。</p>
            <p className="text-xs text-amber-700 mb-4">说明：本列表仅审核「新增房型」。已有房间的<strong>上架/修改</strong>（如改价、改数量、点上架等）在「再审核（酒店信息）」中随酒店一并审核。</p>
            <div className="mb-4 flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setFilter("")}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${!filter ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    全部
                </button>
                <button
                    type="button"
                    onClick={() => setFilter("pending_audit")}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${filter === "pending_audit" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    待审核
                </button>
                <button
                    type="button"
                    onClick={() => setFilter("approved")}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${filter === "approved" ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    已通过
                </button>
            </div>
            {loading ? (
                <p className="text-gray-500">加载中...</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto -mx-1 px-1">
                    <table className="w-full min-w-[560px] text-left">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">主图</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">酒店</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">房型</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm hidden md:table-cell">设施</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">价格</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">状态</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rooms.map((r) => (
                                <tr key={r._id} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="p-2 sm:p-3">
                                        <div className="w-16 h-12 rounded overflow-hidden bg-gray-100 shrink-0">
                                            {r.images?.[0] ? (
                                                <img src={r.images[0]} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">无</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-800 text-sm">
                                        {r.hotel?.name || "—"}
                                        {r.hotel?.city && <span className="block text-xs text-gray-500">{r.hotel.city}</span>}
                                    </td>
                                    <td className="p-2 sm:p-3 font-medium">{getRoomTypeLabel(r.roomType)}</td>
                                    <td className="p-2 sm:p-3 text-xs text-gray-600 hidden md:table-cell max-w-[200px]">
                                        {(r.amenties || []).length > 0 ? (r.amenties || []).map((a, i) => (facilityLabelMap[a] || a)).join("、") : "—"}
                                    </td>
                                    <td className="p-2 sm:p-3 text-gray-800">{r.pricePerNight} 元/晚</td>
                                    <td className="p-2 sm:p-3">
                                        <span className={`inline-flex px-2 py-1 rounded text-xs ${r.status === "pending_audit" ? "bg-amber-100 text-amber-800" : "bg-green-100 text-green-800"}`}>
                                            {r.status === "pending_audit" ? "待审核" : "已通过"}
                                        </span>
                                    </td>
                                    <td className="p-2 sm:p-3">
                                        {r.status === "pending_audit" && (
                                            <div className="flex gap-1.5">
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(r._id)}
                                                    className="px-2 py-1 min-h-[32px] text-green-600 text-xs sm:text-sm font-medium rounded hover:bg-green-50"
                                                >
                                                    通过
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleReject(r._id)}
                                                    className="px-2 py-1 min-h-[32px] text-red-600 text-xs sm:text-sm font-medium rounded hover:bg-red-50"
                                                >
                                                    驳回
                                                </button>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {rooms.length === 0 && !loading && <p className="p-4 text-gray-500 text-sm">暂无数据</p>}
                </div>
            )}
            {!loading && totalCount > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <span className="text-gray-600 text-sm">共 {totalCount} 条</span>
                        <label className="flex items-center gap-2 text-sm">
                            <span className="text-gray-600">每页</span>
                            <select
                                value={pageSize}
                                onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                                className="border border-gray-300 rounded px-2 py-1 text-gray-800"
                            >
                                <option value={10}>10 条</option>
                                <option value={20}>20 条</option>
                            </select>
                        </label>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page <= 1}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            上一页
                        </button>
                        <span className="text-gray-600 text-sm">第 {page} / {Math.max(1, Math.ceil(totalCount / pageSize))} 页</span>
                        <button
                            type="button"
                            onClick={() => setPage((p) => p + 1)}
                            disabled={page >= Math.ceil(totalCount / pageSize)}
                            className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default PendingRoomAdds;
