
import Booking from "../models/booking.model.js";
import Room from "../models/room.model.js";
import Hotel from "../models/hotel.model.js";
import transporter from "../utils/mailer.js";
import Stripe from "stripe";
import crypto from "crypto";

/** 未支付订单自动取消时限（分钟） */
const PAYMENT_DEADLINE_MINUTES = 15;

/** 判断订单是否已超过付款时限 */
function isPaymentExpired(booking) {
    if (!booking?.createdAt) return false;
    const deadline = new Date(booking.createdAt.getTime() + PAYMENT_DEADLINE_MINUTES * 60 * 1000);
    return new Date() > deadline;
}

/** 取消超时未支付的订单（定时任务调用，也可在请求中调用） */
export async function cancelExpiredUnpaidBookings() {
    const deadline = new Date(Date.now() - PAYMENT_DEADLINE_MINUTES * 60 * 1000);
    const result = await Booking.updateMany(
        { isPaid: false, status: { $ne: "cancelled" }, createdAt: { $lt: deadline } },
        { $set: { status: "cancelled", cancelledBy: "system", cancelReason: "超时未支付自动取消" } }
    );
    if (result.modifiedCount > 0) {
        console.log(`[定时任务] 已取消 ${result.modifiedCount} 个超时未支付订单`);
    }
}

// 计算某个房型在给定日期区间内「剩余可订间数」
async function getAvailableQuantity({ checkInDate, checkOutDate, room }) {
    const roomDoc = await Room.findById(room).select("roomCount").lean();
    if (!roomDoc) return 0;
    const total = roomDoc.roomCount ?? 1;

    const bookings = await Booking.find({
        room,
        status: { $ne: "cancelled" },
        isCompleted: { $ne: true },
        checkInDate: { $lte: checkOutDate },
        checkOutDate: { $gte: checkInDate },
    })
        .select("roomQuantity")
        .lean();

    const booked = bookings.reduce((sum, b) => sum + (b.roomQuantity || 1), 0);
    return Math.max(0, total - booked);
}

// 按间数判断是否可订
async function checkAvailability({ checkInDate, checkOutDate, room, roomQuantity = 1 }) {
    const available = await getAvailableQuantity({ checkInDate, checkOutDate, room });
    return available >= roomQuantity;
}


async function checkAvailabilityApi(req,res) {
    try {
        const {checkInDate, checkOutDate, room, roomQuantity = 1} = req.body;
        const available = await getAvailableQuantity({ checkInDate, checkOutDate, room });
        const isAvail = available >= roomQuantity;

        let message;
        if (isAvail) {
            message = `当前可订 ${available} 间`;
        } else if (available <= 0) {
            message = "该房型在所选日期已订完";
        } else {
            message = `库存不足，当前最多可订 ${available} 间`;
        }

        return res.status(200).json({
            success: true,
            message,
            isAvail,
            available,
        });
    } catch (error) {
        console.error("Error checking availability:", error);
        return res.status(500).json({
            success: false,
            message: "Error checking availability"
        });
    }
}


async function createBooking(req,res,next) {
    try {
        const {room,checkInDate,checkOutDate,guests,guestName,guestEmail,guestPhone,guestRemark,roomQuantity: qty} = req.body;
        const roomQuantity = Math.max(1, Math.floor(Number(qty) || 1));
        const user = req.user._id;
        const userRole = req.user.role;

        if (userRole === 'admin') {
            return res.status(403).json({
                success: false,
                message: "管理员不能预订酒店"
            });
        }

        const isAvail = await checkAvailability({checkInDate, checkOutDate, room, roomQuantity});
        if (!isAvail) {
            const available = await getAvailableQuantity({ checkInDate, checkOutDate, room });
            const message =
                available <= 0
                    ? "该房型在所选日期已订完，请选择其他日期或房型"
                    : `该房型库存不足，当前最多可订 ${available} 间`;
            return res.status(400).json({
                success: false,
                message,
                available,
            });
        }

        const roomData = await Room.findById(room)
                                   .populate('hotel');

        
        console.log(roomData)

        if (user.toString() === roomData.hotel.owner.toString()) {
            return res.status(403).json({
                success: false,
                message: "不能预订自己的酒店"
            });
        }

        const roomPrice = roomData.pricePerNight

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));
        const totalPrice = nights * roomPrice * roomQuantity;

        const booking = await Booking.create({
            user,
            room,
            roomQuantity,
            hotel: roomData.hotel._id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalPrice,
            guests:+guests,
            guestName: guestName || null,
            guestEmail: guestEmail || null,
            guestPhone: guestPhone || null,
            guestRemark: guestRemark || null,
        })

        // const mailOptions = {
        //     from:process.env.SENDER_MAIL,
        //     to:req.user.email,
        //     subject:"Hotel booking detail",
        //     html:`
        //     <h2>Booking Details</h2>
        //     <p>Dear ${req.user.username},</p>
        //     <p>Your booking at <strong>${roomData.hotel.name}</strong> has been confirmed.</p>
        //     <ul>
        //         <li><strong>Hotel:</strong> ${roomData.hotel.name}</li>
        //         <li><strong>Room:</strong> ${roomData.name}</li>
        //         <li><strong>Check-in Date:</strong> ${checkIn.toDateString()}</li>
        //         <li><strong>Check-out Date:</strong> ${checkOut.toDateString()}</li>
        //         <li><strong>Guests:</strong> ${guests}</li>
        //         <li><strong>Total Price:</strong> $${totalPrice}</li>
        //     </ul>
        //     <p>Thank you for booking with us!</p>`
        // }

        // console.log(mailOptions)

        // await transporter.sendMail(mailOptions);


        return res.status(201).json({
            success: true,
            message: "Booking created successfully",
            booking
        });
    } catch (error) {
        console.error("Error creating booking:", error);
        return res.status(500).json({
            success: false,
            message: "Error creating booking"
        });
    }
}


