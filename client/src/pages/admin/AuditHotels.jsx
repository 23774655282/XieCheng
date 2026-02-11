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
        <div>
            <h1 className="text-xl font-bold mb-4">酒店信息审核 / 发布 / 下线</h1>
            <div className="mb-4 flex gap-2 flex-wrap">
                <button
                    type="button"
                    onClick={() => setFilter("")}
                    className={`px-3 py-1 rounded ${!filter ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                >
                    全部
                </button>
                {Object.entries(STATUS_MAP).map(([key, label]) => (
                    <button
                        key={key}
                        type="button"
                        onClick={() => setFilter(key)}
                        className={`px-3 py-1 rounded ${filter === key ? "bg-blue-500 text-white" : "bg-gray-200"}`}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {loading ? (
                <p>加载中...</p>
            ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <table className="w-full text-left">
                        <thead className="bg-gray-100">
                            <tr>
                                <th className="p-2">酒店名</th>
                                <th className="p-2">城市</th>
                                <th className="p-2">状态</th>
                                <th className="p-2">不通过原因</th>
                                <th className="p-2">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hotels.map((h) => (
                                <tr key={h._id} className="border-t">
                                    <td className="p-2">{h.name}</td>
                                    <td className="p-2">{h.city}</td>
                                    <td className="p-2">{STATUS_MAP[h.status] || h.status}</td>
                                    <td className="p-2 text-red-600 text-sm">{h.rejectReason || "-"}</td>
                                    <td className="p-2 flex flex-wrap gap-1">
                                        {h.status === "pending_audit" && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleApprove(h._id)}
                                                    className="text-green-600 text-sm underline"
                                                >
                                                    通过
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => setRejectModal({ open: true, hotelId: h._id, reason: "" })}
                                                    className="text-red-600 text-sm underline"
                                                >
                                                    不通过
                                                </button>
                                            </>
                                        )}
                                        {h.status === "approved" && (
                                            <button
                                                type="button"
                                                onClick={() => handleOffline(h._id)}
                                                className="text-orange-600 text-sm underline"
                                            >
                                                下线
                                            </button>
                                        )}
                                        {h.status === "offline" && (
                                            <button
                                                type="button"
                                                onClick={() => handleRestore(h._id)}
                                                className="text-blue-600 text-sm underline"
                                            >
                                                恢复
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hotels.length === 0 && <p className="p-4 text-gray-500">暂无数据</p>}
                </div>
            )}

            {rejectModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full">
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
