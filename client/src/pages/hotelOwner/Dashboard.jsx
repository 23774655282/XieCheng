import React, { useEffect, useState } from 'react'
import Title from '../../components/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';

function Dashboard() {

  const {axios, getToken, user, currency} = useAppContext();

  const [dashboardData, setDashboardData] = useState({
    bookings: [],
    totalBookings: 0,
    totalRevenue: 0
  })


  async function fetchDashboardData() {
    try {
      const token = await getToken();
      const {data} = await axios.get("/api/bookings/hotel", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      })

      if (data.success) {
        setDashboardData(data.dashboardData)
        toast.success("仪表盘数据获取成功");
      } else {
        toast.error(data.message || "获取仪表盘数据失败");
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast.error("获取仪表盘数据失败，请稍后重试");
    }
  }

  useEffect(()=>{
    if (user) {
      fetchDashboardData();
    }
  }, [user])

  return (
    <div>
        <Title
          align="left"
          font="outfit"
          title="商家仪表盘"
          subtitle="查看酒店统计数据、管理订单与房间信息"
        />
        <div className='flex gap-4 my-8'>
          <div className='bg-primary/3 border border-primary/10 rounded flex p-4 pr-8 '>
            <img src={assets.totalBookingIcon} alt="" className='max-sm:hidden h-10 ' />
            <div className='flex flex-col sm:ml-4 font-medium'>
              <p className='text-blue-500 text-lg'>
                总预订数量
              </p>
              <p className='text-neutral-400 text-base'>
                {
                  dashboardData.totalBookings
                }
              </p>
            </div>
          </div>
          <div className='bg-primary/3 border border-primary/10 rounded flex p-4 pr-8 '>
            <img src={assets.totalRevenueIcon} alt="" className='max-sm:hidden h-10 ' />
            <div className='flex flex-col sm:ml-4 font-medium'>
              <p className='text-blue-500 text-lg'>
                总收入
              </p>
              <p className='text-neutral-400 text-base'>
                {
                  dashboardData.totalRevenue
                }
              </p>
            </div>
          </div>
        </div>

        <h2 className='text-2xl font-semibold text-neutral-800 mb-4'>
            最近预订
        </h2>

        <div className='w-full max-w-3xl text-left border border-gray-300 rounded-lg max-h-80 overflow-y-scroll'>
          <table className='w-full '>
            <thead className='bg-gray-100'>
                <tr>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    用户名
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    房型
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    总金额
                  </th>
                  <th className='p-4 text-left text-gray-600 font-medium'>
                    支付状态
                  </th>
                </tr>
            </thead>
            <tbody className='text-sm'>
              {
                dashboardData.bookings.map((item,idx)=>(
                  <tr key={idx}>
                    <td className='p-4 border-b border-gray-200'>
                      {
                        item.user.username
                      }
                    </td>
                    <td className='p-4 border-b border-gray-200'>
                      {
                        item.room.roomType
                      }
                    </td>
                    <td className='p-4 border-b border-gray-200'>
                      {
                        item.totalPrice
                      }
                    </td>
                    <td className='p-4 border-b border-gray-200'>
                      <button className={`px-3 py-1 rounded text-sm font-medium 
                      ${item.isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {
                          item.isPaid ? '已完成' : '待支付'
                        }
                      </button>
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

export default Dashboard