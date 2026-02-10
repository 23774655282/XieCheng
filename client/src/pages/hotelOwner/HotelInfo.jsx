import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import { cities } from "../../assets/assets";

function HotelInfo() {
    const { axios, getToken } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState({
        name: "",
        nameEn: "",
        address: "",
        contact: "",
        city: "",
        starRating: 3,
        openTime: "",
        nearbyAttractions: "",
        promotions: "",
    });

    useEffect(() => {
        (async () => {
            try {
                const token = await getToken();
                const { data } = await axios.get("/api/hotels/my", { headers: { Authorization: `Bearer ${token}` } });
                if (data.success && data.hotel) {
                    const h = data.hotel;
                    setForm({
                        name: h.name || "",
                        nameEn: h.nameEn || "",
                        address: h.address || "",
                        contact: h.contact || "",
                        city: h.city || "",
                        starRating: h.starRating ?? 3,
                        openTime: h.openTime ? h.openTime.slice(0, 10) : "",
                        nearbyAttractions: Array.isArray(h.nearbyAttractions) ? h.nearbyAttractions.join("\n") : "",
                        promotions: Array.isArray(h.promotions) ? h.promotions.join("\n") : "",
                    });
                }
            } catch (e) {
                toast.error("获取酒店信息失败");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await getToken();
            const payload = {
                ...form,
                nearbyAttractions: form.nearbyAttractions ? form.nearbyAttractions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
                promotions: form.promotions ? form.promotions.split("\n").map((s) => s.trim()).filter(Boolean) : [],
                openTime: form.openTime || undefined,
            };
            const { data } = await axios.put("/api/hotels/my", payload, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success("保存成功，已实时更新");
            } else {
                toast.error(data.message || "保存失败");
            }
        } catch (e) {
            toast.error("保存失败");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <p>加载中...</p>;

    return (
        <div className="max-w-2xl">
            <h1 className="text-xl font-bold mb-4">酒店信息录入 / 编辑</h1>
            <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded-lg shadow">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">酒店名（中文） *</label>
                    <input
                        type="text"
                        value={form.name}
                        onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">酒店名（英文）</label>
                    <input
                        type="text"
                        value={form.nameEn}
                        onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                        className="w-full border rounded p-2"
                        placeholder="Hotel Name in English"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">地址 *</label>
                    <input
                        type="text"
                        value={form.address}
                        onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">联系电话 *</label>
                    <input
                        type="text"
                        value={form.contact}
                        onChange={(e) => setForm((f) => ({ ...f, contact: e.target.value }))}
                        className="w-full border rounded p-2"
                        required
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">城市 *</label>
                    <select
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full border rounded p-2"
                        required
                    >
                        <option value="">请选择</option>
                        {cities.map((c) => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">星级 (1-5)</label>
                    <select
                        value={form.starRating}
                        onChange={(e) => setForm((f) => ({ ...f, starRating: Number(e.target.value) }))}
                        className="w-full border rounded p-2"
                    >
                        {[1, 2, 3, 4, 5].map((n) => (
                            <option key={n} value={n}>{n} 星</option>
                        ))}
                    </select>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">开业时间</label>
                    <input
                        type="date"
                        value={form.openTime}
                        onChange={(e) => setForm((f) => ({ ...f, openTime: e.target.value }))}
                        className="w-full border rounded p-2"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">附近热门景点/交通/商场（每行一个）</label>
                    <textarea
                        value={form.nearbyAttractions}
                        onChange={(e) => setForm((f) => ({ ...f, nearbyAttractions: e.target.value }))}
                        className="w-full border rounded p-2 h-24"
                        placeholder="如：外滩&#10;南京路步行街"
                    />
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">优惠/促销（每行一个，如：节日8折）</label>
                    <textarea
                        value={form.promotions}
                        onChange={(e) => setForm((f) => ({ ...f, promotions: e.target.value }))}
                        className="w-full border rounded p-2 h-24"
                        placeholder="如：节日优惠8折&#10;机酒套餐减100元"
                    />
                </div>
                <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50">
                    {saving ? "保存中..." : "保存"}
                </button>
            </form>
        </div>
    );
}

export default HotelInfo;
