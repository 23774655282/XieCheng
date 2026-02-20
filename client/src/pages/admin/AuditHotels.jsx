import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const STATUS_MAP = {
    pending_audit: "审核中",
    approved: "已通过",
    rejected: "不通过",
    offline: "已下线",
};

function AuditHotels() {
    const { axios, getToken } = useAppContext();
    const [hotels, setHotels] = useState([]);
    const [filter, setFilter] = useState(""); // '' | pending_audit | approved | rejected | offline
    const [loading, setLoading] = useState(true);
    const [rejectModal, setRejectModal] = useState({ open: false, hotelId: null, reason: "" });

    const fetchList = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const url = filter ? `/api/hotels/audit?status=${filter}` : "/api/hotels/audit";
            const { data } = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) setHotels(data.hotels || []);
        } catch (e) {
            toast.error("获取列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchList();
    }, [filter]);

    const handleApprove = async (hotelId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post(
                "/api/hotels/audit/approve",
                { hotelId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已通过");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    const handleReject = () => {
        if (!rejectModal.hotelId) return;
        const reason = rejectModal.reason.trim() || "未填写原因";
        (async () => {
            try {
                const token = await getToken();
                const { data } = await axios.post(
                    "/api/hotels/audit/reject",
                    { hotelId: rejectModal.hotelId, rejectReason: reason },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (data.success) {
                    toast.success("已驳回");
                    setRejectModal({ open: false, hotelId: null, reason: "" });
                    fetchList();
                } else toast.error(data.message || "操作失败");
            } catch (e) {
                toast.error("操作失败");
            }
        })();
    };

    const handleOffline = async (hotelId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post(
                "/api/hotels/audit/offline",
                { hotelId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已下线");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    const handleRestore = async (hotelId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post(
                "/api/hotels/audit/restore",
                { hotelId },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已恢复");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    return (
        <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">酒店信息审核 / 发布 / 下线</h1>
            <div className="mb-4 flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setFilter("")}
                    className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${!filter ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                >
                    全部
                </button>
                {Object.entries(STATUS_MAP).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${filter === key ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {loading ? (
                <p className="text-gray-500">加载中...</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-x-auto -mx-1 px-1">
                    <table className="w-full min-w-[520px] text-left">
                        <thead className="bg-gray-100 sticky top-0 z-10">
                            <tr>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">酒店名</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">城市</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">状态</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm hidden md:table-cell">不通过原因</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hotels.map((h) => (
                                <tr key={h._id} className="border-t border-gray-200 hover:bg-gray-50">
                                    <td className="p-2 sm:p-3 text-gray-800 text-sm">{h.name}</td>
                                    <td className="p-2 sm:p-3 text-gray-600 text-sm">{h.city}</td>
                                    <td className="p-2 sm:p-3 text-sm">{STATUS_MAP[h.status] || h.status}</td>
                                    <td className="p-2 sm:p-3 text-red-600 text-xs sm:text-sm hidden md:table-cell max-w-[120px] truncate" title={h.rejectReason || ""}>{h.rejectReason || "-"}</td>
                                    <td className="p-2 sm:p-3">
                                        <div className="flex flex-wrap gap-1.5">
                                            {h.status === "pending_audit" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        onClick={() => handleApprove(h._id)}
                                                        className="px-2 py-1 min-h-[32px] text-green-600 text-xs sm:text-sm font-medium rounded hover:bg-green-50"
                                                    >
                                                        通过
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRejectModal({ open: true, hotelId: h._id, reason: "" })}
                                                        className="px-2 py-1 min-h-[32px] text-red-600 text-xs sm:text-sm font-medium rounded hover:bg-red-50"
                                                    >
                                                        不通过
                                                    </button>
                                                </>
                                            )}
                                            {h.status === "approved" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOffline(h._id)}
                                                    className="px-2 py-1 min-h-[32px] text-orange-600 text-xs sm:text-sm font-medium rounded hover:bg-orange-50"
                                                >
                                                    下线
                                                </button>
                                            )}
                                            {h.status === "offline" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(h._id)}
                                                    className="px-2 py-1 min-h-[32px] text-blue-600 text-xs sm:text-sm font-medium rounded hover:bg-blue-50"
                                                >
                                                    恢复
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hotels.length === 0 && <p className="p-4 text-gray-500 text-sm">暂无数据</p>}
                </div>
            )}

            {rejectModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
                    <div className="bg-white rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-auto">
                        <h3 className="font-bold mb-2">不通过原因</h3>
                        <textarea
                            value={rejectModal.reason}
                            onChange={(e) => setRejectModal((m) => ({ ...m, reason: e.target.value }))}
                            placeholder="请输入不通过原因"
                            className="w-full border p-2 rounded h-24"
                        />
                        <div className="flex gap-2 mt-4">
                            <button
                                type="button"
                                onClick={handleReject}
                                className="flex-1 bg-red-500 text-white py-2 rounded"
                            >
                                提交
                            </button>
                            <button
                                type="button"
                                onClick={() => setRejectModal({ open: false, hotelId: null, reason: "" })}
                                className="flex-1 bg-gray-300 py-2 rounded"
                            >
                                取消
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default AuditHotels;
