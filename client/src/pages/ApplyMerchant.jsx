import { useState, useEffect } from "react";
import { useAppContext } from "../context/AppContext";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const STATUS_TEXT = {
  none: "未申请",
  pending: "审核中",
  approved: "已通过",
  rejected: "已驳回",
};

function ApplyMerchant() {
  const { role, merchantApplicationStatus, fetchUser, isAuthenticated, axios, getToken } = useAppContext();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    applicantName: "",
    applicantPhone: "",
    hotelName: "",
    hotelAddress: "",
    hotelCity: "",
    hotelContact: "",
  });
  const [licenseFile, setLicenseFile] = useState(null);
  const [exteriorFiles, setExteriorFiles] = useState([]);
  const [interiorFiles, setInteriorFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReapplyForm, setShowReapplyForm] = useState(false);

  useEffect(() => {
    if (merchantApplicationStatus === "rejected") {
      try {
        if (localStorage.getItem("merchantReapplyDismissed") === "1") {
          setShowReapplyForm(true);
        }
      } catch (_) {}
      (async () => {
        try {
          const token = await getToken();
          const { data } = await axios.get("/api/merchant/my-application", {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (data.application?.rejectReason) setRejectReason(data.application.rejectReason);
        } catch (_) {}
      })();
    } else {
      try {
        localStorage.removeItem("merchantReapplyDismissed");
      } catch (_) {}
    }
  }, [merchantApplicationStatus, getToken, axios]);

  if (!isAuthenticated) {
    navigate("/login");
    return null;
  }

  const status = merchantApplicationStatus || "none";
  const showForm = status === "none" || (status === "rejected" && showReapplyForm);
  const allFilled =
    form.applicantName.trim() &&
    form.applicantPhone.trim() &&
    form.hotelName.trim() &&
    form.hotelAddress.trim() &&
    form.hotelCity.trim() &&
    form.hotelContact.trim() &&
    licenseFile &&
    exteriorFiles.length > 0 &&
    interiorFiles.length > 0;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allFilled) {
      toast.error("请填写所有必填信息并上传执照、酒店外部及内部照片");
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
      fd.append("hotelContact", form.hotelContact.trim());
      fd.append("license", licenseFile);
      exteriorFiles.forEach((f) => fd.append("exterior", f));
      interiorFiles.forEach((f) => fd.append("interior", f));
      const { data } = await axios.post("/api/merchant/apply", fd, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        try {
          localStorage.removeItem("merchantReapplyDismissed");
        } catch (_) {}
        toast.success("申请已提交，请等待审核");
        await fetchUser();
      } else {
        toast.error(data.message || "申请失败");
      }
    } catch (e) {
      toast.error(e.response?.data?.message || "申请失败");
    } finally {
      setLoading(false);
    }
  }

  const inputCls = "w-full border border-gray-200 rounded-lg p-2";
  const labelCls = "block text-sm text-gray-700 mb-1";

  const UploadBox = ({ id, onChange, multiple }) => (
    <label
      htmlFor={id}
      className="flex flex-col items-center justify-center w-32 h-32 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer transition-colors"
    >
      <input
        id={id}
        type="file"
        accept="image/*"
        multiple={multiple}
        className="hidden"
        onChange={onChange}
      />
      <span className="text-3xl text-gray-500 leading-none mb-2">+</span>
      <span className="text-sm text-gray-500">上传图片</span>
    </label>
  );

  return (
    <div className="fixed inset-0 overflow-y-auto overflow-x-hidden bg-gray-100 z-0">
      <div className="pt-20 pb-16 px-4">
        <div className={`min-h-[calc(100vh-5rem)] flex flex-col items-center justify-center ${showForm ? "mt-8" : "-mt-8"}`}>
          <div className="bg-white rounded-xl shadow-lg p-8 max-w-2xl w-full flex-shrink-0">
        <h1 className="text-2xl font-bold text-center mb-2">入驻酒店</h1>
        <p className="text-gray-600 text-center text-sm mb-6">
          申请成为商户后，可上传酒店信息、管理房型、接收预订订单。
        </p>

        {showForm && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {status === "rejected" && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-2">
                根据驳回原因修改后重新提交
              </p>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 items-start">
              <div className="flex flex-col">
                <label className={labelCls}>申请人姓名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.applicantName}
                  onChange={(e) => setForm((f) => ({ ...f, applicantName: e.target.value }))}
                  placeholder="请输入申请人姓名"
                />
              </div>
              <div className="flex flex-col">
                <label className={labelCls}>申请人手机号 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  className={inputCls}
                  value={form.applicantPhone}
                  onChange={(e) => setForm((f) => ({ ...f, applicantPhone: e.target.value }))}
                  placeholder="请输入申请人手机号"
                />
              </div>
              <div className="flex flex-col">
                <label className={labelCls}>酒店名称 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.hotelName}
                  onChange={(e) => setForm((f) => ({ ...f, hotelName: e.target.value }))}
                  placeholder="请输入酒店名称"
                />
              </div>
              <div className="flex flex-col">
                <label className={labelCls}>酒店所在城市 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.hotelCity}
                  onChange={(e) => setForm((f) => ({ ...f, hotelCity: e.target.value }))}
                  placeholder="如：北京、上海"
                />
              </div>
              <div className="flex flex-col">
                <label className={labelCls}>酒店地址 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  className={inputCls}
                  value={form.hotelAddress}
                  onChange={(e) => setForm((f) => ({ ...f, hotelAddress: e.target.value }))}
                  placeholder="请输入酒店详细地址"
                />
              </div>
              <div className="flex flex-col">
                <label className={labelCls}>酒店联系电话 <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  className={inputCls}
                  value={form.hotelContact}
                  onChange={(e) => setForm((f) => ({ ...f, hotelContact: e.target.value }))}
                  placeholder="请输入酒店联系电话"
                />
              </div>
              <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 pt-1">
                <div className="flex flex-col">
                  <span className={labelCls}>营业执照 <span className="text-red-500">*</span></span>
                  <div className="mt-1">
                    <UploadBox
                      id="license-upload"
                      onChange={(e) => setLicenseFile(e.target.files?.[0] || null)}
                      multiple={false}
                    />
                    {licenseFile && <p className="text-xs text-gray-600 mt-1">已选：{licenseFile.name}</p>}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={labelCls}>酒店外部照片 <span className="text-red-500">*</span></span>
                  <div className="mt-1">
                    <UploadBox
                      id="exterior-upload"
                      onChange={(e) => setExteriorFiles(Array.from(e.target.files || []))}
                      multiple={true}
                    />
                    {exteriorFiles.length > 0 && <p className="text-xs text-gray-600 mt-1">已选 {exteriorFiles.length} 张</p>}
                  </div>
                </div>
                <div className="flex flex-col">
                  <span className={labelCls}>酒店内部照片 <span className="text-red-500">*</span></span>
                  <div className="mt-1">
                    <UploadBox
                      id="interior-upload"
                      onChange={(e) => setInteriorFiles(Array.from(e.target.files || []))}
                      multiple={true}
                    />
                    {interiorFiles.length > 0 && <p className="text-xs text-gray-600 mt-1">已选 {interiorFiles.length} 张</p>}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-4">
              <button
                type="submit"
                disabled={loading || !allFilled}
                className="flex-1 py-2 px-3 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? "提交中..." : "提交申请"}
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium shadow"
              >
                返回
              </button>
            </div>
          </form>
        )}

        {status === "pending" && (
          <div className="text-center py-4 px-4 rounded-lg bg-amber-50 border border-amber-200">
            <p className="text-amber-800 font-medium">审核中</p>
            <p className="text-amber-700 text-sm mt-1">您的申请已提交，请等待管理员审核</p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium shadow"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {status === "rejected" && !showReapplyForm && (
          <div className="text-center py-4 px-4 rounded-lg bg-red-50 border border-red-200">
            <p className="text-red-800 font-medium">已驳回</p>
            <p className="text-red-700 text-sm mt-1">您的申请未通过，如有疑问请联系客服</p>
            {rejectReason && (
              <p className="text-red-600 text-sm mt-2 p-2 bg-red-100/50 rounded">驳回原因：{rejectReason}</p>
            )}
            <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={() => {
                setShowReapplyForm(true);
                try {
                  localStorage.setItem("merchantReapplyDismissed", "1");
                } catch (_) {}
              }}
              className="flex-1 py-2 px-3 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium"
            >
              再次申请
            </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium shadow"
              >
                返回
              </button>
            </div>
          </div>
        )}

        {status === "approved" && role === "merchant" && (
          <div className="text-center py-4">
            <p className="text-green-800 font-medium">您已是商户</p>
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={() => navigate("/owner")}
                className="flex-1 py-2 px-3 text-sm bg-gray-800 hover:bg-gray-700 text-white rounded-full font-medium"
              >
                进入商户中心
              </button>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="flex-1 py-2 px-3 text-sm bg-white hover:bg-gray-50 text-gray-800 border border-gray-200 rounded-full font-medium shadow"
              >
                返回
              </button>
            </div>
          </div>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ApplyMerchant;
