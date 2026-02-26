import { useState } from "react";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import AddressInput from "./AddressInput";
import CityInput, { parseCityFromDistrict, parseDistrictFromDistrict } from "./CityInput";

/**
 * 酒店补充信息表单 - 用于已驳回/已下架酒店重新申请
 * 申请人、申请手机、执照、星级评定为只读；酒店名、城市、地址、联系电话可编辑
 */
function HotelSupplementForm({ hotel, onClose, onSuccess }) {
    const { axios, getToken } = useAppContext();
    const [name, setName] = useState(hotel?.name || "");
    const [city, setCity] = useState(hotel?.city || "");
    const [district, setDistrict] = useState(hotel?.district || "");
    const [address, setAddress] = useState(hotel?.address || "");
    const [contact, setContact] = useState(hotel?.contact || "");
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
                    name: name.trim(),
                    city: city.trim(),
                    district: district.trim(),
                    address: address.trim(),
                    contact: contact.trim(),
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
                    申请人、执照、星级评定不可修改；酒店名、城市、地址、联系电话可编辑，提交后进入再审核。
                </p>

                {/* 预审单信息（仅申请人、执照、星级为只读） */}
                <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-700 mb-3">预审单信息（不可修改）</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-600">
                        <div><span className="text-gray-500">申请人：</span>{hotel?.applicantName || "—"}</div>
                        <div><span className="text-gray-500">申请人手机：</span>{hotel?.applicantPhone || "—"}</div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4">
                        {hotel?.licenseUrl && (
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">营业执照</span>
                                <a href={hotel.licenseUrl} target="_blank" rel="noopener noreferrer"><img src={hotel.licenseUrl} alt="执照" className="h-20 w-auto rounded border object-cover" /></a>
                            </div>
                        )}
                        {hotel?.starRatingCertificateUrl && (
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">星级评定证明</span>
                                <a href={hotel.starRatingCertificateUrl} target="_blank" rel="noopener noreferrer"><img src={hotel.starRatingCertificateUrl} alt="星级" className="h-20 w-auto rounded border object-cover" /></a>
                            </div>
                        )}
                    </div>
                </div>

                {/* 可编辑信息 */}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">酒店名称 *</label>
                            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full border border-gray-200 rounded-lg p-2" placeholder="酒店名称" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">城市 *</label>
                            <CityInput value={city} onChange={setCity} placeholder="输入城市后选择" required className="w-full border border-gray-200 rounded-lg p-2" />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">行政区（由地址联想填充）</label>
                            <input type="text" value={district} readOnly placeholder="请从地址联想中选择" className="w-full border border-gray-200 rounded-lg p-2 bg-gray-50 text-gray-600" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">地址 *</label>
                            <AddressInput
                                value={address}
                                onChange={setAddress}
                                city={city}
                                onSelect={(tip) => {
                                    if (tip?.district) {
                                        setCity(parseCityFromDistrict(tip.district) || city);
                                        setDistrict(parseDistrictFromDistrict(tip.district) || district);
                                    }
                                }}
                                placeholder="输入地址后选择（已选城市则限定在该城市内）"
                                className="w-full border border-gray-200 rounded-lg p-2"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 *</label>
                            <input value={contact} onChange={(e) => setContact(e.target.value)} required className="w-full border border-gray-200 rounded-lg p-2" placeholder="酒店联系电话" />
                        </div>
                    </div>
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