async function getUserBooking(req,res,next) {
    try {
        const userId = req.user._id;

        const bookings = await Booking.find({user: userId})
                                      .populate('room hotel')
                                      .sort({createdAt: -1});


        return res.status(200).json({
            success: true,
            bookings
        });
    } catch (error) {
        console.error("Error fetching user bookings:", error);
        return res.status(500).json({
            success: false,
            message: "Error fetching user bookings"
        });
    }
}


async function getHotelBooking(req,res) {
    // 商户后台仪表盘：获取商户名下所有酒店的预订
    const hotels = await Hotel.find({ owner: req.user._id }).select('_id');
    const hotelIds = hotels.map((h) => h._id);
    if (hotelIds.length === 0) {
        return res.status(200).json({
            success: true,
            dashboardData: {
                bookings: [],
                totalBookings: 0,
                totalRevenue: 0,
            },
            message: "Hotel not found for this owner",
        });
    }

    const bookings = await Booking.find({ hotel: { $in: hotelIds } })
        .populate('room hotel user')
        .sort({ createdAt: -1 })
        .lean();

    // 为每条订单计算该房型在对应日期区间的剩余可订数量（库存量会随预订更新）
    for (const b of bookings) {
        if (!b.room || b.status === 'cancelled' || b.isCompleted) continue;
        const overlapping = await Booking.find({
            room: b.room._id,
            status: { $ne: 'cancelled' },
            isCompleted: { $ne: true },
            checkInDate: { $lte: b.checkOutDate },
            checkOutDate: { $gte: b.checkInDate },
        }).select('roomQuantity').lean();
        const booked = overlapping.reduce((s, o) => s + (o.roomQuantity || 1), 0);
        b.availableDuringStay = Math.max(0, (b.room.roomCount ?? 1) - booked);
    }

    const completedBookings = bookings.filter((b) => b.isCompleted === true);
    const totalBookings = completedBookings.length;
    const totalRevenue = completedBookings.reduce((acc, b) => acc + (b.totalPrice || 0), 0);

    return res.status(200).json({
        success: true,
        dashboardData: {
            bookings,
            totalBookings,
            totalRevenue,
        },
    });
}


async function stripePayment(req,res) {
    try {
        const {bookingId} = req.body;

        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }
        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "订单已取消" });
        }
        if (booking.isPaid) {
            return res.status(400).json({ success: false, message: "订单已支付" });
        }
        if (isPaymentExpired(booking)) {
            await Booking.findByIdAndUpdate(bookingId, { status: "cancelled", cancelledBy: "system", cancelReason: "超时未支付自动取消" });
            return res.status(400).json({ success: false, message: "订单已超时取消（超过15分钟未支付），请重新预订" });
        }

        const room = await Room.findById(booking.room)
                               .populate('hotel');

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }


        const totalPrice = booking.totalPrice;

        const {origin} = req.headers;


        const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);


        const line_items = [
            {
                price_data:{
                    currency: 'usd',
                    product_data: {
                        name: room.hotel.name
                    },
                    unit_amount: totalPrice * 100
                },
                quantity: 1
            }
        ]

        const session = await stripeInstance.checkout.sessions.create({
            line_items,
            mode: 'payment',
            success_url:`${origin}/loader/my-bookings`,
            cancel_url:`${origin}/my-bookings`,
            metadata:{
                bookingId
            }
        })


        return res.status(200).json({
            success:true,
            url:session.url
        })

    } catch (error) {
        return res.status(500).json({
            success:false,
            message:"payment failed"
        })
    }
}

