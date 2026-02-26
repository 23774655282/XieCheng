import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const roomTypeToCn = { "Single Bed": "单人间", "Double Bed": "双人间", "King Bed": "大床房", "Luxury Room": "豪华房", "Family Suite": "家庭套房", "Standard Room": "标准间", "Business Room": "商务房", "Sea View Room": "海景房", "Suite": "套房" };

const STATUS_MAP = {
    pending_audit: "待审核",
    pending_list: "待上架",
    approved: "已上架",
    rejected: "不通过",
};

function AuditHotels() {
    const { axios, getToken } = useAppContext();
    const [hotels, setHotels] = useState([]);
    const [filter, setFilter] = useState(""); // '' | pending_audit | pending_list | approved | rejected
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // 10 | 20
    const [totalCount, setTotalCount] = useState(0);
    const [detailModal, setDetailModal] = useState({ open: false, hotel: null, rooms: [], hasPendingSupp: false, loading: false });
    const [rejectModal, setRejectModal] = useState({ open: false, hotelId: null, reason: "" });

    const openDetailModal = async (hotelId) => {
        setDetailModal((m) => ({ ...m, open: true, hotel: null, rooms: [], loading: true }));
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/hotels/audit/${hotelId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) setDetailModal((m) => ({ ...m, hotel: data.hotel, rooms: data.rooms || [], hasPendingSupp: !!data.hasPendingSupp, loading: false }));
            else setDetailModal((m) => ({ ...m, loading: false }));
        } catch {
            toast.error("获取详情失败");
            setDetailModal((m) => ({ ...m, loading: false }));
        }
    };

    const closeDetailModal = () => setDetailModal({ open: false, hotel: null, rooms: [], loading: false });

    const fetchList = async () => {
        setLoading(true);
        try {
            const token = await getToken();
            const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
            if (filter) params.set("status", filter);
            const { data } = await axios.get(`/api/hotels/audit?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                setHotels(data.hotels || []);
                setTotalCount(data.totalCount ?? 0);
            }
        } catch (e) {
            toast.error("获取列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [filter]);

    useEffect(() => {
        fetchList();
    }, [filter, page, pageSize]);

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
                toast.success("已下架");
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
                toast.success("已上架");
                fetchList();
            } else toast.error(data.message || "操作失败");
        } catch (e) {
            toast.error("操作失败");
        }
    };

    return (
        <div className="min-w-0">
            <h1 className="text-lg sm:text-xl font-bold mb-3 sm:mb-4">再审核（酒店信息）</h1>
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
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">申请人</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">酒店名</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm hidden md:table-cell">城市</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">状态</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm hidden md:table-cell">不通过原因</th>
                                <th className="p-2 sm:p-3 text-left text-gray-600 font-medium text-xs sm:text-sm">操作</th>
                            </tr>
                        </thead>
                        <tbody>
                            {hotels.map((h) => (
                                <tr
                                    key={h._id}
                                    onClick={() => openDetailModal(h._id)}
                                    className="border-t border-gray-200 hover:bg-gray-50 cursor-pointer"
                                >
                                    <td className="p-2 sm:p-3 text-gray-800 text-sm">
                                            {h.applicantName || h.owner?.username || "—"}
                                            {(h.applicantPhone || h.owner?.phone) && (
                                                <span className="block text-xs text-gray-500">{h.applicantPhone || h.owner?.phone}</span>
                                            )}
                                        </td>
                                    <td className="p-2 sm:p-3 text-gray-800 text-sm">{h.name}</td>
                                    <td className="p-2 sm:p-3 text-gray-600 text-sm hidden md:table-cell">{h.city}</td>
                                    <td className="p-2 sm:p-3 text-sm">
                                            {STATUS_MAP[h.status] || h.status}
                                            {h.hasPendingMods && h.status !== "pending_audit" && (
                                                <span className="ml-1 text-amber-600 text-xs">（待审核修改）</span>
                                            )}
                                        </td>
                                    <td className="p-2 sm:p-3 text-red-600 text-xs sm:text-sm hidden md:table-cell max-w-[120px] truncate" title={h.rejectReason || ""}>{h.rejectReason || "—"}</td>
                                    <td className="p-2 sm:p-3" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex flex-wrap gap-1.5">
                                            {(h.status === "pending_audit" || h.hasPendingMods) && (
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
                                                    下架
                                                </button>
                                            )}
                                            {h.status === "pending_list" && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRestore(h._id)}
                                                    className="px-2 py-1 min-h-[32px] text-green-600 text-xs sm:text-sm font-medium rounded hover:bg-green-50"
                                                >
                                                    上架
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {hotels.length === 0 && !loading && <p className="p-4 text-gray-500 text-sm">暂无数据</p>}
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

            {detailModal.open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4 overflow-auto">
                    <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-auto my-4">
                        <div className="p-4 sm:p-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-4">酒店详细信息（再审核）</h3>
                            {detailModal.loading ? (
                                <p className="text-gray-500 py-8">加载中...</p>
                            ) : detailModal.hotel ? (
                                <>
                                    {/* 预审单信息（与商户提交一致） */}
                                    {(detailModal.hotel.applicantName || detailModal.hotel.licenseUrl) && (
                                        <section className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
                                            <h4 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                                                <span>预审单信息</span>
                                                <span className="text-xs font-normal text-amber-600">（不可修改）</span>
                                            </h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                                                {detailModal.hotel.applicantName && <div><span className="text-gray-500 block">申请人</span><p className="font-medium text-gray-800">{detailModal.hotel.applicantName}</p></div>}
                                                {detailModal.hotel.applicantPhone && <div><span className="text-gray-500 block">申请人手机</span><p className="font-medium text-gray-800">{detailModal.hotel.applicantPhone}</p></div>}
                                                {detailModal.hotel.name && <div><span className="text-gray-500 block">酒店名称</span><p className="font-medium text-gray-800">{detailModal.hotel.name}</p></div>}
                                                {detailModal.hotel.city && <div><span className="text-gray-500 block">城市</span><p className="font-medium text-gray-800">{detailModal.hotel.city}</p></div>}
                                                {detailModal.hotel.address && <div className="sm:col-span-2"><span className="text-gray-500 block">地址</span><p className="font-medium text-gray-800">{detailModal.hotel.address}</p></div>}
                                                {detailModal.hotel.contact && <div><span className="text-gray-500 block">联系电话</span><p className="font-medium text-gray-800">{detailModal.hotel.contact}</p></div>}
                                            </div>
                                            <div className="mt-4 flex flex-wrap gap-4">
                                                {detailModal.hotel.licenseUrl && (
                                                    <div>
                                                        <span className="block text-gray-500 text-xs mb-1">营业执照</span>
                                                        <a href={detailModal.hotel.licenseUrl} target="_blank" rel="noopener noreferrer"><img src={detailModal.hotel.licenseUrl} alt="执照" className="h-20 w-auto rounded border object-cover" /></a>
                                                    </div>
                                                )}
                                                {detailModal.hotel.starRatingCertificateUrl && (
                                                    <div>
                                                        <span className="block text-gray-500 text-xs mb-1">星级评定证明</span>
                                                        <a href={detailModal.hotel.starRatingCertificateUrl} target="_blank" rel="noopener noreferrer"><img src={detailModal.hotel.starRatingCertificateUrl} alt="星级" className="h-20 w-auto rounded border object-cover" /></a>
                                                    </div>
                                                )}
                                                {detailModal.hotel.images?.length > 0 && (
                                                    <div className="w-full">
                                                        <span className="block text-gray-500 text-xs mb-2">预审照片</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {detailModal.hotel.images.map((img, i) => (
                                                                <a key={i} href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt="" className="h-20 w-24 object-cover rounded border" /></a>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                    {/* 补充信息（若含待审核修改则显示待审核） */}
                                    {(detailModal.hotel.latitude != null || detailModal.hotel.longitude != null || detailModal.hotel.doorNumber || detailModal.hotel.totalRoomCount != null || detailModal.hotel.nameEn || (detailModal.hotel.hotelExteriorImages || []).length > 0 || (detailModal.hotel.hotelInteriorImages || []).length > 0) && (
                                        <section className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border">
                                            <h4 className="text-base font-semibold text-gray-800 mb-4">补充信息{detailModal.hasPendingSupp ? "（待审核修改）" : "（已提交）"}</h4>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                                                {detailModal.hotel.latitude != null && <div><span className="text-gray-500">纬度</span><p className="font-medium">{detailModal.hotel.latitude}</p></div>}
                                                {detailModal.hotel.longitude != null && <div><span className="text-gray-500">经度</span><p className="font-medium">{detailModal.hotel.longitude}</p></div>}
                                                {detailModal.hotel.doorNumber && <div><span className="text-gray-500">门牌号</span><p className="font-medium">{detailModal.hotel.doorNumber}</p></div>}
                                                {detailModal.hotel.totalRoomCount != null && <div><span className="text-gray-500">客房总数</span><p className="font-medium">{detailModal.hotel.totalRoomCount}</p></div>}
                                                {detailModal.hotel.nameEn && <div><span className="text-gray-500">英文名</span><p className="font-medium">{detailModal.hotel.nameEn}</p></div>}
                                                {((detailModal.hotel.hotelExteriorImages || []).length > 0 || (detailModal.hotel.hotelInteriorImages || []).length > 0) && (
                                                    <div className="col-span-2">
                                                        <span className="text-gray-500 block mb-2">补充照片</span>
                                                        <div className="flex flex-wrap gap-2">
                                                            {(detailModal.hotel.hotelExteriorImages || []).concat(detailModal.hotel.hotelInteriorImages || []).map((url, i) => (
                                                                <img key={i} src={url} alt="" className="h-20 w-24 object-cover rounded border" />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </section>
                                    )}
                                    {/* 房间列表（与商户一致：主图、房型、价格/晚、打折、间数） */}
                                    <section className="mb-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <h4 className="text-base font-semibold text-gray-800 mb-4">房间列表</h4>
                                        {detailModal.rooms.length === 0 ? (
                                            <p className="text-gray-500 text-sm py-4">暂无房间</p>
                                        ) : (
                                            <div className="overflow-x-auto -mx-1 px-1 border border-gray-200 rounded-lg">
                                                <table className="w-full min-w-[520px] text-left text-sm">
                                                    <thead className="bg-gray-100">
                                                        <tr>
                                                            <th className="p-2 sm:p-3 text-gray-600 font-medium w-20">主图</th>
                                                            <th className="p-2 sm:p-3 text-gray-600 font-medium">房型</th>
                                                            <th className="p-2 sm:p-3 text-gray-600 font-medium">价格/晚</th>
                                                            <th className="p-2 sm:p-3 text-gray-600 font-medium">打折</th>
                                                            <th className="p-2 sm:p-3 text-gray-600 font-medium">间数</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {detailModal.rooms.map((r) => (
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
                                                                <td className="p-2 sm:p-3 font-medium">{roomTypeToCn[r.roomType] || r.roomType}</td>
                                                                <td className="p-2 sm:p-3">{r.pricePerNight} 元</td>
                                                                <td className="p-2 sm:p-3">{r.promoDiscount != null ? `${r.promoDiscount}%` : "—"}</td>
                                                                <td className="p-2 sm:p-3">{r.roomCount ?? 1}</td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </section>
                                    <div className="flex justify-end">
                                        <button type="button" onClick={closeDetailModal} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                                            完成
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <p className="text-gray-500 py-4">加载失败</p>
                            )}
                        </div>
                    </div>
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
