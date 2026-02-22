import { useEffect, useState } from "react";
import { useAppContext } from "../../context/AppContext";

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'King Bed': '大床房', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房', 'Standard Room': '标准间', 'Business Room': '商务房', 'Sea View Room': '海景房', 'Suite': '套房' };

function RoomEditApplications() {
  const { axios, getToken } = useAppContext();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  async function fetchList() {
    setLoading(true);
    try {
      const token = await getToken();
      const { data } = await axios.get("/api/rooms/admin/room-edits", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setApplications(data.applications || []);
    } catch {
      setApplications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchList(); }, []);

  async function handleApprove(id) {
    try {
      const token = await getToken();
      const { data } = await axios.post(`/api/rooms/admin/room-edits/${id}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        fetchList();
      }
    } catch {}
  }

  async function handleRejectSubmit() {
    if (!rejectModal) return;
    setRejecting(true);
    try {
      const token = await getToken();
      const { data } = await axios.post(`/api/rooms/admin/room-edits/${rejectModal._id}/reject`, { reason: rejectReason.trim() || "未填写原因" }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        setRejectModal(null);
        setRejectReason("");
        fetchList();
      }
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="min-w-0">
      <h1 className="text-lg sm:text-xl font-bold text-gray-900 mb-4 sm:mb-6">房间修改审核</h1>
      {loading ? (
        <p className="text-gray-500">加载中...</p>
      ) : applications.length === 0 ? (
        <p className="text-gray-500">暂无待审核的房间修改申请</p>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <div key={app._id} className="bg-white rounded-lg shadow p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="font-medium text-gray-800">{app.hotel?.name || "—"}</p>
                <p className="text-sm text-gray-600">房型：{roomTypeToCn[app.roomType] || app.roomType || (app.room?.roomType && (roomTypeToCn[app.room.roomType] || app.room.roomType)) || "—"}</p>
                {(app.pricePerNight != null || app.promoDiscount != null || app.roomCount != null) && (
                  <p className="text-xs text-gray-500 mt-1">
                    {app.pricePerNight != null && `价格 ${app.pricePerNight} 元/晚`}
                    {app.promoDiscount != null && ` · 优惠 ${app.promoDiscount}%`}
                    {app.roomCount != null && ` · 数量 ${app.roomCount}`}
                  </p>
                )}
              </div>
              <div className="flex gap-2 shrink-0">
                <button type="button" onClick={() => handleApprove(app._id)} className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm">通过</button>
                <button type="button" onClick={() => setRejectModal(app)} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 text-sm">驳回</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {rejectModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => !rejecting && setRejectModal(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-800 font-medium mb-2">驳回原因</p>
            <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="选填" className="w-full border rounded px-3 py-2 mb-4" />
            <div className="flex justify-end gap-2">
              <button type="button" disabled={rejecting} onClick={() => setRejectModal(null)} className="px-4 py-2 text-gray-700 border rounded hover:bg-gray-50">取消</button>
              <button type="button" disabled={rejecting} onClick={handleRejectSubmit} className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">确定驳回</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default RoomEditApplications;
