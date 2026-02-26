import { useState } from "react";
import { IoIosCloseCircleOutline } from "react-icons/io";
import { useAppContext } from "../context/AppContext";
import toast from "react-hot-toast";
import AddressInput from "./AddressInput";
import CityInput, { parseCityFromDistrict, parseDistrictFromDistrict } from "./CityInput";

/**
 * 预审单 - 与用户首次申请入驻酒店时填写的表单相同
 * 用于：商户新增酒店（弹窗模式）
 */
function PreReviewForm({ onClose, onSuccess }) {
    const { axios, getToken } = useAppContext();

    const [form, setForm] = useState({
        applicantName: "",
        applicantPhone: "",
        hotelName: "",
        hotelAddress: "",
        hotelCity: "",
        hotelDistrict: "",
        hotelContact: "",
    });
    const [licenseFile, setLicenseFile] = useState(null);
    const [starRatingFile, setStarRatingFile] = useState(null);
    const [exteriorFiles, setExteriorFiles] = useState([]);
    const [interiorFiles, setInteriorFiles] = useState([]);
    const [loading, setLoading] = useState(false);

    const allFilled =
        form.applicantName.trim() &&
        form.applicantPhone.trim() &&
        form.hotelName.trim() &&
        form.hotelAddress.trim() &&
        form.hotelCity.trim() &&
        form.hotelContact.trim() &&
        licenseFile &&
        starRatingFile &&
        exteriorFiles.length > 0 &&
        interiorFiles.length > 0;

    async function handleSubmit(e) {
        e.preventDefault();
        if (!allFilled) {
            toast.error("请填写所有必填信息并上传执照、星级评定证明、酒店外部及内部照片");
            return;
        }
        setLoading(true);
        try {
            const token = await getToken();
            const fd = new FormData();
            fd.append("applicantName", form.applicantName.trim());
            fd.append("applicantPhone", form.applicantPhone.trim());
            fd.append("hotelName", form.hotelName.trim());
            fd.append("hotelAddress", form.hotelAddress.trim());
            fd.append("hotelCity", form.hotelCity.trim());
            fd.append("hotelDistrict", form.hotelDistrict.trim());
            fd.append("hotelContact", form.hotelContact.trim());
            fd.append("license", licenseFile);
            fd.append("starRating", starRatingFile);
            exteriorFiles.forEach((f) => fd.append("exterior", f));
            interiorFiles.forEach((f) => fd.append("interior", f));

            const { data } = await axios.post("/api/hotels/pre-review", fd, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (data.success) {
                toast.success("预审单已提交，等待管理员审核");
                onSuccess?.();
                onClose?.();
            } else {
                toast.error(data.message || "提交失败");
            }
        } catch (e) {
            toast.error(e?.response?.data?.message || "提交失败");
        } finally {
            setLoading(false);
        }
    }

    const inputCls = "w-full border border-gray-200 rounded-lg p-2";
    const labelCls = "block text-sm text-gray-700 mb-1";

    const boxCls = "w-32 h-32 rounded-lg bg-gray-100 overflow-hidden shrink-0 border border-gray-200";
    const UploadBox = ({ id, onChange, multiple, preview, onRemove }) => {
        const isMulti = Array.isArray(preview);
        const files = isMulti ? preview : (preview ? [preview] : []);
        const firstFile = files[0];
        const restFiles = files.slice(1);
        return (
            <div className="flex flex-wrap gap-2">
                <div className="relative">
                    <label
                        htmlFor={id}
                        className={`${boxCls} flex flex-col items-center justify-center hover:bg-gray-200 cursor-pointer transition-colors block`}
                    >
                        <input id={id} type="file" accept="image/*" multiple={multiple} className="hidden" onChange={onChange} />
                        {firstFile ? (
                            <img src={URL.createObjectURL(firstFile)} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <>
                                <span className="text-3xl text-gray-500 leading-none mb-2">+</span>
                                <span className="text-sm text-gray-500">上传图片</span>
                            </>
                        )}
                    </label>
                    {firstFile && (
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onRemove?.(0);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center hover:bg-red-600 shadow"
                        >
                            ×
                        </button>
                    )}
                </div>
                {restFiles.map((f, i) => (
                    <div key={i} className={`${boxCls} relative`}>
                        <img src={URL.createObjectURL(f)} alt="" className="w-full h-full object-cover" />
                        <button
                            type="button"
                            onClick={(e) => {
                                e.preventDefault();
                                onRemove?.(i + 1);
                            }}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white text-sm flex items-center justify-center hover:bg-red-600 shadow"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto p-4">
            <div className="relative w-full max-w-2xl bg-white rounded-xl shadow-xl p-6 sm:p-8 my-8">
                <IoIosCloseCircleOutline
                    className="absolute top-4 right-4 text-2xl cursor-pointer text-gray-700 hover:text-red-500 transition"
                    onClick={onClose}
                />
                <h2 className="text-xl font-bold text-center mb-2">预审单</h2>
                <p className="text-gray-600 text-center text-sm mb-6">
                    与用户首次申请入驻酒店时填写的表单相同，请完整填写后提交审核。
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                        <div className="flex flex-col">
                            <label className={labelCls}>
                                申请人姓名 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.applicantName}
                                onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                                placeholder="请输入申请人姓名"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>
                                申请人手机号 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                className={inputCls}
                                value={form.applicantPhone}
                                onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                                placeholder="请输入申请人手机号"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>
                                酒店名称 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                className={inputCls}
                                value={form.hotelName}
                                onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))}
                                placeholder="请输入酒店名称"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>
                                酒店所在城市 <span className="text-red-500">*</span>
                            </label>
                            <CityInput
                                value={form.hotelCity}
                                onChange={(v) => setForm((f) => ({ ...f, hotelCity: v }))}
                                placeholder="输入城市后选择"
                                required
                                className={inputCls}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>行政区（由地址联想填充）</label>
                            <input type="text" value={form.hotelDistrict} readOnly placeholder="请从地址联想中选择" className={`${inputCls} bg-gray-50 text-gray-600`} />
                        </div>
                        <div className="flex flex-col md:col-span-2">
                            <label className={labelCls}>
                                酒店地址 <span className="text-red-500">*</span>
                            </label>
                            <AddressInput
                                value={form.hotelAddress}
                                onChange={(v) => setForm((f) => ({ ...f, hotelAddress: v }))}
                                city={form.hotelCity}
                                onSelect={(tip) => {
                                    if (tip?.district) {
                                        setForm((f) => ({
                                            ...f,
                                            hotelCity: parseCityFromDistrict(tip.district) || f.hotelCity,
                                            hotelDistrict: parseDistrictFromDistrict(tip.district) || f.hotelDistrict
                                        }));
                                    }
                                }}
                                placeholder="输入地址后选择（已选城市则限定在该城市内）"
                                className={inputCls}
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className={labelCls}>
                                酒店联系电话 <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                className={inputCls}
                                value={form.hotelContact}
                                onChange={(e) => setForm((f) => ({ ...f, hotelContact: e.target.value }))}
                                placeholder="请输入酒店联系电话"
                            />
                        </div>
                        <div className="md:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-1">
                            <div className="flex flex-col">
                                <span className={labelCls}>
                                    营业执照 <span className="text-red-500">*</span>
                                </span>
                                <div className="mt-1">
                                    <UploadBox
                                        id="license-upload"
                                        onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                                        multiple={false}
                                        preview={licenseFile}
                                        onRemove={() => setLicenseFile(null)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className={labelCls}>
                                    星级评定证明 <span className="text-red-500">*</span>
                                </span>
                                <div className="mt-1">
                                    <UploadBox
                                        id="starRating-upload"
                                        onChange={(e) => setStarRatingFile(e.target.files?.[0] || null)}
                                        multiple={false}
                                        preview={starRatingFile}
                                        onRemove={() => setStarRatingFile(null)}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className={labelCls}>
                                    酒店外部照片 <span className="text-red-500">*</span>
                                </span>
                                <div className="mt-1">
                                    <UploadBox
                                        id="exterior-upload"
                                        onChange={(e) => setExteriorFiles(Array.from(e.target.files || []))}
                                        multiple={true}
                                        preview={exteriorFiles}
                                        onRemove={(i) => setExteriorFiles((prev) => prev.filter((_, j) => j !== i))}
                                    />
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className={labelCls}>
                                    酒店内部照片 <span className="text-red-500">*</span>
                                </span>
                                <div className="mt-1">
                                    <UploadBox
                                        id="interior-upload"
                                        onChange={(e) => setInteriorFiles(Array.from(e.target.files || []))}
                                        multiple={true}
                                        preview={interiorFiles}
                                        onRemove={(i) => setInteriorFiles((prev) => prev.filter((_, j) => j !== i))}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                        <button
                            type="submit"
                            disabled={loading || !allFilled}
                            className="flex-1 py-2 px-3 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "提交中..." : "提交初审"}
                        </button>
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium shadow"
                        >
                            取消
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default PreReviewForm;
