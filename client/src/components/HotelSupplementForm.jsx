import { useState } from "react";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";

/**
 * 酒店补充信息表单 - 用于已驳回/已下架酒店重新申请
 * 预审单信息只读展示，补充信息可编辑
 */
function HotelSupplementForm({ hotel, onClose, onSuccess }) {
    const { axios, getToken } = useAppContext();
    const [hotelIntro, setHotelIntro] = useState(hotel?.hotelIntro || "");
    const [nearbyAttractions, setNearbyAttractions] = useState(
        Array.isArray(hotel?.nearbyAttractions) ? hotel.nearbyAttractions.join("\n") : (hotel?.nearbyAttractions || "")
    );
    const [promotions, setPromotions] = useState(
        Array.isArray(hotel?.promotions) ? hotel.promotions.join("\n") : (hotel?.promotions || "")
    );
    const [openTime, setOpenTime] = useState(
        hotel?.openTime ? new Date(hotel.openTime).toISOString().slice(0, 10) : ""
    );
    const [loading, setLoading] = useState(false);

    async function handleSubmit(e) {
        e.preventDefault();
        setLoading(true);
        try {
            const token = await getToken();
            const { data } = await axios.put(
                `/api/hotels/owner/${hotel._id}/reapply`,
                {
                    hotelIntro: hotelIntro.trim(),
                    nearbyAttractions: nearbyAttractions.trim() ? nearbyAttractions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
                    promotions: promotions.trim() ? promotions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
                    openTime: openTime || undefined,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success("已提交再审核");
                onSuccess?.();
                onClose?.();
            } else {
                toast.error(data.message || "提交失败");
            }
        } catch (err) {
            toast.error(err?.response?.data?.message || "提交失败");
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 sm:p-8 my-8">
                <IoIosCloseCircleOutline
                    className="absolute top-4 right-4 text-2xl cursor-pointer text-gray-700 hover:text-red-500 transition"
                    onClick={onClose}
                />
                <h2 className="text-xl font-bold text-center mb-2">重新申请</h2>
                <p className="text-gray-600 text-center text-sm mb-6">
                    预审单信息不可修改，仅可补充以下信息，提交后进入再审核。
                </p>

                {/* 预审单信息（只读） */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-3">预审单信息（不可修改）</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><span className="text-gray-500">申请人：</span>{hotel?.applicantName || hotel?.name || "—"}</div>
                        <div><span className="text-gray-500">申请人手机：</span>{hotel?.applicantPhone || hotel?.contact || "—"}</div>
                        <div><span className="text-gray-500">酒店名称：</span>{hotel?.name || "—"}</div>
                        <div><span className="text-gray-500">城市：</span>{hotel?.city || "—"}</div>
                        <div className="col-span-2"><span className="text-gray-500">地址：</span>{hotel?.address || "—"}</div>
                    </div>
                </div>

                {/* 补充信息（可编辑） */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">酒店介绍</label>
                        <textarea
                            value={hotelIntro}
                            onChange={(e) => setHotelIntro(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 min-h-[80px]"
                            placeholder="可选"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">附近景点/交通（每行一个）</label>
                        <textarea
                            value={nearbyAttractions}
                            onChange={(e) => setNearbyAttractions(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 min-h-[60px]"
                            placeholder="可选"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">优惠说明（每行一个）</label>
                        <textarea
                            value={promotions}
                            onChange={(e) => setPromotions(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2 min-h-[60px]"
                            placeholder="可选"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">开业时间</label>
                        <input
                            type="date"
                            value={openTime}
                            onChange={(e) => setOpenTime(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg p-2"
                        />
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="flex-1 py-2 px-3 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium disabled:opacity-50"
                        >
                            {loading ? "提交中..." : "提交再审核"}
                        </button>
                        <button type="button" onClick={onClose} className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium">
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default HotelSupplementForm;