/** 获取扫码付款用的一次性 token，前端用此生成二维码链接 */
async function getPayQr(req, res) {
    try {
        const { id: bookingId } = req.params;
        const userId = req.user?._id;
        if (!userId) {
            return res.status(401).json({ success: false, message: "未登录" });
        }
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "订单不存在" });
        }
        // booking.user 是 String 类型，userId 可能是 ObjectId，统一转字符串比较
        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: "无权操作该订单" });
        }
        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "订单已取消" });
        }
        if (booking.isPaid) {
            return res.status(400).json({ success: false, message: "订单已支付" });
        }
        if (isPaymentExpired(booking)) {
            await Booking.findByIdAndUpdate(bookingId, { status: "cancelled", cancelledBy: "system", cancelReason: "超时未支付自动取消" });
            return res.status(400).json({ success: false, message: "订单已超时取消（超过15分钟未支付），请重新预订" });
        }
        const token = crypto.randomBytes(24).toString("hex");
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 分钟有效
        booking.paymentConfirmToken = token;
        booking.paymentConfirmTokenExpiresAt = expiresAt;
        await booking.save();
        // 返回完整支付链接，优先使用 PUBLIC_URL（部署时配置），确保二维码链接是公网地址
        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
        const payUrl = `${baseUrl}/pay-success?bookingId=${bookingId}&token=${token}`;
        return res.status(200).json({ success: true, token, payUrl });
    } catch (error) {
        console.error("getPayQr error:", error);
        console.error("Error stack:", error.stack);
        return res.status(500).json({ 
            success: false, 
            message: "获取支付二维码失败",
            error: process.env.NODE_ENV === "production" ? undefined : error.message
        });
    }
}

/** 手机扫码打开 pay-success 页后调用，校验 token 并标记订单已支付（无需登录） */
async function confirmPayment(req, res) {
    try {
        const { bookingId, token } = req.body || {};
        if (!bookingId || !token) {
            return res.status(400).json({ success: false, message: "缺少 bookingId 或 token" });
        }
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "订单不存在" });
        }
        if (booking.isPaid) {
            return res.status(200).json({ success: true, message: "已支付" });
        }
        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "订单已取消" });
        }
        if (isPaymentExpired(booking)) {
            await Booking.findByIdAndUpdate(bookingId, { status: "cancelled", cancelledBy: "system", cancelReason: "超时未支付自动取消" });
            return res.status(400).json({ success: false, message: "订单已超时取消（超过15分钟未支付），请重新预订" });
        }
        if (booking.paymentConfirmToken !== token) {
            return res.status(400).json({ success: false, message: "无效的支付链接" });
        }
        if (booking.paymentConfirmTokenExpiresAt && new Date() > booking.paymentConfirmTokenExpiresAt) {
            return res.status(400).json({ success: false, message: "支付链接已过期，请刷新订单页重新获取二维码" });
        }
        booking.isPaid = true;
        booking.paymentConfirmToken = null;
        booking.paymentConfirmTokenExpiresAt = null;
        await booking.save();
        return res.status(200).json({ success: true, message: "付款成功" });
    } catch (error) {
        console.error("confirmPayment error:", error);
        return res.status(500).json({ success: false, message: "确认支付失败" });
    }
}

async function cancelBooking(req, res) {
    try {
        const { id } = req.params;
        const { cancelReason } = req.body || {};
        const userId = req.user._id;

        const booking = await Booking.findById(id).populate('hotel');
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, message: '订单已取消' });
        }
        if (booking.isCompleted) {
            return res.status(400).json({ success: false, message: '已完成订单不可取消，请使用申请退款' });
        }

        const isUser = booking.user.toString() === userId.toString();
        const hotelId = booking.hotel._id || booking.hotel;
        const hotelDoc = booking.hotel && booking.hotel.owner ? booking.hotel : await Hotel.findById(hotelId);
        const isMerchant = hotelDoc && hotelDoc.owner && hotelDoc.owner.toString() === userId.toString();

        if (isUser) {
            const reason = (typeof cancelReason === 'string' && cancelReason.trim()) ? cancelReason.trim() : '未填写';
            booking.status = 'cancelled';
            booking.cancelledBy = 'user';
            booking.cancelReason = reason;
            await booking.save();
            return res.status(200).json({
                success: true,
                message: '订单已取消',
                booking,
            });
        }
        if (isMerchant) {
            booking.status = 'cancelled';
            booking.cancelledBy = 'merchant';
            booking.cancelReason = null;
            await booking.save();
            return res.status(200).json({
                success: true,
                message: '订单已取消',
                booking,
            });
        }
        return res.status(403).json({ success: false, message: '无权取消该订单' });
    } catch (error) {
        console.error('Error cancelling booking:', error);
        return res.status(500).json({ success: false, message: '取消订单失败' });
    }
}

