
import Booking from "../models/booking.model.js";
import Room from "../models/room.model.js";
import Hotel from "../models/hotel.model.js";
import transporter from "../utils/mailer.js";
import Stripe from "stripe";
import crypto from "crypto";

async function checkAvailability({ checkInDate, checkOutDate, room }) {
    // 只把「未取消且未完成」的订单视为占用；已完成的订单视为已退房，该房间对应日期可再次预订
    const bookings = await Booking.find({
        room,
        status: { $ne: 'cancelled' },
        isCompleted: { $ne: true },
        checkInDate: { $lte: checkOutDate },
        checkOutDate: { $gte: checkInDate },
    });
    const isAvail = bookings.length === 0;
    return isAvail;
}


async function checkAvailabilityApi(req,res) {
    try {
        const {checkInDate, checkOutDate, room} = req.body;

        console.log(checkInDate,checkOutDate,room)

        const isAvail = await checkAvailability({checkInDate, checkOutDate, room});

        return res.status(200).json({
            success: true,
            message: isAvail ? "Room is available" : "Room is not available",
            isAvail
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
        const {room,checkInDate,checkOutDate,guests} = req.body;
        const user = req.user._id;


        const isAvail = await checkAvailability({checkInDate, checkOutDate, room});


        console.log(isAvail)

        if (!isAvail) {
            return res.status(400).json({
                success: false,
                message: "Room is not available for the selected dates"
            });
        }

        const roomData = await Room.findById(room)
                                   .populate('hotel');

        
        console.log(roomData)

        if (user.toString() === roomData.hotel.owner.toString()) {
            console.warn("User is the owner of the room, cannot book own room");
            return res.status(404).json({
                success: false,
                message: "You are not authorized to book this room"
            });
            
        }

        const roomPrice = roomData.pricePerNight

        const checkIn = new Date(checkInDate);
        const checkOut = new Date(checkOutDate);

        const nights = Math.ceil((checkOut - checkIn) / (1000 * 60 * 60 * 24));

        console.log("Nights:", nights)



        const totalPrice = nights * roomPrice;

        const booking = await Booking.create({
            user,
            room,
            hotel: roomData.hotel._id,
            checkInDate: checkIn,
            checkOutDate: checkOut,
            totalPrice,
            guests:+guests,
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
    // 商户后台仪表盘：即使没有酒店或没有订单，也返回 200，前端显示 0 即可
    const hotel = await Hotel.findOne({ owner: req.user._id });
    if (!hotel) {
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

    const bookings = await Booking.find({ hotel: hotel._id })
        .populate('room hotel user')
        .sort({ createdAt: -1 });

    const totalBookings = bookings.length;
    const totalRevenue = bookings.reduce((acc, booking) => acc + booking.totalPrice, 0);

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

        const booking = await Booking.findById(bookingId)
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
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

// 用户：标记订单已完成（入住结束后）
async function completeBooking(req, res) {
    try {
        const { id } = req.params;
        const userId = req.user._id;

        const booking = await Booking.findById(id);
        if (!booking) {
            return res.status(404).json({ success: false, message: "订单不存在" });
        }
        if (String(booking.user) !== String(userId)) {
            return res.status(403).json({ success: false, message: "无权操作该订单" });
        }
        if (booking.status === "cancelled") {
            return res.status(400).json({ success: false, message: "已取消的订单无法标记完成" });
        }
        if (!booking.isPaid) {
            return res.status(400).json({ success: false, message: "未支付的订单无法标记完成" });
        }
        if (booking.isCompleted) {
            return res.status(200).json({ success: true, message: "订单已是完成状态", booking });
        }

        booking.isCompleted = true;
        await booking.save();

        return res.status(200).json({
            success: true,
            message: "订单已标记为完成",
            booking,
        });
    } catch (error) {
        console.error("Error completing booking:", error);
        return res.status(500).json({ success: false, message: "标记订单完成失败" });
    }
}

export { checkAvailabilityApi, createBooking, getUserBooking, getHotelBooking, stripePayment, getPayQr, confirmPayment, cancelBooking, completeBooking, requestRefund, reviewRefund, requestPlatformRefundReview };