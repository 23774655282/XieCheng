import Title from "../../components/Title"
import  {  useEffect, useState } from 'react'
import toast from "react-hot-toast"
import { useAppContext } from "../../context/AppContext"
import { useNavigate } from "react-router-dom"

function ListRoom() {
  const [rooms, setRooms] = useState([]);
  const [hotelStatus, setHotelStatus] = useState(null);
  const [roomToDelete, setRoomToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const { axios, getToken, user } = useAppContext();
  const navigate = useNavigate();
  const canEditRooms = hotelStatus === "offline";

  const amenityLabelMap = {
    'Free Wifi': '免费 Wi-Fi',
    'Free Breakfast': '免费早餐',
    'Room Service': '客房服务',
    'Mountain View': '山景',
    'Pool Access': '泳池使用',
  };

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
      const { data } = await axios.get("/api/rooms/owner", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success) {
        setRooms(data.rooms || [])
        toast.success("房间列表获取成功")
      } else {
        toast.error(data.message || "获取房间列表失败")
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast.error("获取房间列表失败，请稍后重试")
    }
  }

  async function fetchHotelStatus() {
    try {
      const token = await getToken()
      const { data } = await axios.get("/api/hotels/my", {
        headers: { Authorization: `Bearer ${token}` }
      })
      if (data.success && data.hotel) setHotelStatus(data.hotel.status || null)
    } catch {
      setHotelStatus(null)
    }
  }

async function toggleRoomAvailability(roomId) {
  try {
    const token = await getToken(); 
    const { data } = await axios.post('/api/rooms/toogle-avalibility', {
      roomId
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    if (data.success) {
      toast.success("房间售卖状态已更新");
      fetchRooms();
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
    if (user) {
      fetchRooms()
      fetchHotelStatus()
    }
  }, [user])

  return (
    <div>
      <Title
        align="left"
        font="outfit"
        title="房间列表"
        subtitle="管理您名下酒店的所有房间"
      />
      {hotelStatus && hotelStatus !== "offline" && (
        <p className="text-amber-600 text-sm mb-2">仅当酒店被管理员下线后，才可编辑房间信息。</p>
      )}
      <div className='w-full max-w-4xl text-left border border-gray-300 rounded-lg max-h-[42rem] overflow-y-scroll'>
        <table className='w-full '>
              <thead className='bg-gray-100'>
                <tr>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    图片
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    房型
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    设施
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    价格/每晚
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    优惠
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    操作
                  </th>
                </tr>
            </thead>
            <tbody className="text-sm">
              {
                rooms.map((room,idx)=>(
                  <tr key={idx} className='border-b border-gray-200 hover:bg-gray-50'>
                    <td className="p-4">
                      {room.images && room.images[0] && (
                        <img
                          src={room.images[0]}
                          alt={room.roomType}
                          className="w-16 h-12 object-cover rounded"
                        />
                      )}
                    </td>
                    <td className="p-4 font-medium text-gray-800">
                      {getRoomTypeLabel(room.roomType)}
                    </td>
                    <td className="p-4 text-gray-600">
                      {room.amenties.map((a, i) =>
                        (amenityLabelMap[a] || a) + (i < room.amenties.length - 1 ? '，' : '')
                      )}
                    </td>
                    <td className="p-4 text-gray-600">
                      {room.pricePerNight} 元/晚
                    </td>
                    <td className="p-4 text-gray-600">
                      {room.promoDiscount != null && room.promoDiscount > 0 ? (
                        <span>
                          <span className="font-medium text-green-600">{room.promoDiscount}%</span>
                          <span className="text-gray-500 text-xs block mt-0.5">
                            优惠后 {Math.round((room.pricePerNight || 0) * (1 - (room.promoDiscount || 0) / 100))} 元/晚
                          </span>
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="p-4 text-gray-600">
                      <div className="flex items-center gap-3 flex-wrap">
                        <label className="inline-flex items-center cursor-pointer">
                          <input type="checkbox" 
                            onChange={() => toggleRoomAvailability(room._id)}
                            className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                            checked={room.isAvailable}
                          />
                          <span className="ml-2 text-gray-700">
                            {room.isAvailable ? '在售' : '已下架'}
                          </span>
                        </label>
                        <button
                          type="button"
                          onClick={() => canEditRooms && navigate(`/owner/edit-room/${room._id}`)}
                          disabled={!canEditRooms}
                          title={!canEditRooms ? "仅当酒店被管理员下线后可编辑房间" : "编辑"}
                          className="px-3 py-1.5 text-sm text-blue-600 border border-blue-300 rounded hover:bg-blue-50 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          编辑
                        </button>
                        <button
                          type="button"
                          onClick={() => openDeleteConfirm(room)}
                          className="px-3 py-1.5 text-sm text-red-600 border border-red-300 rounded hover:bg-red-50 transition"
                        >
                          删除
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
      </div>

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