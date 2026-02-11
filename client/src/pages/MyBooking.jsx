import React, { useEffect, useState } from 'react';
import Title from '../components/Title';
import { FaLocationArrow } from 'react-icons/fa';
import { CiUser } from 'react-icons/ci';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;

const CANCEL_REASONS = [
  { value: '行程有变', label: '行程有变' },
  { value: '重复下单', label: '重复下单' },
  { value: '选错日期', label: '选错日期' },
  { value: '价格原因', label: '价格原因' },
  { value: '其他', label: '其他' },
];

function MyBooking() {

    const {axios,getToken,user} = useAppContext();

    const [bookings, setBookings] = useState([]);
    const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null, reason: '', otherText: '' });

    async function fetchBookings() {
        try {
            const token  = await getToken();
            if (!token) {
                setBookings([]);
                return;
            }
            const { data } = await axios.get("/api/bookings/user", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success && Array.isArray(data.bookings)) {
                toast.success("订单加载成功");
                setBookings(data.bookings);
            } else {
                setBookings([]);
                if (data && !data.success) toast.error(data.message || "加载订单失败");
            }
        } catch (error) {
            setBookings([]);
            toast.error(error.response?.data?.message || error.message || "加载订单失败");
        }
    }

    async function handleCancelOrder() {
        const { bookingId, reason } = cancelModal;
        if (!bookingId) return;
        const otherText = (cancelModal.otherText && cancelModal.otherText.trim()) || '';
        const finalReason = (reason === '其他' && otherText)
            ? `其他：${otherText}`
            : (reason && reason.trim()) ? reason.trim() : '未填写';
        try {
            const token = await getToken();
            const { data } = await axios.patch(
                `/api/bookings/${bookingId}/cancel`,
                { cancelReason: finalReason },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success('订单已取消');
                setCancelModal({ open: false, bookingId: null, reason: '', otherText: '' });
                fetchBookings();
            } else {
                toast.error(data.message || '取消失败');
            }
        } catch (e) {
            toast.error(e.response?.data?.message || '取消失败');
        }
    }

    async function handlePayment(bookingId) {
        try{
            const token = await getToken();
            const {data} = await axios.post('api/bookings/stripe-payment', {
                bookingId
            },{
                headers: {
                    Authorization: `Bearer ${token}`
                }
            })

            if (data.success) {
                window.location.href = data.url;
            }else{
                toast.error(data.message || "发起支付失败，请重试。"); 
            }
        } catch (error) {
            toast.error("支付失败，请稍后重试。");
            console.error("Payment error:", error);
        }
    }

    useEffect(()=>{
        if (user) {
            fetchBookings();
        }
    },[user])

    return (
        <div className="px-4 py-20 md:px-16 lg:px-24 xl:px-32 bg-gray-50 min-h-screen">
    <Title
        title="我的订单"
        subtitle="管理您的预订并查看订单详情。"
        align="left"
        className="pt-28 md:pt-36 mb-16"
    />

    {/* Table Headers */}
    <div className="hidden lg:grid grid-cols-12 gap-4 text-sm font-semibold text-gray-500 uppercase border-b pb-4">
        <div className="col-span-5">酒店</div>
        <div className="col-span-3">日期</div>
        <div className="col-span-2">支付</div>
        <div className="col-span-2">订单状态</div>
    </div>

    <div className="space-y-8 mt-8">
        {bookings.length === 0 && (
            <p className="text-gray-500 text-center py-8">暂无订单</p>
        )}
        {bookings.map((booking) => {
            const room = booking.room;
            const hotel = booking.hotel;
            const imgSrc = room?.images?.[0] || '';
            if (!room || !hotel) {
                return (
                    <div key={booking._id} className="bg-white rounded-2xl shadow p-5 text-gray-500 text-sm">
                        订单数据不完整，可能酒店或房型已下架
                    </div>
                );
            }
            return (
            <div
                key={booking._id}
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 flex flex-col lg:flex-row gap-6"
            >
                {/* Hotel Info */}
                <div className="flex flex-1 gap-5">
                    {imgSrc ? (
                        <img
                            src={imgSrc}
                            alt="房间"
                            className="w-32 h-24 object-cover rounded-lg shadow-sm"
                        />
                    ) : (
                        <div className="w-32 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">暂无图</div>
                    )}
                    <div className="flex flex-col justify-between text-gray-700">
                        <p className="text-lg font-semibold text-gray-900 leading-snug">
                            {hotel.name}
                            <span className="text-sm font-normal text-gray-500"> — {getRoomTypeLabel(room.roomType)}</span>
                        </p>
                        <div className="flex items-center text-sm gap-2 mt-1">
                            <FaLocationArrow size={14} className="text-gray-500" />
                            <span>{hotel.address || '—'}</span>
                        </div>
                        <div className="flex items-center text-sm gap-2 mt-1">
                            <CiUser size={16} className="text-gray-500" />
                            <span>{booking.guests} 人</span>
                        </div>
                        <p className="text-sm mt-2">
                            总价：<span className="font-semibold text-gray-900">{booking.totalPrice} 元</span>
                        </p>
                    </div>
                </div>

                {/* Check-in / Check-out */}
                <div className="flex flex-col justify-between gap-4 min-w-[150px] text-sm text-gray-700">
                    <div>
                        <p className="font-semibold text-gray-800 mb-1">入住</p>
                        <p>{booking.checkInDate ? new Date(booking.checkInDate).toLocaleDateString('zh-CN') : '—'}</p>
                    </div>
                    <div>
                        <p className="font-semibold text-gray-800 mb-1">退房</p>
                        <p>{booking.checkOutDate ? new Date(booking.checkOutDate).toLocaleDateString('zh-CN') : '—'}</p>
                    </div>
                </div>

                {/* Payment & Status */}
                <div className="flex flex-col justify-between items-start lg:items-end gap-4 min-w-[130px]">
                    <span
                        className={`${
                            booking.isPaid
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                        } px-3 py-1 rounded-full text-sm font-medium`}
                    >
                        {booking.isPaid ? '已支付' : '未支付'}
                    </span>
                    {booking.status === 'cancelled' && (
                        <p className="text-sm text-gray-600">
                            {booking.cancelledBy === 'merchant'
                                ? '已取消（商家取消）'
                                : `已取消（用户取消${booking.cancelReason ? `，原因：${booking.cancelReason}` : ''})`}
                        </p>
                    )}
                    {booking.status !== 'cancelled' && !booking.isPaid && (
                        <button
                            onClick={() => handlePayment(booking._id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            立即支付
                        </button>
                    )}
                    {booking.status !== 'cancelled' && (
                        <button
                            type="button"
                            onClick={() => setCancelModal({ open: true, bookingId: booking._id, reason: '', otherText: '' })}
                            className="bg-black hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            取消订单
                        </button>
                    )}
                </div>
            </div>
        );})}
    </div>

    {/* 取消订单原因弹窗 */}
    {cancelModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setCancelModal({ open: false, bookingId: null, reason: '', otherText: '' })}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">取消订单</h3>
                <p className="text-sm text-gray-600 mb-4">请选择取消原因（将供商家查看）：</p>
                <div className="space-y-2 mb-4">
                    {CANCEL_REASONS.map((r) => (
                        <label key={r.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="cancelReason"
                                value={r.value}
                                checked={cancelModal.reason === r.value}
                                onChange={() => setCancelModal((prev) => ({ ...prev, reason: r.value }))}
                                className="rounded border-gray-300"
                            />
                            <span className="text-sm">{r.label}</span>
                        </label>
                    ))}
                    {cancelModal.reason === '其他' && (
                        <input
                            type="text"
                            placeholder="请输入具体原因"
                            value={cancelModal.otherText}
                            onChange={(e) => setCancelModal((prev) => ({ ...prev, otherText: e.target.value }))}
                            className="mt-2 w-full border border-gray-300 rounded px-3 py-2 text-sm"
                        />
                    )}
                </div>
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => setCancelModal({ open: false, bookingId: null, reason: '', otherText: '' })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                        关闭
                    </button>
                    <button
                        type="button"
                        onClick={handleCancelOrder}
                        className="flex-1 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-700"
                    >
                        确定取消
                    </button>
                </div>
            </div>
        </div>
    )}
</div>

    );
}

export default MyBooking;