// 用户：对已完成订单申请退款（需填写原因）
async function requestRefund(req, res) {
    try {
        const { id } = req.params;
        const { refundReason } = req.body || {};
        const userId = req.user._id;

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权操作该订单' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, message: '订单已取消' });
        }
        if (!booking.isCompleted) {
            return res.status(400).json({ success: false, message: '仅支持对已完成订单申请退款' });
        }
        if (booking.refundStatus === 'pending') {
            return res.status(400).json({ success: false, message: '已提交退款申请，请等待商家审核' });
        }
        if (booking.refundStatus === 'approved') {
            return res.status(400).json({ success: false, message: '该订单已退款' });
        }

        const reason = (typeof refundReason === 'string' && refundReason.trim()) ? refundReason.trim() : '';
        if (!reason) {
            return res.status(400).json({ success: false, message: '请填写退款原因' });
        }

        booking.refundRequested = true;
        booking.refundReason = reason;
        booking.refundStatus = 'pending';
        await booking.save();

        return res.status(200).json({
            success: true,
            message: '退款申请已提交，请等待商家审核',
            booking,
        });
    } catch (error) {
        console.error('Error requesting refund:', error);
        return res.status(500).json({ success: false, message: '提交退款申请失败' });
    }
}

// 用户：退款审核中时补充退款理由
async function supplementRefundReason(req, res) {
    try {
        const { id } = req.params;
        const { supplementalReason } = req.body || {};
        const userId = req.user._id;

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权操作该订单' });
        }
        if (booking.refundStatus !== 'pending') {
            return res.status(400).json({ success: false, message: '当前无待审核的退款申请' });
        }

        const add = (typeof supplementalReason === 'string' && supplementalReason.trim()) ? supplementalReason.trim() : '';
        if (!add) {
            return res.status(400).json({ success: false, message: '请填写补充内容' });
        }

        const sep = booking.refundReason ? '\n\n--- 补充 ---\n\n' : '';
        booking.refundReason = (booking.refundReason || '') + sep + add;
        await booking.save();

        return res.status(200).json({
            success: true,
            message: '退款理由已补充',
            booking,
        });
    } catch (error) {
        console.error('Error supplementing refund reason:', error);
        return res.status(500).json({ success: false, message: '补充失败' });
    }
}

// 商家：审核退款（通过/拒绝）
async function reviewRefund(req, res) {
    try {
        const { id } = req.params;
        const { action } = req.body || {}; // 'approve' | 'reject'
        const userId = req.user._id;

        const booking = await Booking.findById(id).populate('hotel');
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        const hotelId = booking.hotel._id || booking.hotel;
        const hotelDoc = booking.hotel && booking.hotel.owner ? booking.hotel : await Hotel.findById(hotelId);
        if (!hotelDoc || String(hotelDoc.owner) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权审核该订单的退款' });
        }
        if (booking.refundStatus !== 'pending') {
            return res.status(400).json({ success: false, message: '当前无待审核的退款申请' });
        }

        if (action === 'approve') {
            booking.status = 'cancelled';
            booking.cancelledBy = null;
            booking.cancelReason = booking.refundReason || '用户申请退款，商家已同意';
            booking.refundStatus = 'approved';
            booking.refundReviewedAt = new Date();
            booking.refundReviewedBy = userId;
            await booking.save();
            return res.status(200).json({
                success: true,
                message: '已同意退款',
                booking,
            });
        }
        if (action === 'reject') {
            booking.refundStatus = 'rejected';
            booking.refundReviewedAt = new Date();
            booking.refundReviewedBy = userId;
            await booking.save();
            return res.status(200).json({
                success: true,
                message: '已拒绝退款',
                booking,
            });
        }
        return res.status(400).json({ success: false, message: '请传 action: approve 或 reject' });
    } catch (error) {
        console.error('Error reviewing refund:', error);
        return res.status(500).json({ success: false, message: '审核退款失败' });
    }
}

