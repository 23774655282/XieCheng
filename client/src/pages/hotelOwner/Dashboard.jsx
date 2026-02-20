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


  async function handleCancel(bookingId) {
    if (!window.confirm('确定要取消该订单吗？')) return;
    try {
      const token = await getToken();
      const { data } = await axios.patch(`/api/bookings/${bookingId}/cancel`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (data.success) {
        toast.success('订单已取消');
        fetchDashboardData();
      } else {
        toast.error(data.message || '取消失败');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || '取消失败');
    }
  }

  async function handleReviewRefund(bookingId, action) {
    try {
      const token = await getToken();
      const { data } = await axios.patch(
        `/api/bookings/${bookingId}/review-refund`,
        { action },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || (action === 'approve' ? '已同意退款' : '已拒绝退款'));
        fetchDashboardData();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || '操作失败');
    }
  }

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
    <div className="min-w-0">
        <Title
          align="left"
          font="outfit"
          title="商家仪表盘"
          subtitle="查看酒店统计数据、管理订单与房间信息"
        />
        <div className='flex flex-col sm:flex-row gap-3 sm:gap-4 my-6 sm:my-8'>
          <div className='bg-primary/3 border border-primary/10 rounded-xl flex items-center gap-3 p-4 flex-1 min-w-0'>
            <img src={assets.totalBookingIcon} alt="" className='hidden sm:block h-10 shrink-0' />
            <div className='font-medium min-w-0'>
              <p className='text-blue-500 text-base sm:text-lg'>总预订数量</p>
              <p className='text-neutral-700 text-lg sm:text-xl font-semibold'>{dashboardData.totalBookings}</p>
            </div>
          </div>
          <div className='bg-primary/3 border border-primary/10 rounded-xl flex items-center gap-3 p-4 flex-1 min-w-0'>
            <img src={assets.totalRevenueIcon} alt="" className='hidden sm:block h-10 shrink-0' />
            <div className='font-medium min-w-0'>
              <p className='text-blue-500 text-base sm:text-lg'>总收入</p>
              <p className='text-neutral-700 text-lg sm:text-xl font-semibold'>{dashboardData.totalRevenue} {currency}</p>
            </div>
          </div>
        </div>

        <h2 className='text-xl sm:text-2xl font-semibold text-neutral-800 mb-3 sm:mb-4'>
            最近预订
        </h2>

        <div className='w-full overflow-x-auto -mx-1 px-1 border border-gray-300 rounded-lg max-h-[36rem] sm:max-h-[42rem] overflow-y-auto'>
          <table className='w-full min-w-[640px] text-left'>
            <thead className='bg-gray-100 sticky top-0 z-10'>
                <tr>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>用户名</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>房型</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>总金额</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>支付</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>状态</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>操作</th>
                </tr>
            </thead>
            <tbody className='text-sm'>
              {(dashboardData.bookings || []).filter((item) => item != null).map((item, idx) => (
                  <tr key={item._id || idx} className='border-b border-gray-200 hover:bg-gray-50'>
                    <td className='p-2 sm:p-4 text-gray-800'>{item.user?.username ?? '-'}</td>
                    <td className='p-2 sm:p-4 text-gray-600'>{item.room?.roomType ?? '-'}</td>
                    <td className='p-2 sm:p-4 text-gray-800'>{item.totalPrice} 元</td>
                    <td className='p-2 sm:p-4'>
                      <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium inline-block whitespace-nowrap
                      ${item.isCompleted ? 'bg-emerald-100 text-emerald-700' : item.isPaid ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'}`}>
                        {item.isCompleted ? '已完成' : item.isPaid ? '已支付' : '待支付'}
                      </span>
                    </td>
                    <td className='p-2 sm:p-4 text-gray-600 text-xs sm:text-sm max-w-[100px] sm:max-w-none truncate sm:truncate-none' title={item.refundReason || ''}>
                      {item.status === 'cancelled' ? (
                        item.refundStatus === 'approved' ? '已退款' : item.cancelledBy === 'merchant' ? '已取消' : '已取消'
                      ) : item.refundStatus === 'pending' ? '退款待审' : '有效'}
                    </td>
                    <td className='p-2 sm:p-4'>
                      {item.refundStatus === 'pending' && (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.confirm('确定同意该退款申请？') && handleReviewRefund(item._id, 'approve')}
                            className="px-2 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 min-h-[36px]"
                          >
                            通过
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewRefund(item._id, 'reject')}
                            className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 min-h-[36px]"
                          >
                            拒绝
                          </button>
                        </div>
                      )}
                      {item.status !== 'cancelled' && !item.isCompleted && (
                        <button
                          type="button"
                          onClick={() => handleCancel(item._id)}
                          className="px-2 py-1.5 rounded text-xs font-medium bg-black text-white hover:bg-gray-700 min-h-[36px]"
                        >
                          取消
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
    </div>
  )
}

export default Dashboard