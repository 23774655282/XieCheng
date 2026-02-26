import { Fragment, useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";
import toast from "react-hot-toast";

const STATUS_MAP = { pending: "待审核", approved: "已通过", rejected: "已驳回" };

function MerchantApplications() {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [filter, setFilter] = useState(""); // '' | pending | approved | rejected
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const token = await getToken();
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) });
      if (filter) params.set("status", filter);
      const { data } = await axios.get(`/api/merchant/applications?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setApplications(data.applications || []);
        setTotalCount(data.totalCount ?? 0);
      }
    } catch (e) {
      toast.error("获取列表失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setPage(1);
  }, [filter]);

  useEffect(() => {
    fetchList();
  }, [filter, page, pageSize]);

  async function handleApprove(app) {
    try {
      const token = await getToken();
      const url = app.type === "hotel_add"
        ? `/api/merchant/applications/hotel-add/${app._id}/approve`
        : `/api/merchant/applications/${app._id}/approve`;
      const { data } = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        toast.success(data.message || "已通过");
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
      const url = rejectModal.type === "hotel_add"
        ? `/api/merchant/applications/hotel-add/${rejectModal._id}/reject`
        : `/api/merchant/applications/${rejectModal._id}/reject`;
      const { data } = await axios.post(
        url,
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
    <div className="min-w-0">
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">预审核（执照审核）</h1>
      <div className="mb-4 flex gap-2 flex-wrap">
        <button
          type="button"
          onClick={() => setFilter("")}
          className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${!filter ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
        >
          全部
        </button>
        {Object.entries(STATUS_MAP).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`px-2.5 py-1.5 min-h-[36px] rounded text-sm ${filter === key ? "bg-blue-500 text-white" : "bg-gray-200 hover:bg-gray-300"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : applications.length === 0 && !loading ? (
        <p className="text-gray-500">暂无预审核记录</p>
      ) : (
        <>
        <div className="bg-white rounded-lg shadow overflow-x-auto -mx-1 px-1">
          <table className="min-w-[520px] w-full divide-y divide-gray-200">
            <thead className="bg-gray-50 sticky top-0 z-10">
              <tr>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase w-8" />
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">用户名</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">手机号</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase hidden md:table-cell">申请时间</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase">状态</th>
                <th className="px-2 sm:px-4 py-2 sm:py-3 text-right text-xs font-medium text-gray-500 uppercase">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {applications.map((app) => (
                <Fragment key={`${app.type || "merchant_apply"}_${app._id}`}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-2 sm:px-4 py-2 sm:py-3">
                      <button
                        type="button"
                        onClick={() => setExpandedId((id) => (id === `${app.type}_${app._id}` ? null : `${app.type}_${app._id}`))}
                        className="p-1.5 text-gray-500 hover:text-gray-700 min-h-[36px] min-w-[36px] flex items-center justify-center"
                        aria-label={expandedId === `${app.type}_${app._id}` ? "收起" : "展开"}
                      >
                        {expandedId === `${app.type}_${app._id}` ? "▼" : "▶"}
                      </button>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-900">{app.username}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-600">{app.phone}</td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm text-gray-600 hidden md:table-cell">
                      {app.createdAt ? new Date(app.createdAt).toLocaleString("zh-CN") : "—"}
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-sm">
                      <span className={app.status === "approved" ? "text-green-600" : app.status === "rejected" ? "text-red-600" : "text-amber-600"}>
                        {STATUS_MAP[app.status] || app.status}
                      </span>
                    </td>
                    <td className="px-2 sm:px-4 py-2 sm:py-3 text-right">
                      {app.status === "pending" ? (
                        <div className="flex flex-wrap gap-1.5 justify-end">
                          <button
                            type="button"
                            onClick={() => handleApprove(app)}
                            className="px-2.5 py-1.5 min-h-[36px] text-xs sm:text-sm bg-green-600 text-white rounded hover:bg-green-700"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            onClick={() => openRejectModal(app)}
                            className="px-2.5 py-1.5 min-h-[36px] text-xs sm:text-sm border border-red-600 text-red-600 rounded hover:bg-red-50"
                          >
                            驳回
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-sm">—</span>
                      )}
                    </td>
                  </tr>
                  {expandedId === `${app.type}_${app._id}` && (
                    <tr key={`${app.type}_${app._id}-detail`}>
                      <td colSpan={6} className="px-3 sm:px-4 py-3 sm:py-4 bg-gray-50">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-sm">
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
                          {app.starRatingCertificateUrl && (
                            <div className="col-span-2">
                              <span className="text-gray-500 block mb-1">星级评定证明：</span>
                              <a
                                href={app.starRatingCertificateUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline"
                              >
                                查看星级评定证明
                              </a>
                              <img
                                src={app.starRatingCertificateUrl}
                                alt="星级评定证明"
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
        {totalCount > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
        </>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-xl p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">驳回申请</h2>
            <p className="text-sm text-gray-600 mb-2">申请人：{rejectModal.username}（{rejectModal.phone}）</p>
            <p className="text-sm text-gray-600 mb-2">酒店：{rejectModal.hotelName || "—"}</p>
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
