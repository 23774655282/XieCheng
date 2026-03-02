import React, { useEffect, useState, useRef } from 'react';
import Title from '../components/Title';
import { FaLocationArrow } from 'react-icons/fa';
import { CiUser } from 'react-icons/ci';
import { QRCodeSVG } from 'qrcode.react';
import { useAppContext } from '../context/AppContext';
import toast from 'react-hot-toast';

const roomTypeToCn = { 'Single Bed': '单人间', 'Double Bed': '双人间', 'Luxury Room': '豪华房', 'Family Suite': '家庭套房' };
const getRoomTypeLabel = (roomType) => roomTypeToCn[roomType] || roomType;

const PAYMENT_DEADLINE_MINUTES = 15;

/** 未支付订单倒计时：返回剩余秒数，≤0 表示已超时 */
function getPaymentCountdownSeconds(booking) {
    if (!booking?.createdAt) return 0;
    const deadline = new Date(new Date(booking.createdAt).getTime() + PAYMENT_DEADLINE_MINUTES * 60 * 1000);
    return Math.max(0, Math.floor((deadline - Date.now()) / 1000));
}

function formatCountdown(seconds) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m} 分 ${String(s).padStart(2, '0')} 秒`;
}

const CANCEL_REASONS = [
  { value: '行程有变', label: '行程有变' },
  { value: '重复下单', label: '重复下单' },
  { value: '选错日期', label: '选错日期' },
  { value: '价格原因', label: '价格原因' },
  { value: '其他', label: '其他' },
];

/** 地址展示：过长则缩写，悬停 0.5 秒后弹框显示全部 */
function AddressWithTooltip({ address, className = '' }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const timeoutRef = useRef(null);
    const full = address || '—';
    const isLong = full.length > 12;

    const onMouseEnter = () => {
        if (!isLong) return;
        timeoutRef.current = setTimeout(() => setShowTooltip(true), 500);
    };
    const onMouseLeave = () => {
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        setShowTooltip(false);
    };

    return (
        <div
            className={`relative min-w-0 flex-1 ${className}`}
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
        >
            <span className={isLong ? 'block truncate' : ''}>{full}</span>
            {showTooltip && isLong && (
                <div className="absolute left-0 bottom-full mb-1 z-50 py-2 px-3 bg-gray-900 text-white text-sm rounded-lg shadow-lg max-w-xs whitespace-normal">
                    {full}
                </div>
            )}
        </div>
    );
}

function MyBooking({ embedded = false }) {

    const { axios, getToken, user, role, merchantApplicationStatus, navigate } = useAppContext();

    const [bookings, setBookings] = useState([]);
    const [cancelModal, setCancelModal] = useState({ open: false, bookingId: null, reason: '', otherText: '' });
    const [refundModal, setRefundModal] = useState({ open: false, bookingId: null, reason: '', supplement: '', isSupplement: false });
    const [platformRefundModal, setPlatformRefundModal] = useState({ open: false, bookingId: null, reason: '' });
    const [refundSubmitting, setRefundSubmitting] = useState(false);
    const [platformRefundSubmitting, setPlatformRefundSubmitting] = useState(false);
    const [payQRModal, setPayQRModal] = useState({ open: false, bookingId: null, payUrl: '' });
    const [reviewModal, setReviewModal] = useState({
        open: false,
        bookingId: null,
        hotelId: null,
        hotelName: '',
    });
    const [reviewSubmitting, setReviewSubmitting] = useState(false);
    const [reviewForm, setReviewForm] = useState({
        rating: 0,
        comment: '',
        images: [],
    });
    const [reviewPreviewUrls, setReviewPreviewUrls] = useState([]);
    const [ratingHover, setRatingHover] = useState(null);
    const [ratingActive, setRatingActive] = useState(false);
    const starContainerRef = useRef(null);
    const pollRef = useRef(null);
    const [countdownTick, setCountdownTick] = useState(0);

    function getStarRatingFromEvent(e) {
        const el = starContainerRef.current;
        if (!el) return 0.5;
        const rect = el.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const totalW = rect.width;
        const gap = 2;
        const starW = (totalW - 4 * gap) / 5;
        for (let seg = 0; seg < 10; seg++) {
            const starIdx = Math.floor(seg / 2);
            const half = seg % 2;
            const start = starIdx * (starW + gap) + half * (starW / 2);
            const end = start + (starW / 2);
            if (x >= start && x < end) return (seg + 1) * 0.5;
        }
        return x >= totalW - 1 ? 5 : 0.5;
    }

    useEffect(() => {
        if (reviewForm.images.length === 0) {
            setReviewPreviewUrls([]);
            return;
        }
        const urls = reviewForm.images.map((f) => URL.createObjectURL(f));
        setReviewPreviewUrls(urls);
        return () => urls.forEach((u) => URL.revokeObjectURL(u));
    }, [reviewForm.images]);

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

    async function handleRequestRefund() {
        const { bookingId, reason, supplement, isSupplement } = refundModal;
        const content = isSupplement ? supplement : reason;
        if (!bookingId || !(content && content.trim())) {
            toast.error(isSupplement ? '请填写补充内容' : '请填写退款原因');
            return;
        }
        setRefundSubmitting(true);
        try {
            const token = await getToken();
            if (isSupplement) {
                const { data } = await axios.patch(
                    `/api/bookings/${bookingId}/supplement-refund-reason`,
                    { supplementalReason: content.trim() },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (data.success) {
                    toast.success(data.message || '退款理由已补充');
                    setRefundModal({ open: false, bookingId: null, reason: '', supplement: '', isSupplement: false });
                    fetchBookings(true);
                } else {
                    toast.error(data.message || '补充失败');
                }
            } else {
                const { data } = await axios.post(
                    `/api/bookings/${bookingId}/request-refund`,
                    { refundReason: reason.trim() },
                    { headers: { Authorization: `Bearer ${token}` } }
                );
                if (data.success) {
                    toast.success(data.message || '退款申请已提交');
                    setRefundModal({ open: false, bookingId: null, reason: '', supplement: '', isSupplement: false });
                    fetchBookings(true);
                } else {
                    toast.error(data.message || '提交失败');
                }
            }
        } catch (e) {
            toast.error(e.response?.data?.message || (isSupplement ? '补充失败' : '提交退款申请失败'));
        } finally {
            setRefundSubmitting(false);
        }
    }

    async function handleRequestPlatformRefundReview() {
        const { bookingId, reason } = platformRefundModal;
        if (!bookingId || !(reason && reason.trim())) {
            toast.error('请填写申请原因');
            return;
        }
        setPlatformRefundSubmitting(true);
        try {
            const token = await getToken();
            const { data } = await axios.post(
                `/api/bookings/${bookingId}/request-platform-refund-review`,
                { reason: reason.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            if (data.success) {
                toast.success(data.message || '已提交平台介入');
                setPlatformRefundModal({ open: false, bookingId: null, reason: '' });
                fetchBookings(true);
            } else {
                toast.error(data.message || '提交失败');
            }
        } catch (e) {
            toast.error(e.response?.data?.message || '提交失败');
        } finally {
            setPlatformRefundSubmitting(false);
        }
    }

    async function handlePayment(bookingId) {
        try {
            const token = await getToken();
            const { data } = await axios.get(`/api/bookings/${bookingId}/pay-qr`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success && data.token) {
                // 优先使用后端返回的 payUrl（已包含 PUBLIC_URL），确保二维码链接是公网地址
                const payUrl = data.payUrl || `${window.location.origin}/pay-success?bookingId=${bookingId}&token=${data.token}`;
                setPayQRModal({ open: true, bookingId, payUrl });
            } else {
                toast.error(data.message || "获取支付二维码失败，请重试。");
            }
        } catch (error) {
            toast.error(error.response?.data?.message || "获取支付二维码失败，请稍后重试。");
        }
    }

    function handleReviewImagesChange(e) {
        const files = Array.from(e.target.files || []);
        const limited = files.slice(0, 3);
        setReviewForm((prev) => ({ ...prev, images: limited }));
    }

    async function handleSubmitReview(e) {
        e.preventDefault();
        if (!reviewModal.bookingId || !reviewModal.hotelId) return;
        if (reviewForm.rating < 1) {
            toast.error('请选择评分');
            return;
        }
        if (!reviewForm.comment.trim()) {
            toast.error('请输入评价内容');
            return;
        }
        setReviewSubmitting(true);
        try {
            const token = await getToken();
            const formData = new FormData();
            formData.append('hotelId', reviewModal.hotelId);
            formData.append('bookingId', reviewModal.bookingId);
            formData.append('rating', String(reviewForm.rating));
            formData.append('comment', reviewForm.comment.trim());
            reviewForm.images.forEach((file) => {
                formData.append('images', file);
            });
            const { data } = await axios.post('/api/reviews', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data',
                },
            });
            if (data.success) {
                toast.success('评价提交成功');
                setReviewModal({ open: false, bookingId: null, hotelId: null, hotelName: '' });
                setReviewForm({ rating: 0, comment: '', images: [] });
                setRatingHover(null);
                setRatingActive(false);
                fetchBookings(true);
            } else {
                toast.error(data.message || '评价提交失败');
            }
        } catch (error) {
            toast.error(error.response?.data?.message || '评价提交失败');
        } finally {
            setReviewSubmitting(false);
        }
    }

    useEffect(() => {
        if (user) {
            fetchBookings();
        }
    }, [user]);

    // 未支付订单倒计时：每秒更新，超时时刷新订单
    useEffect(() => {
        const unpaid = bookings.filter((b) => b.status !== 'cancelled' && !b.isPaid);
        if (unpaid.length === 0) return;
        const timer = setInterval(() => {
            const anyExpired = unpaid.some((b) => getPaymentCountdownSeconds(b) <= 0);
            if (anyExpired) {
                fetchBookings(true);
            }
            setCountdownTick((t) => t + 1);
        }, 1000);
        return () => clearInterval(timer);
    }, [bookings]);

    // 支付弹窗：若订单已被取消（含超时自动取消），关闭弹窗
    useEffect(() => {
        if (!payQRModal.open || !payQRModal.bookingId) return;
        const b = bookings.find((x) => x._id === payQRModal.bookingId);
        if (b && (b.status === 'cancelled' || getPaymentCountdownSeconds(b) <= 0)) {
            setPayQRModal({ open: false, bookingId: null, payUrl: '' });
        }
    }, [bookings, countdownTick, payQRModal.open, payQRModal.bookingId]);

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
        <div className={embedded ? "py-0" : "px-4 py-20 md:px-16 lg:px-24 xl:px-32 bg-gray-50 min-h-screen"}>
    {!embedded && (
        <>
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
        </>
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
                {/* Hotel Info：左上房间照片，下为地址；右侧酒店名、房型、人数、总价 */}
                <div className="flex flex-1 gap-5">
                    <div className="flex flex-col shrink-0">
                        {imgSrc ? (
                            <img
                                src={imgSrc}
                                alt="房间"
                                className="w-32 h-24 object-cover rounded-lg shadow-sm"
                            />
                        ) : (
                            <div className="w-32 h-24 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400 text-xs">暂无图</div>
                        )}
                        <div className="flex items-start gap-2 mt-2 w-32 min-w-0">
                            <FaLocationArrow size={14} className="text-gray-500 shrink-0 mt-0.5" />
                            <AddressWithTooltip
                                address={[hotel.address, hotel.doorNumber].filter(Boolean).join(' ') || undefined}
                                className="text-sm text-gray-600"
                            />
                        </div>
                    </div>
                    <div className="flex flex-col justify-between text-gray-700 min-w-0">
                        <p className="text-lg font-semibold text-gray-900 leading-snug">
                            {hotel.name}
                            <span className="text-sm font-normal text-gray-500"> — {getRoomTypeLabel(room.roomType)}</span>
                        </p>
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

                {/* Payment & Status - 与商家仪表盘支付列统一：待支付/已支付/已取消/退款中/已退款/已完成 */}
                <div className="flex flex-col justify-between items-start lg:items-end gap-4 min-w-[130px]">
                    {(() => {
                        const payLabel = (booking.refundStatus === 'rejected' && booking.refundPlatformReviewRequested) ? '客服介入中'
                            : booking.refundStatus === 'approved' ? '已退款'
                            : booking.refundStatus === 'pending' ? '退款中'
                            : booking.status === 'cancelled' ? '已取消'
                            : booking.isCompleted ? '已完成'
                            : booking.isPaid ? '已支付' : '待支付';
                        const payClass = payLabel === '客服介入中' ? 'bg-purple-100 text-purple-700'
                            : payLabel === '已退款' ? 'bg-slate-100 text-slate-600'
                            : payLabel === '退款中' ? 'bg-amber-100 text-amber-700'
                            : payLabel === '已取消' ? 'bg-gray-100 text-gray-600'
                            : payLabel === '已完成' ? 'bg-emerald-100 text-emerald-700'
                            : payLabel === '已支付' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600';
                        const suffix = payLabel === '已完成' && booking.hasReview ? ' · 已评价' : '';
                        const countdown = payLabel === '待支付' ? getPaymentCountdownSeconds(booking) : 0;
                        return (
                            <div className="flex flex-col items-end gap-1 min-w-[200px]">
                                <span className={`px-3 py-1 rounded-full text-sm font-medium ${payClass}`}>
                                    {payLabel}{suffix}
                                </span>
                                {payLabel === '待支付' && countdown > 0 && (
                                    <span className="text-xs text-amber-600 font-medium w-full text-right whitespace-nowrap">
                                        剩余 {formatCountdown(countdown)} 未支付将自动取消
                                    </span>
                                )}
                            </div>
                        );
                    })()}
                    {booking.status !== 'cancelled' && !booking.isPaid && (
                        <button
                            onClick={() => handlePayment(booking._id)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            立即支付
                        </button>
                    )}
                    {booking.status !== 'cancelled' && !booking.isCompleted && (
                        <button
                            type="button"
                            onClick={() => setCancelModal({ open: true, bookingId: booking._id, reason: '', otherText: '' })}
                            className="bg-black hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            取消订单
                        </button>
                    )}
                    {booking.isCompleted && (
                        booking.hasReview ? (
                            <span className="mt-2 inline-block bg-amber-100 text-amber-600 px-4 py-2 rounded-lg text-sm cursor-not-allowed">
                                已评价
                            </span>
                        ) : (
                            <button
                                type="button"
                                onClick={() => setReviewModal({
                                    open: true,
                                    bookingId: booking._id,
                                    hotelId: booking.hotel?._id || booking.hotel,
                                    hotelName: booking.hotel?.name || '',
                                })}
                                className="mt-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                            >
                                去评价
                            </button>
                        )
                    )}
                    {booking.isCompleted && !booking.refundRequested && booking.refundStatus !== 'approved' && (
                        <button
                            type="button"
                            onClick={() => setRefundModal({ open: true, bookingId: booking._id, reason: '', isSupplement: false })}
                            className="mt-2 bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            申请退款
                        </button>
                    )}
                    {booking.isCompleted && booking.refundStatus === 'pending' && (
                        <button
                            type="button"
                            onClick={() => setRefundModal({ open: true, bookingId: booking._id, reason: booking.refundReason || '', isSupplement: true })}
                            className="mt-2 bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                        >
                            退款中
                        </button>
                    )}
                    {booking.isCompleted && booking.refundStatus === 'rejected' && (
                        <>
                            <span className="mt-2 inline-flex items-center px-3 py-1 rounded-full bg-red-50 text-red-700 text-sm font-medium">
                                已被拒
                            </span>
                            {!booking.refundPlatformReviewRequested && (
                                <button
                                    type="button"
                                    onClick={() => setPlatformRefundModal({ open: true, bookingId: booking._id, reason: '' })}
                                    className="mt-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm shadow transition"
                                >
                                    选择客服介入
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>
        );})}
    </div>

    {/* 扫码付款二维码弹窗 */}
    {payQRModal.open && payQRModal.payUrl && payQRModal.bookingId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setPayQRModal({ open: false, bookingId: null, payUrl: '' })}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4 flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-1">扫码付款</h3>
                <p className="text-sm text-gray-500 mb-2">请使用手机扫描二维码完成支付</p>
                {(() => {
                    const b = bookings.find((x) => x._id === payQRModal.bookingId);
                    const secs = b ? getPaymentCountdownSeconds(b) : 0;
                    return secs > 0 ? (
                        <p className="text-xs text-amber-600 font-medium mb-4">剩余 {formatCountdown(secs)} 未支付将自动取消</p>
                    ) : (
                        <p className="text-xs text-red-600 font-medium mb-4">订单已超时取消</p>
                    );
                })()}
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

    {/* 申请退款 / 补充退款理由 弹窗 */}
    {refundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !refundSubmitting && setRefundModal({ open: false, bookingId: null, reason: '', isSupplement: false })}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">
                    {refundModal.isSupplement ? '补充退款理由' : '申请退款'}
                </h3>
                {refundModal.isSupplement ? (
                    <>
                        <p className="text-sm text-gray-600 mb-2">当前已提交的理由：</p>
                        <div className="text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2 mb-3 whitespace-pre-wrap">
                            {refundModal.reason || '（无）'}
                        </div>
                        <p className="text-sm text-gray-600 mb-2">补充内容（将追加给商家）：</p>
                        <textarea
                            value={refundModal.supplement || ''}
                            onChange={(e) => setRefundModal((prev) => ({ ...prev, supplement: e.target.value }))}
                            placeholder="请输入补充内容（必填）"
                            rows={3}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                            disabled={refundSubmitting}
                        />
                    </>
                ) : (
                    <>
                        <p className="text-sm text-gray-600 mb-4">请写明退款原因，提交后由商家审核：</p>
                        <textarea
                            value={refundModal.reason}
                            onChange={(e) => setRefundModal((prev) => ({ ...prev, reason: e.target.value }))}
                            placeholder="请输入退款原因（必填）"
                            rows={4}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                            disabled={refundSubmitting}
                        />
                    </>
                )}
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => !refundSubmitting && setRefundModal({ open: false, bookingId: null, reason: '', supplement: '', isSupplement: false })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        关闭
                    </button>
                    <button
                        type="button"
                        onClick={handleRequestRefund}
                        disabled={refundSubmitting || (refundModal.isSupplement ? !(refundModal.supplement && refundModal.supplement.trim()) : !(refundModal.reason && refundModal.reason.trim()))}
                        className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {refundSubmitting ? '提交中...' : (refundModal.isSupplement ? '提交补充' : '提交申请')}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* 客服介入弹窗（商家拒绝退款后） */}
    {platformRefundModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => !platformRefundSubmitting && setPlatformRefundModal({ open: false, bookingId: null, reason: '' })}>
            <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">选择客服介入</h3>
                <p className="text-sm text-gray-600 mb-4">商家已拒绝您的退款申请，可提交客服审核。请写明原因：</p>
                <textarea
                    value={platformRefundModal.reason}
                    onChange={(e) => setPlatformRefundModal((prev) => ({ ...prev, reason: e.target.value }))}
                    placeholder="请输入申请原因（必填）"
                    rows={4}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 mb-4"
                    disabled={platformRefundSubmitting}
                />
                <div className="flex gap-3">
                    <button
                        type="button"
                        onClick={() => !platformRefundSubmitting && setPlatformRefundModal({ open: false, bookingId: null, reason: '' })}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        关闭
                    </button>
                    <button
                        type="button"
                        onClick={handleRequestPlatformRefundReview}
                        disabled={platformRefundSubmitting || !(platformRefundModal.reason && platformRefundModal.reason.trim())}
                        className="flex-1 px-4 py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {platformRefundSubmitting ? '提交中...' : '提交'}
                    </button>
                </div>
            </div>
        </div>
    )}

    {/* 订单评价弹窗 */}
    {reviewModal.open && (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={() => {
                if (!reviewSubmitting) {
                    setReviewModal({ open: false, bookingId: null, hotelId: null, hotelName: '' });
                    setReviewForm({ rating: 0, comment: '', images: [] });
                    setRatingHover(null);
                }
            }}
        >
            <div
                className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                    评价酒店 {reviewModal.hotelName || ''}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                    您已完成该订单，是否愿意给本次入住体验打个分并留下评价？
                </p>
                <form onSubmit={handleSubmitReview} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            评分
                        </label>
                        <div className="flex items-center gap-2 w-fit">
                        <div
                            ref={starContainerRef}
                            onMouseMove={(e) => {
                                if (!ratingActive) return;
                                const r = getStarRatingFromEvent(e);
                                setRatingHover(r);
                            }}
                            onMouseLeave={() => { if (ratingActive) setRatingHover(null); }}
                            onClick={(e) => {
                                if (reviewSubmitting) return;
                                const r = getStarRatingFromEvent(e);
                                if (!ratingActive) {
                                    if (r <= 1) {
                                        setRatingActive(true);
                                        setRatingHover(r);
                                        setReviewForm((prev) => ({ ...prev, rating: r }));
                                    }
                                    return;
                                }
                                setReviewForm((prev) => ({ ...prev, rating: ratingHover !== null ? ratingHover : r }));
                                setRatingActive(false);
                                setRatingHover(null);
                            }}
                            className="flex items-center gap-0.5 cursor-pointer select-none shrink-0"
                        >
                            {[1, 2, 3, 4, 5].map((star) => {
                                const displayRating = ratingActive && ratingHover !== null ? ratingHover : reviewForm.rating;
                                const fill = Math.min(1, Math.max(0, displayRating - star + 1));
                                return (
                                    <span key={star} className="relative inline-block w-6 h-6 text-2xl leading-6 shrink-0">
                                        <span className="text-gray-300">★</span>
                                        <span
                                            className="absolute inset-0 text-yellow-400 overflow-hidden"
                                            style={{ width: `${fill * 100}%` }}
                                        >
                                            ★
                                        </span>
                                    </span>
                                );
                            })}
                        </div>
                            <span className="text-sm text-gray-600 shrink-0">
                                {(ratingActive && ratingHover !== null ? ratingHover : reviewForm.rating) > 0
                                    ? (ratingActive && ratingHover !== null ? ratingHover : reviewForm.rating).toFixed(1) + ' 分'
                                    : '—'}
                            </span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            评价内容
                        </label>
                        <textarea
                            rows={4}
                            value={reviewForm.comment}
                            onChange={(e) =>
                                setReviewForm((prev) => ({ ...prev, comment: e.target.value }))
                            }
                            disabled={reviewSubmitting}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="可以从卫生、服务、位置、设施等方面分享您的真实体验。"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            上传图片（最多 3 张，选填）
                        </label>
                        <label className={`flex flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition ${reviewSubmitting ? 'opacity-50 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}`}>
                            <input
                                type="file"
                                accept="image/*"
                                multiple
                                onChange={handleReviewImagesChange}
                                disabled={reviewSubmitting}
                                className="hidden"
                            />
                            <span className="text-gray-500 text-sm">点击上传图片</span>
                            <span className="text-gray-400 text-xs">最多 3 张</span>
                        </label>
                        {reviewForm.images.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-2">
                                {reviewForm.images.map((file, idx) => reviewPreviewUrls[idx] && (
                                    <div key={idx} className="relative group">
                                        <img
                                            src={reviewPreviewUrls[idx]}
                                            alt={`预览 ${idx + 1}`}
                                            className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setReviewForm((prev) => ({
                                                    ...prev,
                                                    images: prev.images.filter((_, i) => i !== idx),
                                                }));
                                            }}
                                            disabled={reviewSubmitting}
                                            className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-white text-xs leading-none flex items-center justify-center hover:bg-red-600 opacity-0 group-hover:opacity-100 transition disabled:opacity-50"
                                            aria-label="移除"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button
                            type="button"
                            disabled={reviewSubmitting}
                            onClick={() => {
                                setReviewModal({ open: false, bookingId: null, hotelId: null, hotelName: '' });
                                setReviewForm({ rating: 0, comment: '', images: [] });
                                setRatingHover(null);
                                setRatingActive(false);
                            }}
                            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            暂不评价
                        </button>
                        <button
                            type="submit"
                            disabled={reviewSubmitting}
                            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                            {reviewSubmitting ? '提交中...' : '提交评价'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )}
</div>

    );
}

export default MyBooking;