// 用户：商家拒绝退款后，申请平台介入（填写原因后显示待平台审核中，流程结束）
async function requestPlatformRefundReview(req, res) {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const userId = req.user._id;

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }
        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权操作该订单' });
        }
        if (booking.refundStatus !== 'rejected') {
            return res.status(400).json({ success: false, message: '仅支持在商家拒绝退款后申请平台介入' });
        }
        if (booking.refundPlatformReviewRequested) {
            return res.status(400).json({ success: false, message: '已提交平台介入，请等待审核' });
        }

        const reasonStr = (typeof reason === 'string' && reason.trim()) ? reason.trim() : '';
        if (!reasonStr) {
            return res.status(400).json({ success: false, message: '请填写申请原因' });
        }

        booking.refundPlatformReviewRequested = true;
        booking.refundPlatformReviewReason = reasonStr;
        await booking.save();

        return res.status(200).json({
            success: true,
            message: '已提交平台介入，请等待平台审核',
            booking,
        });
    } catch (error) {
        console.error('Error requesting platform refund review:', error);
        return res.status(500).json({ success: false, message: '提交失败' });
    }
}

/** 商家：更新入住状态（待入住、已入住、已退房） */
async function updateStayStatus(req, res) {
    try {
        const { id } = req.params;
        const { stayStatus } = req.body || {};
        const userId = req.user._id;

        const booking = await Booking.findById(id).populate('hotel');
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        const hotelId = booking.hotel._id || booking.hotel;
        const hotelDoc = booking.hotel && booking.hotel.owner ? booking.hotel : await Hotel.findById(hotelId);
        if (!hotelDoc || String(hotelDoc.owner) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权修改该订单' });
        }
        if (booking.status === 'cancelled') {
            return res.status(400).json({ success: false, message: '已取消的订单不可修改入住状态' });
        }

        const allowed = ['pending_checkin', 'checked_in', 'checked_out'];
        if (!allowed.includes(stayStatus)) {
            return res.status(400).json({ success: false, message: '无效的入住状态' });
        }

        const current = booking.stayStatus || 'pending_checkin';
        if (current === 'checked_in' && stayStatus === 'pending_checkin') {
            return res.status(400).json({ success: false, message: '已入住后不能改回待入住' });
        }
        if (current === 'checked_out') {
            return res.status(400).json({ success: false, message: '已退房后不能修改状态' });
        }

        booking.stayStatus = stayStatus;
        if (stayStatus === 'checked_out') {
            booking.isCompleted = true;
        }
        await booking.save();

        return res.status(200).json({
            success: true,
            message: '入住状态已更新',
            booking,
        });
    } catch (error) {
        console.error('Error updating stay status:', error);
        return res.status(500).json({ success: false, message: '更新入住状态失败' });
    }
}

/** 商家：请求平台介入退款审核（在退款中时，商家可选择交由平台处理） */
async function merchantRequestPlatformIntervention(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(id).populate('hotel');
        if (!booking) {
            return res.status(404).json({ success: false, message: '订单不存在' });
        }

        const hotelId = booking.hotel._id || booking.hotel;
        const hotelDoc = booking.hotel && booking.hotel.owner ? booking.hotel : await Hotel.findById(hotelId);
        if (!hotelDoc || String(hotelDoc.owner) !== String(userId)) {
            return res.status(403).json({ success: false, message: '无权操作该订单' });
        }
        if (booking.refundStatus !== 'pending') {
            return res.status(400).json({ success: false, message: '当前无待审核的退款申请' });
        }

        booking.merchantRequestedPlatformIntervention = true;
        await booking.save();

        return res.status(200).json({
            success: true,
            message: '已提交平台介入，请等待平台审核',
            booking,
        });
    } catch (error) {
        console.error('Error requesting platform intervention:', error);
        return res.status(500).json({ success: false, message: '提交失败' });
    }
}

// 用户不可自主标记完成，仅商家在仪表盘选择「已退房」时订单会变为已完成
async function completeBooking(req, res) {
    return res.status(403).json({
        success: false,
        message: "订单完成由商家操作，请等待商家在后台标记已退房",
    });
}

export { checkAvailabilityApi, createBooking, getUserBooking, getHotelBooking, stripePayment, getPayQr, confirmPayment, cancelBooking, completeBooking, requestRefund, supplementRefundReason, reviewRefund, requestPlatformRefundReview, updateStayStatus, merchantRequestPlatformIntervention };