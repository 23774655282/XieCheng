import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import { IoAdd, IoCloudUploadOutline, IoCreateOutline, IoClose } from "react-icons/io5";

function RoomCountStepper({ value, roomId, onUpdate, axios, getToken }) {
    const [count, setCount] = useState(value);
    const [updating, setUpdating] = useState(false);
    useEffect(() => { setCount(value); }, [value]);
    async function saveCount(newVal) {
        const v = Math.max(1, Math.floor(Number(newVal) || 1));
        setCount(v);
        setUpdating(true);
        try {
            const token = await getToken();
            const { data } = await axios.patch(`/api/rooms/${roomId}/room-count`, { roomCount: v }, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) { toast.success(data.needsApproval ? "修改已提交，等待管理员审核" : "已更新"); onUpdate?.(); }
            else { toast.error(data.message || "更新失败"); setCount(value); }
        } catch (e) { toast.error(e?.response?.data?.message || "更新失败"); setCount(value); }
        finally { setUpdating(false); }
    }
    return (
        <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
            <button type="button" onClick={() => !updating && saveCount(count - 1)} disabled={updating || count <= 1} className="w-8 h-8 flex items-center justify-center border-r border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">−</button>
            <input type="number" min={1} value={count} onChange={(e) => setCount(e.target.value)} onBlur={(e) => { const n = Math.max(1, Math.floor(Number(e.target.value) || 1)); if (n !== value) saveCount(n); }} className="w-12 h-8 text-center text-sm border-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style={{ textAlign: "center" }} />
            <button type="button" onClick={() => !updating && saveCount(count + 1)} disabled={updating} className="w-8 h-8 flex items-center justify-center border-l border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">+</button>
        </div>
    );
}

function PromoDiscountStepper({ value, roomId, onUpdate, axios, getToken }) {
    const [discount, setDiscount] = useState(value ?? "");
    const [updating, setUpdating] = useState(false);
    useEffect(() => { setDiscount(value != null ? value : ""); }, [value]);
    async function saveDiscount(val) {
        const v = val === "" || val == null ? null : Math.min(100, Math.max(0, Math.floor(Number(val) || 0)));
        setDiscount(v ?? "");
        setUpdating(true);
        try {
            const token = await getToken();
            const { data } = await axios.patch(`/api/rooms/${roomId}/promo-discount`, { promoDiscount: v }, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) { toast.success(data.needsApproval ? "修改已提交，等待管理员审核" : "已更新"); onUpdate?.(); }
            else { toast.error(data.message || "更新失败"); setDiscount(value ?? ""); }
        } catch (e) { toast.error(e?.response?.data?.message || "更新失败"); setDiscount(value ?? ""); }
        finally { setUpdating(false); }
    }
    return (
        <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
            <button type="button" onClick={() => !updating && saveDiscount(discount === "" ? 0 : Math.max(0, (Number(discount) || 0) - 1))} disabled={updating} className="w-7 h-7 flex items-center justify-center border-r border-gray-300 text-gray-600 hover:bg-gray-50">−</button>
            <input type="number" min={0} max={100} placeholder="—" value={discount} onChange={(e) => setDiscount(e.target.value === "" ? "" : e.target.value)} onBlur={(e) => { const v = e.target.value; if (v === "") { saveDiscount(null); return } saveDiscount(Math.min(100, Math.max(0, Math.floor(Number(v) || 0)))); }} className="w-10 h-7 text-center text-sm border-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" style={{ textAlign: "center" }} />
            <span className="px-1 text-gray-500 text-xs">%</span>
            <button type="button" onClick={() => !updating && saveDiscount(Math.min(100, (Number(discount) || 0) + 1))} disabled={updating} className="w-7 h-7 flex items-center justify-center border-l border-gray-300 text-gray-600 hover:bg-gray-50">+</button>
        </div>
    );
}

const roomTypeToCn = {
    "Single Bed": "单人间",
    "Double Bed": "双人间",
    "King Bed": "大床房",
    "Luxury Room": "豪华房",
    "Family Suite": "家庭套房",
    "Standard Room": "标准间",
    "Business Room": "商务房",
    "Sea View Room": "海景房",
    "Suite": "套房",
};

