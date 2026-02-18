import { Fragment, useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

function MerchantApplications() {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/merchant/applications", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setApplications(data.applications || []);
    } catch (e) {
      toast.error("获取列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchList();
  }, []);

  async function handleApprove(id) {
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `/api/merchant/applications/${id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("已批准成为商户");
        fetchList();
        setExpandedId(null);
      } else toast.error(data.message || "操作失败");
    } catch (e) {
      toast.error(e.response?.data?.message || "操作失败");
    }
  }

  function openRejectModal(app) {
    setRejectModal(app);
    setRejectReason("");
  }

  function closeRejectModal() {
    setRejectModal(null);
    setRejectReason("");
  }

  async function handleRejectSubmit() {
    if (!rejectModal) return;
    const reason = rejectReason.trim();
    if (!reason) {
      toast.error("请填写驳回原因");
      return;
    }
    setRejecting(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `/api/merchant/applications/${rejectModal._id}/reject`,
        { rejectReason: reason },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success("已驳回");
        fetchList();
        closeRejectModal();
        setExpandedId(null);
      } else toast.error(data.message || "操作失败");
    } catch (e) {
      toast.error(e.response?.data?.message || "操作失败");
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 mb-6">商户申请审核</h1>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-500">暂无待审核的商户申请</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase w-8" />
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">申请时间</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => (
                <Fragment key={app._id}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === app._id ? null : app._id))}
                        className="text-gray-500 hover:text-gray-700"
                      >
                        {expandedId === app._id ? "▼" : "▶"}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">{app.username}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{app.phone}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {app.createdAt ? new Date(app.createdAt).toLocaleString("zh-CN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => handleApprove(app._id)}
                        className="mr-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        onClick={() => openRejectModal(app)}
                        className="px-3 py-1.5 text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
                      >
                        驳回
                      </button>
                    </td>
                  </tr>
                  {expandedId === app._id && (
                    <tr key={`${app._id}-detail`}>
                      <td colSpan={5} className="px-4 py-4 bg-gray-50">
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">申请人：</span>
                            <span className="text-gray-900">{app.applicantName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">申请人手机号：</span>
                            <span className="text-gray-900">{app.applicantPhone || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">酒店名称：</span>
                            <span className="text-gray-900">{app.hotelName || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">酒店城市：</span>
                            <span className="text-gray-900">{app.hotelCity || "—"}</span>
                          </div>
                          <div className="col-span-2">
                            <span className="text-gray-500">酒店地址：</span>
                            <span className="text-gray-900">{app.hotelAddress || "—"}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">酒店联系电话：</span>
                            <span className="text-gray-900">{app.hotelContact || "—"}</span>
                          </div>
                          {app.licenseUrl && (
                            <div className="col-span-2">
                              <span className="text-gray-500 block mb-1">营业执照：</span>
                              <a
                                href={app.licenseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                查看执照图片
                              </a>
                              <img
                                src={app.licenseUrl}
                                alt="营业执照"
                                className="mt-2 max-h-40 rounded border border-gray-200"
                              />
                            </div>
                          )}
                          {(app.hotelExteriorImages?.length > 0 || app.hotelInteriorImages?.length > 0) && (
                            <div className="col-span-2 space-y-3">
                              {app.hotelExteriorImages?.length > 0 && (
                                <div>
                                  <span className="text-gray-500 block mb-2">酒店外部照片：</span>
                                  <div className="flex flex-wrap gap-2">
                                    {app.hotelExteriorImages.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img src={url} alt={`外部${i + 1}`} className="h-24 w-auto rounded border border-gray-200 object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                              {app.hotelInteriorImages?.length > 0 && (
                                <div>
                                  <span className="text-gray-500 block mb-2">酒店内部照片：</span>
                                  <div className="flex flex-wrap gap-2">
                                    {app.hotelInteriorImages.map((url, i) => (
                                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="block">
                                        <img src={url} alt={`内部${i + 1}`} className="h-24 w-auto rounded border border-gray-200 object-cover" />
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 驳回原因弹窗 */}
      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">驳回申请</h2>
            <p className="text-sm text-gray-600 mb-2">申请人：{rejectModal.username}（{rejectModal.phone}）</p>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              驳回原因 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="请填写驳回原因，申请人将看到此原因"
              className="w-full border border-gray-200 rounded-lg p-3 text-sm h-24 resize-none"
              required
            />
            <div className="flex gap-3 mt-4">
              <button
                type="button"
                onClick={closeRejectModal}
                className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                取消
              </button>
              <button
                type="button"
                onClick={handleRejectSubmit}
                disabled={rejecting || !rejectReason.trim()}
                className="flex-1 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {rejecting ? "提交中..." : "确认驳回"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MerchantApplications;
