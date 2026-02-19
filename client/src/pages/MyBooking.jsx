import React, { useEffect, useState, useRef } from 'react';
import Title from '../components/Title';
import { FaLocationArrow } from 'react-icons/fa';
import { CiUser } from 'react-icons/ci';
import { QRCodeSVG } from 'qrcode.react';
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

    const { axios, getToken, user, role, merchantApplicationStatus, navigate } = useAppContext();

    const [bookings, setBookings] = useState([]);
    const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null, reason: '', otherText: '' });
    const [payQRModal, setPayQRModal] = useState({ open: false, bookingId: null, payUrl: '' });
    const pollRef = useRef(null);

    async function fetchBookings(silent = false) {
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
                if (!silent) toast.success("订单加载成功");
                setBookings(data.bookings);
            } else {
                setBookings([]);
                if (!silent && data && !data.success) toast.error(data.message || "加载订单失败");
            }
        } catch (error) {
            setBookings([]);
            if (!silent) toast.error(error.response?.data?.message || error.message || "加载订单失败");
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
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/bookings/${bookingId}/pay-qr`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success && data.token) {
                const payUrl = `${window.location.origin}/pay-success?bookingId=${bookingId}&token=${data.token}`;
                setPayQRModal({ open: true, bookingId, payUrl });
            } else {
                toast.error(data.message || "获取支付二维码失败，请重试。");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "获取支付二维码失败，请稍后重试。");
        }
    }

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    // 扫码付款：轮询订单状态，支付成功后关闭二维码弹窗并提示
    useEffect(() => {
        if (!payQRModal.open || !payQRModal.bookingId) return;
        pollRef.current = setInterval(() => {
            getToken().then((token) => {
                if (!token) return;
                axios.get("/api/bookings/user", { headers: { Authorization: `Bearer ${token}` } })
                    .then(({ data }) => {
                        if (data.success && Array.isArray(data.bookings)) {
                            const paid = data.bookings.find((b) => b._id === payQRModal.bookingId && b.isPaid);
                            if (paid) {
                                if (pollRef.current) clearInterval(pollRef.current);
                                setPayQRModal({ open: false, bookingId: null, payUrl: '' });
                                setBookings(data.bookings);
                                toast.success("付款成功");
                            }
                        }
                    })
                    .catch(() => {});
            });
        }, 2000);
        return () => { if (pollRef.current) clearInterval(pollRef.current); };
    }, [payQRModal.open, payQRModal.bookingId]);

    return (
        <div className="px-4 py-20 md:px-16 lg:px-24 xl:px-32 bg-gray-50 min-h-screen">
    <Title
        title="我的订单"
        subtitle="管理您的预订并查看订单详情。"
        align="left"
        className="pt-28 md:pt-36 mb-16"
    />

    {/* 申请成为商户（仅普通用户显示） */}
    {role === "user" && (
        <div className="mb-8 p-4 bg-white rounded-xl shadow border border-gray-100">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <p className="font-medium text-gray-900">想成为商户？</p>
                    <p className="text-sm text-gray-500 mt-1">
                        {merchantApplicationStatus === "pending"
                            ? "您的申请审核中，请等待管理员通过"
                            : merchantApplicationStatus === "rejected"
                            ? "您的申请未通过，如有疑问请联系客服"
                            : "申请后可上传酒店、管理房型、接收订单"}
                    </p>
                </div>
                {merchantApplicationStatus === "none" && (
                    <button
                        type="button"
                        onClick={() => navigate("/apply-merchant")}
                        className="shrink-0 px-5 py-2.5 bg-gray-800 text-white rounded-lg hover:bg-gray-700 text-sm font-medium"
                    >
                        申请成为商户
                    </button>
                )}
                {merchantApplicationStatus === "pending" && (
                    <span className="shrink-0 px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm">审核中</span>
                )}
                {merchantApplicationStatus === "rejected" && (
                    <span className="shrink-0 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm">已驳回</span>
                )}
            </div>
        </div>
    )}

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

    {/* 扫码付款二维码弹窗 */}
    {payQRModal.open && payQRModal.payUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPayQRModal({ open: false, bookingId: null, payUrl: '' })}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">扫码付款</h3>
                <p className="text-sm text-gray-500 mb-4">请使用手机扫描二维码完成支付</p>
                <div className="bg-white p-3 rounded-xl border border-gray-200 mb-4">
                    <QRCodeSVG value={payQRModal.payUrl} size={220} level="M" />
                </div>
                <button
                    type="button"
                    onClick={() => setPayQRModal({ open: false, bookingId: null, payUrl: '' })}
                    className="w-full py-2.5 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                    关闭
                </button>
            </div>
        </div>
    )}

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