function HotelReauditDetail() {
    const { hotelId } = useParams();
    const navigate = useNavigate();
    const { axios, getToken } = useAppContext();
    const [hotel, setHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        latitude: "",
        longitude: "",
        doorNumber: "",
        totalRoomCount: "",
        nameEn: "",
    });
    const [exteriorItems, setExteriorItems] = useState([]); // [{type:'url',url}|{type:'file',file}]
    const [interiorItems, setInteriorItems] = useState([]);
    const fetchVersionRef = useRef(0);

    useEffect(() => {
        if (hotel) {
            setExteriorItems([...(hotel.hotelExteriorImages || []).map((url) => ({ type: "url", url }))]);
            setInteriorItems([...(hotel.hotelInteriorImages || []).map((url) => ({ type: "url", url }))]);
        }
    }, [hotel]);

    const removeExterior = (idx) => setExteriorItems((prev) => prev.filter((_, i) => i !== idx));
    const removeInterior = (idx) => setInteriorItems((prev) => prev.filter((_, i) => i !== idx));

    const addExteriorFiles = (files) => {
        const added = Array.from(files || []).slice(0, 6 - exteriorItems.length);
        setExteriorItems((prev) => [...prev, ...added.map((f) => ({ type: "file", file: f }))]);
    };
    const addInteriorFiles = (files) => {
        const added = Array.from(files || []).slice(0, 6 - interiorItems.length);
        setInteriorItems((prev) => [...prev, ...added.map((f) => ({ type: "file", file: f }))]);
    };

    const fetchData = async (showLoading = true) => {
        if (!hotelId) return;
        const myVersion = ++fetchVersionRef.current;
        if (showLoading) setLoading(true);
        try {
            const token = await getToken();
            const [hotelRes, roomsRes] = await Promise.all([
                axios.get(`/api/hotels/owner/${hotelId}`, { headers: { Authorization: `Bearer ${token}` } }),
                axios.get(`/api/rooms/owner?hotelId=${hotelId}`, { headers: { Authorization: `Bearer ${token}` } }),
            ]);
            if (myVersion !== fetchVersionRef.current) return;
            if (hotelRes.data?.success) {
                const h = hotelRes.data.hotel;
                setHotel(h);
                setForm({
                    latitude: h.latitude != null ? String(h.latitude) : "",
                    longitude: h.longitude != null ? String(h.longitude) : "",
                    doorNumber: h.doorNumber || "",
                    totalRoomCount: h.totalRoomCount != null ? String(h.totalRoomCount) : "",
                    nameEn: h.nameEn || "",
                });
            }
            if (roomsRes.data?.success) setRooms(roomsRes.data.rooms || []);
        } catch {
            if (myVersion === fetchVersionRef.current) { toast.error("获取数据失败"); navigate("/owner/hotel-info"); }
        } finally {
            if (myVersion === fetchVersionRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [hotelId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!hotel) return;
        if (hotel.status === "pending_audit" && hotel.supplementSubmitted && !hotel.hasPendingMods) {
            toast.error("已提交，不可重复提交");
            return;
        }
        setSubmitting(true);
        try {
            const token = await getToken();
            const fd = new FormData();
            fd.append("latitude", form.latitude);
            fd.append("longitude", form.longitude);
            fd.append("doorNumber", form.doorNumber);
            fd.append("totalRoomCount", form.totalRoomCount);
            fd.append("nameEn", form.nameEn);
            const extUrls = exteriorItems.filter((x) => x.type === "url").map((x) => x.url);
            const extFiles = exteriorItems.filter((x) => x.type === "file").map((x) => x.file);
            const intUrls = interiorItems.filter((x) => x.type === "url").map((x) => x.url);
            const intFiles = interiorItems.filter((x) => x.type === "file").map((x) => x.file);
            fd.append("exteriorUrls", JSON.stringify(extUrls));
            fd.append("interiorUrls", JSON.stringify(intUrls));
            extFiles.forEach((f) => fd.append("exterior", f));
            intFiles.forEach((f) => fd.append("interior", f));
            const { data } = await axios.put(`/api/hotels/owner/${hotelId}/supplement`, fd, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                toast.success(data.needsApproval ? "修改已提交，等待管理员审核" : (data.message || "已保存"));
                fetchData();
            } else toast.error(data.message || "保存失败");
        } catch (e) {
            toast.error(e?.response?.data?.message || "提交失败");
        } finally {
            setSubmitting(false);
        }
    };

    const goToAddRoom = () => {
        navigate(`/owner/hotels/${hotelId}/add-room`, { state: { returnTo: "supplement" } });
    };

    if (loading || !hotel) return <p className="text-gray-600 p-4">加载中...</p>;
    const allowedStatuses = ["pending_audit", "pending_list", "approved"];
    if (!allowedStatuses.includes(hotel.status)) {
        return (
            <div className="p-4">
                <p className="text-gray-600 mb-4">该酒店状态无法查看详情，请返回酒店列表。</p>
                <button type="button" onClick={() => navigate("/owner/hotel-info")} className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300">
                    返回
                </button>
            </div>
        );
    }

    const hasPreReview = hotel.applicantName || hotel.licenseUrl;

    return (
        <div className="w-full max-w-4xl mx-auto p-3 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">
                    {hotel.status === "pending_audit" ? "酒店详细信息（再审核）" : hotel.hasPendingMods ? "酒店详细信息（待审核修改）" : "酒店详细信息"}
                </h1>
                <button type="button" onClick={() => navigate("/owner/hotel-info")} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50">
                    返回酒店列表
                </button>
            </div>

            {/* 预审单信息（只读） */}
            {hasPreReview && (
                <section className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>预审单信息</span>
                        <span className="text-xs font-normal text-amber-600">（不可修改）</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
                        {hotel.applicantName && <div><span className="text-gray-500 block">申请人</span><p className="font-medium text-gray-800">{hotel.applicantName}</p></div>}
                        {hotel.applicantPhone && <div><span className="text-gray-500 block">申请人手机</span><p className="font-medium text-gray-800">{hotel.applicantPhone}</p></div>}
                        {hotel.name && <div><span className="text-gray-500 block">酒店名称</span><p className="font-medium text-gray-800">{hotel.name}</p></div>}
                        {hotel.city && <div><span className="text-gray-500 block">城市</span><p className="font-medium text-gray-800">{hotel.city}</p></div>}
                        {hotel.address && <div className="sm:col-span-2"><span className="text-gray-500 block">地址</span><p className="font-medium text-gray-800">{hotel.address}</p></div>}
                        {hotel.contact && <div><span className="text-gray-500 block">联系电话</span><p className="font-medium text-gray-800">{hotel.contact}</p></div>}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-4">
                        {hotel.licenseUrl && (
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">营业执照</span>
                                <a href={hotel.licenseUrl} target="_blank" rel="noopener noreferrer"><img src={hotel.licenseUrl} alt="执照" className="h-20 w-auto rounded border object-cover" /></a>
                            </div>
                        )}
                        {hotel.starRatingCertificateUrl && (
                            <div>
                                <span className="block text-gray-500 text-xs mb-1">星级评定证明</span>
                                <a href={hotel.starRatingCertificateUrl} target="_blank" rel="noopener noreferrer"><img src={hotel.starRatingCertificateUrl} alt="星级" className="h-20 w-auto rounded border object-cover" /></a>
                            </div>
                        )}
                        {hotel.images?.length > 0 && (
                            <div className="w-full">
                                <span className="block text-gray-500 text-xs mb-2">预审照片</span>
                                <div className="flex flex-wrap gap-2">
                                    {hotel.images.map((img, i) => (
                                        <a key={i} href={img} target="_blank" rel="noopener noreferrer"><img src={img} alt="" className="h-20 w-24 object-cover rounded border" /></a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* 补充信息（可编辑，与再审核时完全一致） */}
            <form onSubmit={handleSubmit} className="mb-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">补充信息</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-600 mb-1">纬度（地图定位）</label>
                            <input type="text" value={form.latitude} onChange={(e) => setForm((f) => ({ ...f, latitude: e.target.value }))} placeholder="如 31.23" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">经度（地图定位）</label>
                            <input type="text" value={form.longitude} onChange={(e) => setForm((f) => ({ ...f, longitude: e.target.value }))} placeholder="如 121.47" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">门牌号</label>
                            <input type="text" value={form.doorNumber} onChange={(e) => setForm((f) => ({ ...f, doorNumber: e.target.value }))} placeholder="如 88号" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">客房总数</label>
                            <input type="number" min="0" value={form.totalRoomCount} onChange={(e) => setForm((f) => ({ ...f, totalRoomCount: e.target.value }))} placeholder="如 50" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-gray-600 mb-1">酒店英文名</label>
                            <input type="text" value={form.nameEn} onChange={(e) => setForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="如 Grand Hotel" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-gray-600 mb-2">酒店外部更多照片</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {exteriorItems.map((item, i) => (
                                    <div key={`e-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 group relative">
                                        {item.type === "url" ? (
                                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={URL.createObjectURL(item.file)} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeExterior(i)}
                                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                            title="删除"
                                        >
                                            <IoClose size={14} />
                                        </button>
                                    </div>
                                ))}
                                {exteriorItems.length < 6 && (
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addExteriorFiles(e.target.files); e.target.value = ""; }} />
                                        <div className="text-center text-gray-500">
                                            <IoCloudUploadOutline className="w-8 h-8 mx-auto mb-1 opacity-60" />
                                            <span className="text-xs">点击上传</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-gray-600 mb-2">酒店内部更多照片</label>
                            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                                {interiorItems.map((item, i) => (
                                    <div key={`i-${i}`} className="aspect-square rounded-lg border-2 border-dashed border-gray-300 overflow-hidden bg-gray-50 group relative">
                                        {item.type === "url" ? (
                                            <img src={item.url} alt="" className="w-full h-full object-cover" />
                                        ) : (
                                            <img src={URL.createObjectURL(item.file)} alt="" className="w-full h-full object-cover" />
                                        )}
                                        <button
                                            type="button"
                                            onClick={() => removeInterior(i)}
                                            className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                                            title="删除"
                                        >
                                            <IoClose size={14} />
                                        </button>
                                    </div>
                                ))}
                                {interiorItems.length < 6 && (
                                    <label className="aspect-square rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-colors">
                                        <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => { addInteriorFiles(e.target.files); e.target.value = ""; }} />
                                        <div className="text-center text-gray-500">
                                            <IoCloudUploadOutline className="w-8 h-8 mx-auto mb-1 opacity-60" />
                                            <span className="text-xs">点击上传</span>
                                        </div>
                                    </label>
                                )}
                            </div>
                        </div>
                    </div>
                </form>

            {/* 新增房间模块 */}
            <section className="mb-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-semibold text-gray-800">房间列表</h2>
                    {((hotel.status === "pending_list" || hotel.status === "approved") || (hotel.status === "pending_audit" && !hotel.supplementSubmitted)) && (
                        <button type="button" onClick={goToAddRoom} className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium">
                            <IoAdd size={18} /> 新增房间
                        </button>
                    )}
                </div>
                {rooms.length === 0 ? (
                    <p className="text-gray-500 text-sm py-4">暂无房间，点击上方「新增房间」添加</p>
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
                                    <th className="p-2 sm:p-3 text-gray-600 font-medium w-20">操作</th>
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
                                        <td className="p-2 sm:p-3 font-medium">{roomTypeToCn[r.roomType] || r.roomType}</td>
                                        <td className="p-2 sm:p-3">{r.pricePerNight} 元</td>
                                        <td className="p-2 sm:p-3">
                                            <PromoDiscountStepper value={r.promoDiscount} roomId={r._id} onUpdate={() => fetchData(false)} axios={axios} getToken={getToken} />
                                        </td>
                                        <td className="p-2 sm:p-3">
                                            <RoomCountStepper value={r.roomCount ?? 1} roomId={r._id} onUpdate={() => fetchData(false)} axios={axios} getToken={getToken} />
                                        </td>
                                        <td className="p-2 sm:p-3">
                                            <button
                                                type="button"
                                                onClick={() => navigate(`/owner/edit-room/${r._id}`, { state: { hotelId: hotelId, returnTo: "supplement" } })}
                                                className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="编辑房间（修改后需再审核）"
                                            >
                                                <IoCreateOutline size={16} /> 编辑
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {/* 提交/保存按钮 + 待审核标识 */}
            <div className="flex items-center justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                    {hotel.hasPendingMods && <span className="inline-block px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-lg">待审核（管理员以最后一次提交为准，审核前可继续保存）</span>}
                    {hotel.status === "pending_audit" && hotel.supplementSubmitted && !hotel.hasPendingMods && <p className="text-green-600 text-sm">已提交，等待管理员审核</p>}
                    {hotel.status === "pending_list" && !hotel.hasPendingMods && <p className="text-blue-600 text-sm">待上架，请到酒店列表批量上架</p>}
                    {hotel.status === "approved" && !hotel.hasPendingMods && <p className="text-green-600 text-sm">已上架</p>}
                </div>
                <div className="shrink-0">
                    {hotel.status === "pending_audit" && !hotel.supplementSubmitted && (
                        <form onSubmit={handleSubmit}>
                            <button type="submit" disabled={submitting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                                {submitting ? "提交中..." : "提交"}
                            </button>
                        </form>
                    )}
                    {(hotel.status === "pending_list" || hotel.status === "approved") && (
                        <form onSubmit={handleSubmit}>
                            <button type="submit" disabled={submitting} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium">
                                {submitting ? "保存中..." : "保存"}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
}

export default HotelReauditDetail;
