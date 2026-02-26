import { useSearchParams } from 'react-router-dom'
import Title from "../../components/Title"
import { useEffect, useState, useRef } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import toast from "react-hot-toast"
import { useAppContext } from "../../context/AppContext"
import { useNavigate, useParams } from "react-router-dom"
import { IoAdd } from "react-icons/io5"
import { usePerf } from "../../context/PerfContext"
import { virtualListPerf } from "../../utils/virtualListPerf"
import { VirtualListPerformanceMonitor } from "../../components/VirtualListPerformanceMonitor"

function RoomCountStepper({ value, roomId, onUpdate, axios, getToken }) {
  const [count, setCount] = useState(value)
  const [updating, setUpdating] = useState(false)
  useEffect(() => { setCount(value) }, [value])
  async function saveCount(newVal) {
    const v = Math.max(1, Math.floor(Number(newVal) || 1))
    setCount(v)
    setUpdating(true)
    try {
      const token = await getToken()
      const { data } = await axios.patch(`/api/rooms/${roomId}/room-count`, { roomCount: v }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        toast.success("房间数量已更新")
        onUpdate?.()
      } else {
        toast.error(data.message || "更新失败")
        setCount(value)
      }
    } catch (err) {
      toast.error("更新房间数量失败")
      setCount(value)
    } finally {
      setUpdating(false)
    }
  }
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
      <button
        type="button"
        onClick={() => !updating && saveCount(count - 1)}
        disabled={updating || count <= 1}
        className="w-8 h-8 flex items-center justify-center border-r border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
      >
        −
      </button>
      <input
        type="number"
        min={1}
        value={count}
        onChange={(e) => setCount(e.target.value)}
        onBlur={(e) => {
          const v = e.target.value
          const n = Math.max(1, Math.floor(Number(v) || 1))
          setCount(n)
          if (n !== value) saveCount(n)
        }}
        onKeyDown={(e) => e.key === "Enter" && e.target.blur()}
        className="w-10 h-8 text-center text-sm font-medium text-gray-900 border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => !updating && saveCount(count + 1)}
        disabled={updating}
        className="w-8 h-8 flex items-center justify-center border-l border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        +
      </button>
    </div>
  )
}

function PromoDiscountStepper({ value, roomId, onUpdate, axios, getToken }) {
  const [discount, setDiscount] = useState(value ?? "")
  const [updating, setUpdating] = useState(false)
  useEffect(() => { setDiscount(value != null ? value : "") }, [value])
  async function saveDiscount(val) {
    const v = val === "" || val == null ? null : Math.min(100, Math.max(0, Math.floor(Number(val) || 0)))
    setDiscount(v ?? "")
    setUpdating(true)
    try {
      const token = await getToken()
      const { data } = await axios.patch(`/api/rooms/${roomId}/promo-discount`, { promoDiscount: v }, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) onUpdate?.()
      else setDiscount(value ?? "")
    } catch {
      setDiscount(value ?? "")
    } finally {
      setUpdating(false)
    }
  }
  return (
    <div className="inline-flex items-center border border-gray-300 rounded-lg overflow-hidden bg-white">
      <button type="button" onClick={() => !updating && saveDiscount(discount === "" ? 0 : Math.max(0, (Number(discount) || 0) - 1))} disabled={updating} className="w-7 h-7 flex items-center justify-center border-r border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">−</button>
      <input type="number" min={0} max={100} placeholder="—" value={discount} onChange={(e) => setDiscount(e.target.value === "" ? "" : e.target.value)} onBlur={(e) => { const v = e.target.value; if (v === "") { saveDiscount(null); return } const n = Math.min(100, Math.max(0, Math.floor(Number(v) || 0))); setDiscount(n); if (n !== (value ?? -1)) saveDiscount(n) }} className="w-9 h-7 text-center text-sm text-gray-900 border-none outline-none bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none" />
      <span className="pr-1 text-gray-500 text-xs">%</span>
      <button type="button" onClick={() => !updating && saveDiscount(Math.min(100, (Number(discount) || 0) + 1))} disabled={updating} className="w-7 h-7 flex items-center justify-center border-l border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-50">+</button>
    </div>
  )
}

