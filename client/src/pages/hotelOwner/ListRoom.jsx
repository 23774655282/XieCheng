import Title from "../../components/Title"
import  {  useEffect, useState } from 'react'
import toast from "react-hot-toast"
import { useAppContext } from "../../context/AppContext"
function ListRoom() {
  const [rooms, setRooms] = useState([])

  const {axios,getToken,user} = useAppContext();

  const amenityLabelMap = {
    'Free Wifi': '免费 Wi-Fi',
    'Free Breakfast': '免费早餐',
    'Room Service': '客房服务',
    'Mountain View': '山景',
    'Pool Access': '泳池使用',
  };

  async function fetchRooms() {
    try {
      const token = await getToken()
      const {data} = await axios.get("/api/rooms/owner",{
        headers:{
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        setRooms(data.rooms)
        console.log(data.rooms)
        toast.success("房间列表获取成功")
      }else{
        toast.error(data.message || "获取房间列表失败")
      }
    } catch (error) {
      console.error("Error fetching rooms:", error)
      toast.error("获取房间列表失败，请稍后重试")
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



  useEffect(()=>{
    if (user) {
      fetchRooms()
    }
  },[user])

  return (
    <div>
      <Title
        align="left"
        font="outfit"
        title="房间列表"
        subtitle="管理您名下酒店的所有房间"
      />
      <div className='w-full max-w-4xl text-left border border-gray-300 rounded-lg max-h-80 overflow-y-scroll'>
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
                    价格 /每晚
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
                      {room.roomType}
                    </td>
                    <td className="p-4 text-gray-600">
                      {room.amenties.map((a, i) =>
                        (amenityLabelMap[a] || a) + (i < room.amenties.length - 1 ? '，' : '')
                      )}
                    </td>
                    <td className="p-4 text-gray-600">
                      {
                        room.pricePerNight
                      }
                    </td>
                    <td className="p-4 text-gray-600">
                      <label  className="inline-flex items-center cursor-pointer">
                        <input type="checkbox" 
                          onChange={() => toggleRoomAvailability(room._id)}
                          className="form-checkbox h-5 w-5 text-blue-600 transition duration-150 ease-in-out"
                          checked={room.isAvailable}
                        />
                        <div className="ml-2 text-gray-700">
                          {room.isAvailable ? '在售' : '已下架'}
                        </div>
                      </label>
                    </td>
                  </tr>
                ))
              }
            </tbody>
          </table>
      </div>
    </div>
  )
}

export default ListRoom