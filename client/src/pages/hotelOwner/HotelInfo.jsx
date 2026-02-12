import { useEffect, useState, useCallback } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import { MdOutlineCloudUpload } from "react-icons/md";
import { IoClose } from "react-icons/io5";

const MAX_HOTEL_IMAGES = 6;

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
        longitude: "",
        latitude: "",
    });
    // 酒店展示图：每项为 { url }（已有）或 { file }（新选）
    const [imageList, setImageList] = useState([]);

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
                        longitude: h.longitude != null ? String(h.longitude) : "",
                        latitude: h.latitude != null ? String(h.latitude) : "",
                    });
                    setImageList((Array.isArray(h.images) ? h.images : []).map((url) => ({ url })));
                }
            } catch (e) {
                toast.error("获取酒店信息失败");
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const addImages = useCallback((files) => {
        const list = Array.from(files || []).filter((f) => f.type.startsWith("image/"));
        setImageList((prev) => {
            const next = [...prev];
            for (const file of list) {
                if (next.length >= MAX_HOTEL_IMAGES) break;
                next.push({ file });
            }
            return next;
        });
    }, []);

    const removeImage = useCallback((index) => {
        setImageList((prev) => prev.filter((_, i) => i !== index));
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append("name", form.name);
            formData.append("nameEn", form.nameEn || "");
            formData.append("address", form.address);
            formData.append("contact", form.contact);
            formData.append("city", form.city);
            formData.append("starRating", String(form.starRating));
            formData.append("openTime", form.openTime || "");
            formData.append(
                "nearbyAttractions",
                JSON.stringify(form.nearbyAttractions ? form.nearbyAttractions.split("\n").map((s) => s.trim()).filter(Boolean) : [])
            );
            formData.append("latitude", form.latitude === "" ? "" : form.latitude);
            formData.append("longitude", form.longitude === "" ? "" : form.longitude);
            const existingUrls = imageList.filter((item) => item.url).map((item) => item.url);
            const newFiles = imageList.filter((item) => item.file).map((item) => item.file);
            formData.append("existingImages", JSON.stringify(existingUrls));
            newFiles.forEach((file) => formData.append("images", file));
            const { data } = await axios.put("/api/hotels/my", formData, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                toast.success("保存成功，已实时更新");
                if (data.hotel && Array.isArray(data.hotel.images)) {
                    setImageList(data.hotel.images.map((url) => ({ url })));
                }
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">酒店英文名</label>
                    <input
                        type="text"
                        value={form.nameEn}
                        onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))}
                        className="w-full border rounded p-2"
                        placeholder="如：Sunrise Hotel"
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
                    <input
                        type="text"
                        value={form.city}
                        onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                        className="w-full border rounded p-2"
                        placeholder="请输入城市名称"
                        required
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">经度（地图定位）</label>
                        <input
                            type="text"
                            value={form.longitude}
                            onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))}
                            className="w-full border rounded p-2"
                            placeholder="如：116.4074"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">纬度（地图定位）</label>
                        <input
                            type="text"
                            value={form.latitude}
                            onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))}
                            className="w-full border rounded p-2"
                            placeholder="如：39.9042"
                        />
                    </div>
                </div>
                <p className="text-xs text-gray-500 -mt-2">先填经度再纬度，填写后酒店将显示在首页地图上，可留空。可从高德/百度地图拾取坐标。</p>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">酒店展示图（最多 {MAX_HOTEL_IMAGES} 张，将展示给用户）</label>
                    <div className="flex flex-wrap gap-3">
                        {imageList.map((item, index) => (
                            <div key={index} className="relative w-28 h-28 rounded-lg border border-gray-200 overflow-hidden bg-gray-100">
                                {item.url ? (
                                    <img src={item.url} alt="" className="w-full h-full object-cover" />
                                ) : item.file ? (
                                    <img src={URL.createObjectURL(item.file)} alt="" className="w-full h-full object-cover" />
                                ) : null}
                                <button
                                    type="button"
                                    onClick={() => removeImage(index)}
                                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                    aria-label="删除"
                                >
                                    <IoClose size={14} />
                                </button>
                            </div>
                        ))}
                        {imageList.length < MAX_HOTEL_IMAGES && (
                            <label className="w-28 h-28 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-gray-50 transition-colors">
                                <MdOutlineCloudUpload className="text-2xl text-gray-400" />
                                <span className="text-xs text-gray-500 mt-1">上传</span>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    multiple
                                    onChange={(e) => addImages(e.target.files)}
                                />
                            </label>
                        )}
                    </div>
                </div>
                <button type="submit" disabled={saving} className="w-full bg-blue-500 text-white py-2 rounded disabled:opacity-50">
                    {saving ? "保存中..." : "保存"}
                </button>
            </form>
        </div>
    );
}

export default HotelInfo;
