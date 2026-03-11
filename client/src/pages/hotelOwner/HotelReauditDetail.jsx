import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";
import { IoAdd, IoCloudUploadOutline, IoCreateOutline, IoClose } from "react-icons/io5";
import AddressInput from "../../components/AddressInput";
import CityInput, { parseCityFromDistrict, parseDistrictFromDistrict } from "../../components/CityInput";
import { getRoomTypeLabel } from "../../utils/roomTypes";

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

function HotelReauditDetail() {
    const { hotelId } = useParams();
    const navigate = useNavigate();
    const { axios, getToken } = useAppContext();
    const [hotel, setHotel] = useState(null);
    const [rooms, setRooms] = useState([]);
    const [roomPage, setRoomPage] = useState(1);
    const [roomTotalCount, setRoomTotalCount] = useState(0);
    const ROOM_PAGE_SIZE = 10;
    const [roomToDelete, setRoomToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [form, setForm] = useState({
        name: "",
        city: "",
        district: "",
        address: "",
        contact: "",
        latitude: "",
        longitude: "",
        doorNumber: "",
        totalRoomCount: "",
        nameEn: "",
    });
    const [exteriorItems, setExteriorItems] = useState([]); // [{type:'url',url}|{type:'file',file}]
    const [interiorItems, setInteriorItems] = useState([]);
    const [displayImages, setDisplayImages] = useState([]);
    const [savingDisplay, setSavingDisplay] = useState(false);
    const fetchVersionRef = useRef(0);

    const draftKey = hotelId ? `hotelSupplementDraft_${hotelId}` : null;

    const updateForm = (patch) => {
        setForm((prev) => {
            const next = { ...prev, ...patch };
            try {
                if (draftKey) {
                    localStorage.setItem(draftKey, JSON.stringify(next));
                }
            } catch {
                // ignore storage errors
            }
            return next;
        });
    };

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
            const hotelRes = await axios.get(`/api/hotels/owner/${hotelId}`, { headers: { Authorization: `Bearer ${token}` } });
            if (myVersion !== fetchVersionRef.current) return;
            if (hotelRes.data?.success) {
                const h = hotelRes.data.hotel;
                setHotel(h);
                const baseForm = {
                    name: h.name || "",
                    city: h.city || "",
                    district: h.district || "",
                    address: h.address || "",
                    contact: h.contact || "",
                    latitude: h.latitude != null ? String(h.latitude) : "",
                    longitude: h.longitude != null ? String(h.longitude) : "",
                    doorNumber: h.doorNumber || "",
                    totalRoomCount: h.totalRoomCount != null ? String(h.totalRoomCount) : "",
                    nameEn: h.nameEn || "",
                };
                setForm(baseForm);
                if (draftKey) {
                    try {
                        const stored = localStorage.getItem(draftKey);
                        if (stored) {
                            const parsed = JSON.parse(stored);
                            setForm((prev) => ({ ...prev, ...parsed }));
                        }
                    } catch {
                        // ignore parse/storage errors
                    }
                }
                setDisplayImages(Array.isArray(h.images) ? h.images.map(String) : []);
            }
        } catch {
            if (myVersion === fetchVersionRef.current) { toast.error("获取数据失败"); navigate("/owner/hotel-info"); }
        } finally {
            if (myVersion === fetchVersionRef.current) setLoading(false);
        }
    };

    const fetchRoomsList = async (page) => {
        if (!hotelId) return;
        try {
            const token = await getToken();
            const params = new URLSearchParams({ hotelId, page: String(page), limit: String(ROOM_PAGE_SIZE) });
            const { data } = await axios.get(`/api/rooms/owner?${params}`, { headers: { Authorization: `Bearer ${token}` } });
            if (data?.success) {
                setRooms(data.rooms || []);
                setRoomTotalCount(data.totalCount ?? 0);
            }
        } catch {
            setRooms([]);
            setRoomTotalCount(0);
        }
    };

    useEffect(() => {
        if (!hotelId) return;
        setRoomPage(1);
        fetchData();
        fetchRoomsList(1);
    }, [hotelId]);

    useEffect(() => {
        if (!hotelId || roomPage <= 1) return;
        fetchRoomsList(roomPage);
    }, [roomPage]);

    const saveSupplement = async () => {
        if (!hotel) return;
        if (hotel.status === "pending_audit" && hotel.supplementSubmitted && !hotel.hasPendingMods) {
            toast.error("已提交，不可重复提交");
            return;
        }
        setSubmitting(true);
        try {
            const token = await getToken();
            const fd = new FormData();
            fd.append("name", form.name);
            fd.append("city", form.city);
            fd.append("district", form.district);
            fd.append("address", form.address);
            fd.append("contact", form.contact);
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
                if (draftKey) {
                    try {
                        localStorage.removeItem(draftKey);
                    } catch {
                        // ignore storage errors
                    }
                }
                toast.success(data.needsApproval ? "修改已提交，等待管理员审核" : (data.message || "已保存"));
                fetchData();
                fetchRoomsList(roomPage);
            } else toast.error(data.message || "保存失败");
        } catch (e) {
            toast.error(e?.response?.data?.message || "提交失败");
        } finally {
            setSubmitting(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        await saveSupplement();
    };

    const goToAddRoom = async () => {
        await saveSupplement();
        navigate(`/owner/hotels/${hotelId}/add-room`, { state: { returnTo: "supplement" } });
    };

    const toggleRoomAvailability = async (roomId) => {
        try {
            const token = await getToken();
            const { data } = await axios.post("/api/rooms/toogle-avalibility", { roomId }, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success(data.needsApproval ? "上架申请已提交，等待管理员审核" : (data.room?.isAvailable ? "已上架" : "已下架"));
                fetchRoomsList(roomPage);
            } else {
                toast.error(data.message || "操作失败");
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || "操作失败");
        }
    };

    const openDeleteConfirm = (room) => setRoomToDelete(room);

    const confirmDelete = async () => {
        if (!roomToDelete) return;
        setDeleting(true);
        try {
            const token = await getToken();
            const { data } = await axios.delete(`/api/rooms/${roomToDelete._id}`, { headers: { Authorization: `Bearer ${token}` } });
            if (data.success) {
                toast.success("房间已删除");
                setRoomToDelete(null);
                fetchRoomsList(roomPage);
            } else {
                toast.error(data.message || "删除失败");
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || "删除失败");
        } finally {
            setDeleting(false);
        }
    };

    const allDisplayCandidates = [
        ...((hotel?.hotelExteriorImages || []).map((url) => ({ url, source: "exterior" }))),
        ...((hotel?.hotelInteriorImages || []).map((url) => ({ url, source: "interior" }))),
    ].reduce((acc, item) => {
        if (!acc.some((x) => x.url === item.url)) acc.push(item);
        return acc;
    }, []);

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

            {/* 预审单信息（仅申请人、执照、星级为只读） */}
            {hasPreReview && (
                <section className="mb-8 p-4 sm:p-6 bg-gray-50 rounded-xl border border-gray-200">
                    <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                        <span>预审单信息</span>
                        <span className="text-xs font-normal text-amber-600">（不可修改：申请人、执照、星级评定）</span>
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {hotel.applicantName && <div><span className="text-gray-500 block">申请人</span><p className="font-medium text-gray-800">{hotel.applicantName}</p></div>}
                        {hotel.applicantPhone && <div><span className="text-gray-500 block">申请人手机</span><p className="font-medium text-gray-800">{hotel.applicantPhone}</p></div>}
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

            {/* 补充信息（可编辑，含酒店名/城市/地址/联系电话） */}
            <form onSubmit={handleSubmit} className="mb-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                    <h2 className="text-base font-semibold text-gray-800 mb-4">补充信息（可编辑）</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        <div>
                            <label className="block text-gray-600 mb-1">酒店名称 *</label>
                            <input type="text" value={form.name} onChange={(e) => updateForm({ name: e.target.value })} placeholder="酒店名称" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">行政区（由选中地址解析）</label>
                            <input type="text" value={form.district} readOnly placeholder="请从地址联想中选择" className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">城市 *</label>
                            <CityInput
                                value={form.city}
                                onChange={(v) => updateForm({ city: v })}
                                placeholder="输入城市后选择"
                                required
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-gray-600 mb-1">地址 *</label>
                            <AddressInput
                                value={form.address}
                                onChange={(v) => updateForm({ address: v })}
                                city={form.city}
                                onSelect={(tip) => {
                                    const patch = {};
                                    if (tip?.district) {
                                        patch.city = parseCityFromDistrict(tip.district) || form.city;
                                        patch.district = parseDistrictFromDistrict(tip.district) || form.district;
                                    }
                                    if (tip?.address) patch.doorNumber = tip.address;
                                    if (tip?.location) {
                                        const [lng, lat] = String(tip.location).split(',').map(Number);
                                        patch.longitude = Number.isFinite(lng) ? String(lng) : form.longitude;
                                        patch.latitude = Number.isFinite(lat) ? String(lat) : form.latitude;
                                    }
                                    if (Object.keys(patch).length) updateForm(patch);
                                }}
                                placeholder="输入地址后选择（已选城市则限定在该城市内）"
                                className="w-full border border-gray-300 rounded-lg px-3 py-2"
                            />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">联系电话 *</label>
                            <input type="text" value={form.contact} onChange={(e) => updateForm({ contact: e.target.value })} placeholder="酒店联系电话" required className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">纬度（由选中地址解析）</label>
                            <input type="text" value={form.latitude} readOnly placeholder="请从地址联想中选择" className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">经度（由选中地址解析）</label>
                            <input type="text" value={form.longitude} readOnly placeholder="请从地址联想中选择" className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">门牌号（由选中地址解析）</label>
                            <input type="text" value={form.doorNumber} readOnly placeholder="请从地址联想中选择" className="w-full border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 text-gray-600" />
                        </div>
                        <div>
                            <label className="block text-gray-600 mb-1">客房总数</label>
                            <input type="number" min="0" value={form.totalRoomCount} onChange={(e) => updateForm({ totalRoomCount: e.target.value })} placeholder="如 50" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
                        </div>
                        <div className="sm:col-span-2">
                            <label className="block text-gray-600 mb-1">酒店英文名</label>
                            <input type="text" value={form.nameEn} onChange={(e) => updateForm({ nameEn: e.target.value })} placeholder="如 Grand Hotel" className="w-full border border-gray-300 rounded-lg px-3 py-2" />
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

            {/* 酒店展示区管理：选择在前台展示的轮播图片 */}
            <section className="mb-8 p-4 sm:p-6 bg-white rounded-xl border border-gray-200 shadow-sm">
                <h2 className="text-base font-semibold text-gray-800 mb-2">酒店展示区管理</h2>
                <p className="text-xs text-gray-500 mb-4">
                    这些图片将用于用户端「酒店列表卡片主图」和「酒店详情页顶部轮播」。只能从已上传的
                    「酒店外部更多照片」和「酒店内部更多照片」中勾选。
                </p>
                {allDisplayCandidates.length === 0 ? (
                    <p className="text-gray-500 text-sm">请先在上方上传酒店内外部照片，再来选择展示图片。</p>
                ) : (
                    <>
                        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 mb-4">
                            {allDisplayCandidates.map(({ url, source }) => {
                                const selected = displayImages.includes(url);
                                return (
                                    <button
                                        key={url}
                                        type="button"
                                        onClick={() => {
                                            setDisplayImages((prev) =>
                                                prev.includes(url) ? prev.filter((u) => u !== url) : [...prev, url]
                                            );
                                        }}
                                        className={`relative aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                                            selected ? "border-blue-500 ring-2 ring-blue-300" : "border-gray-200 hover:border-blue-300"
                                        }`}
                                    >
                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                        <span className="absolute left-1.5 top-1.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-black/60 text-white">
                                            {source === "exterior" ? "外部" : "内部"}
                                        </span>
                                        {selected && (
                                            <span className="absolute right-1.5 top-1.5 w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center">
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                        <button
                            type="button"
                            onClick={async () => {
                                if (!hotel) return;
                                setSavingDisplay(true);
                                try {
                                    const token = await getToken();
                                    const { data } = await axios.put(
                                        `/api/hotels/owner/${hotelId}/display-images`,
                                        { images: displayImages },
                                        { headers: { Authorization: `Bearer ${token}` } }
                                    );
                                    if (data.success) {
                                        toast.success(data.message || "展示图片已保存");
                                    } else {
                                        toast.error(data.message || "保存失败");
                                    }
                                } catch (e) {
                                    toast.error(e?.response?.data?.message || "保存失败");
                                } finally {
                                    setSavingDisplay(false);
                                }
                            }}
                            disabled={savingDisplay}
                            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium disabled:opacity-50"
                        >
                            {savingDisplay ? "保存中..." : "保存展示图片"}
                        </button>
                    </>
                )}
            </section>

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
                                    <th className="p-2 sm:p-3 text-gray-600 font-medium">状态</th>
                                    <th className="p-2 sm:p-3 text-gray-600 font-medium w-28">操作</th>
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
                                        <td className="p-2 sm:p-3 font-medium">{getRoomTypeLabel(r.roomType)}</td>
                                        <td className="p-2 sm:p-3">{r.pricePerNight} 元</td>
                                        <td className="p-2 sm:p-3">
                                            <PromoDiscountStepper value={r.promoDiscount} roomId={r._id} onUpdate={() => fetchRoomsList(roomPage)} axios={axios} getToken={getToken} />
                                        </td>
                                        <td className="p-2 sm:p-3">
                                            <RoomCountStepper value={r.roomCount ?? 1} roomId={r._id} onUpdate={() => fetchRoomsList(roomPage)} axios={axios} getToken={getToken} />
                                        </td>
                                        <td className="p-2 sm:p-3">
                                            <label className="inline-flex items-center cursor-pointer">
                                                <input
                                                    type="checkbox"
                                                    checked={r.isAvailable ?? true}
                                                    onChange={() => toggleRoomAvailability(r._id)}
                                                    className="form-checkbox h-4 w-4 text-blue-600"
                                                />
                                                <span className="ml-2 text-sm text-gray-700">{r.isAvailable ? "在售" : "已下架"}</span>
                                            </label>
                                        </td>
                                        <td className="p-2 sm:p-3">
                                            <div className="flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => navigate(`/owner/edit-room/${r._id}`, { state: { hotelId: hotelId, returnTo: "supplement" } })}
                                                    className="inline-flex items-center gap-1 px-2 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                                                    title="编辑房间（修改后需再审核）"
                                                >
                                                    <IoCreateOutline size={16} /> 编辑
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => openDeleteConfirm(r)}
                                                    className="inline-flex items-center px-2 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg"
                                                    title="删除该房型"
                                                >
                                                    删除
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {roomTotalCount > 0 && (
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <span className="text-gray-600 text-sm">共 {roomTotalCount} 条，每页 {ROOM_PAGE_SIZE} 条</span>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setRoomPage((p) => Math.max(1, p - 1))}
                                disabled={roomPage <= 1}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                上一页
                            </button>
                            <span className="text-gray-600 text-sm">第 {roomPage} / {Math.max(1, Math.ceil(roomTotalCount / ROOM_PAGE_SIZE))} 页</span>
                            <button
                                type="button"
                                onClick={() => setRoomPage((p) => p + 1)}
                                disabled={roomPage >= Math.ceil(roomTotalCount / ROOM_PAGE_SIZE)}
                                className="px-3 py-1.5 border border-gray-300 rounded text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                            >
                                下一页
                            </button>
                        </div>
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

            {/* 删除确认弹窗 */}
            {roomToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => !deleting && setRoomToDelete(null)}>
                    <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <p className="text-gray-800 font-medium mb-1">确认删除</p>
                        <p className="text-gray-600 text-sm mb-6">
                            确定要删除房型「{getRoomTypeLabel(roomToDelete.roomType)}」吗？删除后不可恢复。
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={() => setRoomToDelete(null)}
                                className="px-4 py-2 text-gray-700 border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                disabled={deleting}
                                onClick={confirmDelete}
                                className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50"
                            >
                                {deleting ? "删除中..." : "确定删除"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default HotelReauditDetail;