function ListRoom() {
  const { isPerfMode: perfMode, isLegacyList: isLegacyMode, toggleLegacyList } = usePerf();

  const [rooms, setRooms] = useState([]);
  const [hotel, setHotel] = useState(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  const listRenderStartRef = useRef(null);

  const { axios, getToken, user } = useAppContext();
  const navigate = useNavigate();
  const { hotelId } = useParams();
  const hasPreReview = hotel && (hotel.applicantName || hotel.licenseUrl);
  const roomTypeToCn = {
    'Single Bed': '单人间',
    'Double Bed': '双人间',
    'King Bed': '大床房',
    'Luxury Room': '豪华房',
    'Family Suite': '家庭套房',
    'Standard Room': '标准间',
    'Business Room': '商务房',
    'Sea View Room': '海景房',
    'Suite': '套房',
  };

  const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;

  async function fetchRooms() {
    try {
      const token = await getToken()
      const params = new URLSearchParams({ page: String(page), limit: String(pageSize) })
      if (hotelId) params.set("hotelId", hotelId)
      const { data } = await axios.get(`/api/rooms/owner?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        if (perfMode) listRenderStartRef.current = performance.now();
        setRooms(data.rooms || [])
        setTotalCount(data.totalCount ?? 0)
      } else {
        toast.error(data.message || "获取房间列表失败")
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast.error("获取房间列表失败，请稍后重试")
    }
  }

  async function fetchHotel() {
    if (!hotelId) return;
    try {
      const token = await getToken();
      const { data } = await axios.get(`/api/hotels/owner/${hotelId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) setHotel(data.hotel);
      else setHotel(null);
    } catch {
      setHotel(null);
    }
  }

  async function toggleRoomAvailability(roomId) {
    try {
      const token = await getToken();
      const { data } = await axios.post('/api/rooms/toogle-avalibility', { roomId }, { headers: { Authorization: `Bearer ${token}` } });
      if (data.success) {
        toast.success(data.needsApproval ? "上架申请已提交，等待管理员审核" : (data.room?.isAvailable ? "已上架" : "已下架"));
        fetchRooms();
      } else {
        toast.error(data.message || "操作失败");
      }
    } catch (error) {
      console.error("Error toggling room availability:", error);
      toast.error("更新房间售卖状态失败，请稍后重试");
    }
  }

  function openDeleteConfirm(room) {
    setRoomToDelete(room);
  }

  async function confirmDelete() {
    if (!roomToDelete) return;
    setDeleting(true);
    try {
      const token = await getToken();
      const { data } = await axios.delete(`/api/rooms/${roomToDelete._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success("房间已删除");
        setRoomToDelete(null);
        fetchRooms();
      } else {
        toast.error(data.message || "删除失败");
      }
    } catch (error) {
      console.error("Error deleting room:", error);
      toast.error("删除房间失败，请稍后重试");
    } finally {
      setDeleting(false);
    }
  }



  useEffect(() => {
    setPage(1);
  }, [hotelId]);

  useEffect(() => {
    if (user) {
      fetchRooms();
      if (hotelId) fetchHotel();
    }
  }, [user, hotelId, page, pageSize])

  const goToAddRoom = () => {
    const target = hotelId ? `/owner/hotels/${hotelId}/add-room` : "/owner/add-room"
    navigate(target)
  }

  const goBackToHotels = () => {
    navigate("/owner/hotel-info")
  }

  useEffect(() => {
    if (!perfMode || rooms.length === 0) return;
    const start = listRenderStartRef.current;
    if (!start) return;
    const measure = () => {
      requestAnimationFrame(() => {
        const rows = virtualListPerf.countRenderedRows('[data-room-list-tbody]');
        virtualListPerf.isVirtual = !isLegacyMode;
        virtualListPerf.recordFirstRender(rooms.length, rows, start);
      });
    };
    measure();
  }, [rooms, perfMode, isLegacyMode]);

  useEffect(() => {
    if (perfMode) virtualListPerf.reset();
  }, [perfMode, isLegacyMode]);

  const ROW_HEIGHT = 88
  const parentRef = useRef(null)
  const virtualizer = useVirtualizer({
    count: rooms.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: 5,
    getItemKey: (index) => rooms[index]?._id ?? index,
  })

  const renderRow = (room, extraProps = {}) => (
    <tr
      key={room._id}
      className='border-b border-gray-200 hover:bg-gray-50'
      {...extraProps}
    >
      <td className="p-2 sm:p-4">
        {room.images && room.images[0] && (
          <img src={room.images[0]} alt={room.roomType} className="w-12 h-10 sm:w-16 sm:h-12 object-cover rounded" />
        )}
      </td>
      <td className="p-2 sm:p-4 font-medium text-gray-800 text-xs sm:text-sm w-24 sm:w-32">{getRoomTypeLabel(room.roomType)}</td>
      <td className="p-2 sm:p-4 text-gray-600 text-xs sm:text-sm">{room.pricePerNight} 元/晚</td>
      <td className="p-2 sm:p-4 text-gray-600 text-xs sm:text-sm min-w-[4rem]">
        <PromoDiscountStepper value={room.promoDiscount ?? null} roomId={room._id} onUpdate={() => fetchRooms()} axios={axios} getToken={getToken} />
      </td>
      <td className="p-2 sm:p-4">
        <RoomCountStepper value={room.roomCount ?? 1} roomId={room._id} onUpdate={() => fetchRooms()} axios={axios} getToken={getToken} />
      </td>
      <td className="p-2 sm:p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <label className="inline-flex items-center cursor-pointer shrink-0">
            <input type="checkbox" onChange={() => toggleRoomAvailability(room._id)} className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out" checked={room.isAvailable} />
            <span className="ml-2 text-gray-700 text-xs sm:text-sm">{room.isAvailable ? '在售' : '已下架'}</span>
          </label>
          <div className="flex items-center gap-1.5 shrink-0">
            <button type="button" onClick={() => navigate(`/owner/edit-room/${room._id}`, { state: { hotelId: room.hotel?._id || room.hotel } })} className="px-2.5 py-1.5 text-xs sm:text-sm bg-blue-500 text-white rounded hover:bg-blue-600 transition">编辑</button>
            <button type="button" onClick={() => openDeleteConfirm(room)} className="px-2.5 py-1.5 text-xs sm:text-sm bg-red-500 text-white rounded hover:bg-red-600 transition">删除</button>
          </div>
        </div>
      </td>
    </tr>
  );

  return (
    <div>
      {perfMode && <VirtualListPerformanceMonitor />}
      {/* 预审单信息（不可修改） - 仅预审通过的酒店展示 */}
      {hotelId && hasPreReview && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <span>预审单信息</span>
            <span className="text-xs font-normal text-amber-600">（不可修改）</span>
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            {hotel.applicantName && (
              <div>
                <span className="text-gray-500">申请人姓名</span>
                <p className="font-medium text-gray-800">{hotel.applicantName}</p>
              </div>
            )}
            {hotel.applicantPhone && (
              <div>
                <span className="text-gray-500">申请人手机号</span>
                <p className="font-medium text-gray-800">{hotel.applicantPhone}</p>
              </div>
            )}
            {hotel.name && (
              <div>
                <span className="text-gray-500">酒店名称</span>
                <p className="font-medium text-gray-800">{hotel.name}</p>
              </div>
            )}
            {hotel.city && (
              <div>
                <span className="text-gray-500">酒店所在城市</span>
                <p className="font-medium text-gray-800">{hotel.city}</p>
              </div>
            )}
            {hotel.address && (
              <div className="sm:col-span-2">
                <span className="text-gray-500">酒店地址</span>
                <p className="font-medium text-gray-800">{hotel.address}</p>
              </div>
            )}
            {hotel.contact && (
              <div>
                <span className="text-gray-500">酒店联系电话</span>
                <p className="font-medium text-gray-800">{hotel.contact}</p>
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-4">
            {hotel.licenseUrl && (
              <div>
                <span className="block text-gray-500 text-xs mb-1">营业执照</span>
                <a href={hotel.licenseUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                  <img src={hotel.licenseUrl} alt="营业执照" className="h-20 w-auto rounded border border-gray-200 object-cover" />
                </a>
              </div>
            )}
            {hotel.starRatingCertificateUrl && (
              <div>
                <span className="block text-gray-500 text-xs mb-1">星级评定证明</span>
                <a href={hotel.starRatingCertificateUrl} target="_blank" rel="noopener noreferrer" className="inline-block">
                  <img src={hotel.starRatingCertificateUrl} alt="星级评定证明" className="h-20 w-auto rounded border border-gray-200 object-cover" />
                </a>
              </div>
            )}
            {hotel.images && hotel.images.length > 0 && (
              <div className="w-full">
                <span className="block text-gray-500 text-xs mb-2">酒店照片</span>
                <div className="flex flex-wrap gap-2">
                  {hotel.images.map((img, i) => (
                    <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="inline-block">
                      <img src={img} alt="" className="h-20 w-24 object-cover rounded border border-gray-200" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <Title
            align="left"
            font="outfit"
            title="房间列表"
            subtitle={hotelId ? "管理该酒店下的所有房间" : "管理您名下酒店的所有房间"}
          />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={goBackToHotels}
            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
          >
            返回酒店列表
          </button>
          <button
            type="button"
            onClick={goToAddRoom}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 text-sm font-medium"
          >
            <IoAdd size={18} />
            新增
          </button>
        </div>
      </div>
      <div
        ref={parentRef}
        data-room-list-scroll
        className='w-full overflow-x-auto -mx-1 px-1 border border-gray-300 rounded-lg max-h-[36rem] sm:max-h-[42rem] overflow-y-auto overflow-x-auto'
      >
        <div style={isLegacyMode ? {} : { height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          <table className='w-full min-w-[480px] text-left'>
            <thead className='bg-gray-100 sticky top-0 z-10'>
              <tr>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>图片</th>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm w-24 sm:w-32'>房型</th>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>预定价格/晚</th>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm min-w-[4rem] whitespace-nowrap'>优惠</th>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>数量</th>
                <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>状态</th>
              </tr>
            </thead>
            <tbody className="text-sm" data-room-list-tbody>
              {isLegacyMode
                ? rooms.map((room) => renderRow(room))
                : virtualizer.getVirtualItems().map((virtualRow, index) => {
                    const room = rooms[virtualRow.index];
                    if (!room) return null;
                    return renderRow(room, {
                      style: {
                        height: `${virtualRow.size}px`,
                        transform: `translateY(${virtualRow.start - index * virtualRow.size}px)`,
                      },
                    });
                  })}
            </tbody>
          </table>
        </div>
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

      {/* 删除确认弹窗 */}
      {roomToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50" onClick={() => !deleting && setRoomToDelete(null)}>
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-sm w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <p className="text-gray-800 font-medium mb-1">确认删除</p>
            <p className="text-gray-600 text-sm mb-6">
              确定要删除房间「{roomToDelete.roomType}」吗？删除后不可恢复。
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
  )
}

export default ListRoom