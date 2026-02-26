import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { CiCircleList } from "react-icons/ci";
import { IoAddCircleOutline, IoCheckboxOutline, IoTrashOutline, IoArrowUpOutline, IoArrowDownOutline } from "react-icons/io5";
import PreReviewForm from "../../components/PreReviewForm";
import HotelSupplementForm from "../../components/HotelSupplementForm";

const STATUS_MAP = { pending_audit: "待再审核", pending_list: "待上架", approved: "已上架", rejected: "已驳回" };
const statusLabel = (h) => (h.hasPendingMods && (h.status === "pending_list" || h.status === "approved") ? "待审核" : STATUS_MAP[h.status] || h.status);

function HotelInfo() {
    const { axios, getToken } = useAppContext();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [hotels, setHotels] = useState([]);
    const [statusFilter, setStatusFilter] = useState(""); // '' | pending_audit | pending_list | approved | rejected
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(10); // 10 | 20
    const [totalCount, setTotalCount] = useState(0);
    const [selectMode, setSelectMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [deleteModal, setDeleteModal] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [showPreReview, setShowPreReview] = useState(false);
    const [rejectModal, setRejectModal] = useState(null); // { hotel }
    const [supplementHotel, setSupplementHotel] = useState(null); // hotel for 重新申请/重新上架

    const fetchHotels = async () => {
        try {
            const token = await getToken();
            const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
            if (statusFilter) params.set("status", statusFilter);
            const { data } = await axios.get(`/api/hotels/owner/list?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                setHotels(data.hotels || []);
                setTotalCount(data.totalCount ?? 0);
            } else {
                toast.error(data.message || "获取酒店列表失败");
            }
        } catch (e) {
            toast.error("获取酒店列表失败");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setPage(1);
    }, [statusFilter]);

    useEffect(() => {
        fetchHotels();
    }, [axios, getToken, statusFilter, page, pageSize]);

    const handleCardClick = (hotelId, h) => {
        if (selectMode) {
            setSelectedIds((prev) => {
                const next = new Set(prev);
                if (next.has(hotelId)) next.delete(hotelId);
                else next.add(hotelId);
                return next;
            });
        } else if (h.status === "rejected") {
            setRejectModal(h);
        } else if (h.status === "pending_audit") {
            navigate(`/owner/hotels/${hotelId}/supplement`);
        } else if (h.status === "pending_list" || h.status === "approved") {
            navigate(`/owner/hotels/${hotelId}/supplement`);
        }
    };

    const handleReapplyClick = async (h) => {
        setRejectModal(null);
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/hotels/owner/${h._id}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) setSupplementHotel(data.hotel);
        } catch {
            toast.error("获取酒店详情失败");
        }
    };

    const selectedIdsCanList = selectMode && selectedIds.size > 0 && hotels.filter((h) => selectedIds.has(h._id)).every((h) => h.status === "pending_list" && !h.hasPendingMods);
    const selectedIdsCanDelist = selectMode && selectedIds.size > 0 && hotels.filter((h) => selectedIds.has(h._id)).every((h) => h.status === "approved");

    const handleListClick = async () => {
        if (!selectedIdsCanList) return;
        try {
            const token = await getToken();
            const { data } = await axios.post("/api/hotels/owner/batch-list", { hotelIds: [...selectedIds] }, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success(data.message || "已上架");
                setSelectMode(false);
                setSelectedIds(new Set());
                fetchHotels();
            } else toast.error(data.message || "上架失败");
        } catch (e) {
            toast.error(e?.response?.data?.message || "上架失败");
        }
    };

    const handleDelistClick = async () => {
        if (!selectedIdsCanDelist) return;
        try {
            const token = await getToken();
            const { data } = await axios.post("/api/hotels/owner/batch-delist", { hotelIds: [...selectedIds] }, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success(data.message || "已下架");
                setSelectMode(false);
                setSelectedIds(new Set());
                fetchHotels();
            } else toast.error(data.message || "下架失败");
        } catch (e) {
            toast.error(e?.response?.data?.message || "下架失败");
        }
    };

    const handleDeleteClick = () => {
        if (selectedIds.size === 0) return;
        const toDelete = hotels.filter((h) => selectedIds.has(h._id));
        setDeleteModal({
            hotelIds: toDelete.map((h) => h._id),
            names: toDelete.map((h) => h.name || "未命名酒店"),
        });
    };

    const handleConfirmDelete = async () => {
        if (!deleteModal || deleteModal.hotelIds.length === 0) return;
        setDeleting(true);
        const token = await getToken();
        let successCount = 0;
        for (const id of deleteModal.hotelIds) {
            try {
                const { data } = await axios.delete(`/api/hotels/owner/${id}`, {
                    headers: { Authorization: `Bearer ${token}` },
                });
                if (data?.success) successCount++;
            } catch (e) {
                toast.error("删除失败：" + (e?.response?.data?.message || e.message));
            }
        }
        setDeleting(false);
        setDeleteModal(null);
        setSelectMode(false);
        setSelectedIds(new Set());
        if (successCount > 0) {
            toast.success(`已删除 ${successCount} 家酒店`);
            fetchHotels();
        }
    };

    const handleCancelDelete = () => {
        if (!deleting) setDeleteModal(null);
    };

    if (loading) return <p className="text-gray-600">加载中...</p>;

    if (hotels.length === 0 && !statusFilter) {
        return (
            <div className="w-full min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3 sm:mb-4 w-full">
                    <CiCircleList size={22} className="text-gray-600 shrink-0" />
                    <h1 className="text-lg sm:text-xl font-bold shrink-0">酒店信息</h1>
                    <div className="ml-auto mr-2 sm:mr-4 shrink-0">
                        <button
                            type="button"
                            onClick={() => setShowPreReview(true)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                        >
                            <IoAddCircleOutline size={18} /> 新增
                        </button>
                    </div>
                </div>
                <p className="text-gray-600">您名下暂无酒店，请先完成商户申请并注册酒店。</p>
                {showPreReview && (
                    <PreReviewForm
                        onClose={() => setShowPreReview(false)}
                        onSuccess={() => fetchHotels()}
                    />
                )}
            </div>
        );
    }

    return (
        <div className="w-full min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-3 w-full">
                <CiCircleList size={22} className="text-gray-600 shrink-0" />
                <h1 className="text-lg sm:text-xl font-bold shrink-0">酒店信息</h1>
                <div className="ml-auto mr-2 sm:mr-4 flex items-center gap-2 shrink-0">
                    <button
                        type="button"
                        onClick={() => setShowPreReview(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                    >
                        <IoAddCircleOutline size={18} /> 新增
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                            setSelectMode(!selectMode);
                            setSelectedIds(new Set());
                        }}
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg ${
                            selectMode ? "bg-gray-200 text-gray-800" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        }`}
                    >
                        <IoCheckboxOutline size={18} /> {selectMode ? "取消选择" : "选择"}
                    </button>
                    <button
                        type="button"
                        onClick={handleListClick}
                        disabled={!selectMode || selectedIds.size === 0 || !selectedIdsCanList}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                        <IoArrowUpOutline size={18} /> 上架
                    </button>
                    <button
                        type="button"
                        onClick={handleDelistClick}
                        disabled={!selectMode || selectedIds.size === 0 || !selectedIdsCanDelist}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                        <IoArrowDownOutline size={18} /> 下架
                    </button>
                    <button
                        type="button"
                        onClick={handleDeleteClick}
                        disabled={!selectMode || selectedIds.size === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-500 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                    >
                        <IoTrashOutline size={18} /> 删除
                    </button>
                </div>
            </div>
            <div className="mb-4 flex gap-2 flex-wrap">
                <button type="button" onClick={() => setStatusFilter("")} className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${!statusFilter ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>全部</button>
                {Object.entries(STATUS_MAP).map(([key, label]) => (
                    <button key={key} type="button" onClick={() => setStatusFilter(key)} className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${statusFilter === key ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}>{label}</button>
                ))}
            </div>
            <p className="text-gray-600 text-sm mb-6">
                {selectMode ? "勾选酒店后点击上架、下架或删除" : "点击酒店卡片进入房间管理，已驳回可重新申请，待上架可批量上架"}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {hotels.length === 0 ? (
                    <p className="col-span-full text-gray-500 text-sm py-8 text-center">该状态下暂无酒店</p>
                ) : hotels.map((h) => (
                    <button
                        key={h._id}
                        type="button"
                        onClick={() => handleCardClick(h._id, h)}
                        className={`text-left rounded-xl border transition-all overflow-hidden group flex flex-col relative ${
                            selectMode
                                ? selectedIds.has(h._id)
                                    ? "border-blue-500 bg-blue-50 shadow-md"
                                    : "border-gray-200 bg-white shadow-sm hover:border-gray-300"
                                : "border-gray-200 bg-white shadow-sm hover:shadow-md hover:border-blue-200"
                        }`}
                    >
                        {selectMode && (
                            <div
                                className="absolute top-3 left-3 z-10 w-6 h-6 rounded border-2 flex items-center justify-center"
                                style={{
                                    borderColor: selectedIds.has(h._id) ? "#3b82f6" : "#9ca3af",
                                    backgroundColor: selectedIds.has(h._id) ? "#3b82f6" : "white",
                                }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleCardClick(h._id, h);
                                }}
                            >
                                {selectedIds.has(h._id) && (
                                    <span className="text-white text-xs font-bold">✓</span>
                                )}
                            </div>
                        )}
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
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="font-semibold text-gray-900 truncate">{h.name || "未命名酒店"}</h3>
                                {h.status && (
                                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded ${h.hasPendingMods ? "bg-amber-100 text-amber-700" : h.status === "approved" ? "bg-green-100 text-green-700" : h.status === "pending_list" ? "bg-blue-100 text-blue-700" : h.status === "rejected" ? "bg-red-100 text-red-700" : h.status === "pending_audit" ? "bg-amber-100 text-amber-700" : "bg-gray-200 text-gray-600"}`}>
                                        {statusLabel(h)}
                                    </span>
                                )}
                            </div>
                            <p className="text-sm text-gray-500 truncate">{h.city || h.address || "—"}</p>
                            <div className="flex items-center gap-1 mt-2">
                                <span className="text-amber-500 text-sm">{"★".repeat(h.starRating || 0)}</span>
                                <span className="text-gray-400 text-xs">{h.starRating || 0} 星</span>
                            </div>
                        </div>
                    </button>
                ))}
            </div>
            {totalCount > 0 && (
                <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
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

            {/* 已驳回弹窗：驳回理由 + 重新申请 */}
            {rejectModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-11/12 max-w-md bg-white rounded-xl p-6 shadow-xl">
                        <h3 className="font-bold text-gray-900 mb-2">已驳回</h3>
                        <p className="text-gray-600 text-sm mb-2">酒店：{rejectModal.name || "未命名"}</p>
                        {rejectModal.rejectReason && (
                            <p className="text-red-600 text-sm mb-4 p-3 bg-red-50 rounded-lg">驳回理由：{rejectModal.rejectReason}</p>
                        )}
                        <div className="flex gap-3 justify-end">
                            <button type="button" onClick={() => setRejectModal(null)} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">关闭</button>
                            <button type="button" onClick={() => handleReapplyClick(rejectModal)} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg">重新申请</button>
                        </div>
                    </div>
                </div>
            )}

            {/* 补充信息表单（重新申请/重新上架） */}
            {supplementHotel && (
                <HotelSupplementForm
                    hotel={supplementHotel}
                    onClose={() => setSupplementHotel(null)}
                    onSuccess={() => { setSupplementHotel(null); fetchHotels(); }}
                />
            )}

            {/* 预审单弹窗（新增酒店） */}
            {showPreReview && (
                <PreReviewForm
                    onClose={() => setShowPreReview(false)}
                    onSuccess={() => fetchHotels()}
                />
            )}

            {/* 删除确认弹窗 */}
            {deleteModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
                    <div className="w-11/12 max-w-md bg-white rounded-xl p-6 shadow-xl">
                        <p className="text-gray-800 font-medium mb-4">
                            确定要删除「{deleteModal.names.join("」、「")}」吗？
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={handleCancelDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={deleting}
                                className="px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg disabled:opacity-50"
                            >
                                {deleting ? "删除中..." : "确定"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HotelInfo;
