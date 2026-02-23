import React, { useEffect, useState, useMemo, useRef } from 'react'
import Title from '../../components/Title'
import { assets } from '../../assets/assets'
import { useAppContext } from '../../context/AppContext';
import toast from 'react-hot-toast';
import DatePicker from 'react-datepicker';
import { zhCN } from 'date-fns/locale/zh-CN';
import 'react-datepicker/dist/react-datepicker.css';

function formatDateStr(d) {
  if (!d) return '—';
  const date = new Date(d);
  if (isNaN(date.getTime())) return '—';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function Dashboard() {

  const {axios, getToken, user, currency} = useAppContext();

  const [dashboardData, setDashboardData] = useState({
    bookings: [],
    totalBookings: 0,
    totalRevenue: 0
  })
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filterHotel, setFilterHotel] = useState('');
  const [filterCheckIn, setFilterCheckIn] = useState('');
  const [filterCheckOut, setFilterCheckOut] = useState('');
  const [hotelDropdownOpen, setHotelDropdownOpen] = useState(false);
  const [checkInDropdownOpen, setCheckInDropdownOpen] = useState(false);
  const [checkOutDropdownOpen, setCheckOutDropdownOpen] = useState(false);
  const hotelDropdownRef = useRef(null);
  const checkInDropdownRef = useRef(null);
  const checkOutDropdownRef = useRef(null);


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

  async function handlePlatformIntervention(bookingId) {
    if (!window.confirm('确定交由平台处理该退款申请？')) return;
    try {
      const token = await getToken();
      const { data } = await axios.post(
        `/api/bookings/${bookingId}/merchant-request-platform-intervention`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success(data.message || '已提交平台介入');
        fetchDashboardData();
      } else {
        toast.error(data.message || '操作失败');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || '操作失败');
    }
  }

  async function handleUpdateStayStatus(bookingId, stayStatus) {
    try {
      const token = await getToken();
      const { data } = await axios.patch(
        `/api/bookings/${bookingId}/stay-status`,
        { stayStatus },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (data.success) {
        toast.success('入住状态已更新');
        fetchDashboardData();
      } else {
        toast.error(data.message || '更新失败');
      }
    } catch (e) {
      toast.error(e.response?.data?.message || '更新失败');
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

  useEffect(() => {
    function handleClickOutside(e) {
      if (hotelDropdownRef.current && !hotelDropdownRef.current.contains(e.target)) setHotelDropdownOpen(false);
      if (checkInDropdownRef.current && !checkInDropdownRef.current.contains(e.target)) setCheckInDropdownOpen(false);
      if (checkOutDropdownRef.current && !checkOutDropdownRef.current.contains(e.target)) setCheckOutDropdownOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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

  const hotelNames = useMemo(() => {
    const bookings = (dashboardData.bookings || []).filter((item) => item != null);
    const names = [...new Set(bookings.map((b) => b.hotel?.name).filter(Boolean))].sort();
    return names;
  }, [dashboardData.bookings]);

  const filteredBookings = useMemo(() => {
    let list = (dashboardData.bookings || []).filter((item) => item != null);
    if (filterHotel.trim()) {
      list = list.filter((b) => (b.hotel?.name || '') === filterHotel.trim());
    }
    if (filterCheckIn) {
      list = list.filter((b) => formatDateStr(b.checkInDate) >= filterCheckIn);
    }
    if (filterCheckOut) {
      list = list.filter((b) => formatDateStr(b.checkOutDate) <= filterCheckOut);
    }
    return list;
  }, [dashboardData.bookings, filterHotel, filterCheckIn, filterCheckOut]);

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
          <table className='w-full min-w-[720px] text-left'>
            <thead className='bg-gray-100 sticky top-0 z-10'>
                <tr>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>用户名</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm relative' ref={hotelDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setHotelDropdownOpen((o) => !o); setCheckInDropdownOpen(false); setCheckOutDropdownOpen(false); }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      酒店名称
                      <svg className={`w-4 h-4 transition-transform ${hotelDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {hotelDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 py-2 rounded-lg bg-white border border-gray-200 shadow-lg z-20 min-w-[160px] max-h-48 overflow-y-auto">
                        <button
                          type="button"
                          onClick={() => { setFilterHotel(''); setHotelDropdownOpen(false); }}
                          className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${!filterHotel ? 'bg-gray-50 font-medium' : ''}`}
                        >
                          全部
                        </button>
                        {hotelNames.map((name) => (
                          <button
                            key={name}
                            type="button"
                            onClick={() => { setFilterHotel(name); setHotelDropdownOpen(false); }}
                            className={`block w-full text-left px-4 py-2 text-sm hover:bg-gray-50 truncate ${filterHotel === name ? 'bg-gray-50 font-medium' : ''}`}
                          >
                            {name}
                          </button>
                        ))}
                      </div>
                    )}
                  </th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>房型</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm relative' ref={checkInDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setCheckInDropdownOpen((o) => !o); setHotelDropdownOpen(false); setCheckOutDropdownOpen(false); }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      入住日期
                      <svg className={`w-4 h-4 transition-transform ${checkInDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {checkInDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg p-2" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                        <DatePicker
                          selected={filterCheckIn ? new Date(filterCheckIn + 'T12:00:00') : null}
                          onChange={(d) => { setFilterCheckIn(d ? formatDateStr(d) : ''); setCheckInDropdownOpen(false); }}
                          locale={zhCN}
                          inline
                          dateFormat="yyyy-MM-dd"
                        />
                        <button type="button" onClick={() => { setFilterCheckIn(''); setCheckInDropdownOpen(false); }} className="w-full py-1 text-xs text-gray-500 hover:text-gray-700">清除筛选</button>
                      </div>
                    )}
                  </th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm relative' ref={checkOutDropdownRef}>
                    <button
                      type="button"
                      onClick={() => { setCheckOutDropdownOpen((o) => !o); setHotelDropdownOpen(false); setCheckInDropdownOpen(false); }}
                      className="flex items-center gap-1 hover:text-gray-900"
                    >
                      退房日期
                      <svg className={`w-4 h-4 transition-transform ${checkOutDropdownOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {checkOutDropdownOpen && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-white rounded-lg p-2" style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}>
                        <DatePicker
                          selected={filterCheckOut ? new Date(filterCheckOut + 'T12:00:00') : null}
                          onChange={(d) => { setFilterCheckOut(d ? formatDateStr(d) : ''); setCheckOutDropdownOpen(false); }}
                          locale={zhCN}
                          inline
                          dateFormat="yyyy-MM-dd"
                        />
                        <button type="button" onClick={() => { setFilterCheckOut(''); setCheckOutDropdownOpen(false); }} className="w-full py-1 text-xs text-gray-500 hover:text-gray-700">清除筛选</button>
                      </div>
                    )}
                  </th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>支付</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>状态</th>
                  <th className='p-2 sm:p-4 text-left text-gray-600 font-medium text-xs sm:text-sm'>操作</th>
                </tr>
            </thead>
            <tbody className='text-sm'>
              {filteredBookings.map((item, idx) => (
                  <tr
                    key={item._id || idx}
                    className='border-b border-gray-200 hover:bg-gray-50 cursor-pointer'
                    onClick={() => setSelectedBooking(item)}
                  >
                    <td className='p-2 sm:p-4 text-gray-800'>{item.user?.username ?? '-'}</td>
                    <td className='p-2 sm:p-4 text-gray-600'>{item.hotel?.name ?? '-'}</td>
                    <td className='p-2 sm:p-4 text-gray-600'>{item.room?.roomType ? getRoomTypeLabel(item.room.roomType) : '-'}</td>
                    <td className='p-2 sm:p-4 text-gray-600 whitespace-nowrap'>{formatDateStr(item.checkInDate)}</td>
                    <td className='p-2 sm:p-4 text-gray-600 whitespace-nowrap'>{formatDateStr(item.checkOutDate)}</td>
                    <td className='p-2 sm:p-4' onClick={(e) => e.stopPropagation()}>
                      {(() => {
                        const payLabel = item.refundStatus === 'approved' ? '已退款'
                          : item.refundStatus === 'pending' ? '退款中'
                          : item.status === 'cancelled' ? '已取消'
                          : item.isCompleted ? '已完成'
                          : item.isPaid ? '已支付' : '待支付';
                        const payClass = payLabel === '已退款' ? 'bg-slate-100 text-slate-600'
                          : payLabel === '退款中' ? 'bg-amber-100 text-amber-700'
                          : payLabel === '已取消' ? 'bg-gray-100 text-gray-600'
                          : payLabel === '已完成' ? 'bg-emerald-100 text-emerald-700'
                          : payLabel === '已支付' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
                        return (
                          <span className={`px-2 py-0.5 sm:px-3 sm:py-1 rounded text-xs sm:text-sm font-medium inline-block whitespace-nowrap ${payClass}`}>
                            {payLabel}
                          </span>
                        );
                      })()}
                    </td>
                    <td className='p-2 sm:p-4' onClick={(e) => e.stopPropagation()}>
                      {item.status === 'cancelled' ? (
                        <span className="text-gray-500 text-xs sm:text-sm">-</span>
                      ) : (
                        <select
                          value={item.stayStatus || 'pending_checkin'}
                          onChange={(e) => handleUpdateStayStatus(item._id, e.target.value)}
                          disabled={item.stayStatus === 'checked_out'}
                          className="text-xs sm:text-sm border border-gray-300 rounded px-2 py-1 bg-white focus:ring-1 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                        >
                          <option value="pending_checkin" disabled={item.stayStatus === 'checked_in' || item.stayStatus === 'checked_out'}>待入住</option>
                          <option value="checked_in" disabled={item.stayStatus === 'checked_out'}>已入住</option>
                          <option value="checked_out">已退房</option>
                        </select>
                      )}
                    </td>
                    <td className='p-2 sm:p-4' onClick={(e) => e.stopPropagation()}>
                      {item.refundStatus === 'pending' && (
                        item.merchantRequestedPlatformIntervention ? (
                          <span className="text-xs text-gray-500">已提交平台介入</span>
                        ) : (
                        <div className="flex flex-wrap gap-1.5">
                          <button
                            type="button"
                            onClick={() => window.confirm('确定同意该退款申请？') && handleReviewRefund(item._id, 'approve')}
                            className="px-2 py-1.5 rounded text-xs font-medium bg-green-600 text-white hover:bg-green-700 min-h-[36px]"
                          >
                            同意
                          </button>
                          <button
                            type="button"
                            onClick={() => handleReviewRefund(item._id, 'reject')}
                            className="px-2 py-1.5 rounded text-xs font-medium bg-red-100 text-red-700 hover:bg-red-200 min-h-[36px]"
                          >
                            拒绝
                          </button>
                          <button
                            type="button"
                            onClick={() => handlePlatformIntervention(item._id)}
                            className="px-2 py-1.5 rounded text-xs font-medium bg-blue-100 text-blue-700 hover:bg-blue-200 min-h-[36px]"
                          >
                            平台介入
                          </button>
                        </div>
                        )
                      )}
                      {item.status !== 'cancelled' && !item.isCompleted && item.refundStatus !== 'pending' && (
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

        {/* 预定详情弹窗 */}
        {selectedBooking && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
            onClick={() => setSelectedBooking(null)}
            role="dialog"
            aria-modal="true"
          >
            <div
              className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto"
              style={{ boxShadow: '0 0 20px rgba(0,0,0,0.12)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">预定信息详情</h3>
                {(() => {
                  const b = selectedBooking;
                  const checkIn = formatDateStr(b.checkInDate);
                  const checkOut = formatDateStr(b.checkOutDate);
                  const nights = b.checkInDate && b.checkOutDate
                    ? Math.ceil((new Date(b.checkOutDate) - new Date(b.checkInDate)) / (1000 * 60 * 60 * 24))
                    : 0;
                  const pricePerNight = b.room?.pricePerNight ?? 0;
                  return (
                    <div className="space-y-4 text-sm">
                      <div className="rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 space-y-2">
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
                          <span>入住：{checkIn}</span>
                          <span>退房：{checkOut}</span>
                          <span>{nights}晚</span>
                          <span>{b.guests ?? 0}位住客</span>
                        </div>
                        <div className="flex flex-wrap gap-x-6 gap-y-1 text-gray-700">
                          <span>酒店：{b.hotel?.name ?? '—'}</span>
                          <span>房型：{b.room?.roomType ? getRoomTypeLabel(b.room.roomType) : '—'}</span>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <span className="text-gray-500">姓名</span>
                          <p className="text-gray-800">{(b.guestName || b.user?.username) ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">邮箱</span>
                          <p className="text-gray-800">{b.guestEmail ?? '—'}</p>
                        </div>
                        <div>
                          <span className="text-gray-500">手机号</span>
                          <p className="text-gray-800">{b.guestPhone ?? '—'}</p>
                        </div>
                        {b.guestRemark && (
                          <div className="sm:col-span-2">
                            <span className="text-gray-500">备注</span>
                            <p className="text-gray-800">{b.guestRemark}</p>
                          </div>
                        )}
                      </div>
                      <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-1">
                        <div className="flex justify-between text-gray-700">
                          <span>单价（元/晚）</span>
                          <span>{pricePerNight} 元</span>
                        </div>
                        <div className="flex justify-between font-semibold text-gray-800">
                          <span>总金额</span>
                          <span>{b.totalPrice ?? 0} 元</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                <div className="mt-6">
                  <button
                    type="button"
                    onClick={() => setSelectedBooking(null)}
                    className="w-full sm:w-auto bg-black text-white px-5 py-2 rounded-lg hover:bg-gray-800 transition"
                  >
                    关闭
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  )
}

export default Dashboard