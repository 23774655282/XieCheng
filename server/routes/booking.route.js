import express from "express";
import { checkAvailabilityApi, createBooking, getHotelBooking, getUserBooking, stripePayment, getPayQr, confirmPayment, cancelBooking, completeBooking, requestRefund, reviewRefund, requestPlatformRefundReview } from "../controllers/booking.controller.js";
import {authMiddleware} from "../middlewares/auth.middleware.js"
const bookingRouter = express.Router();

bookingRouter.post("/check-availability",checkAvailabilityApi);
bookingRouter.post("/book",authMiddleware,createBooking);
bookingRouter.get("/user",authMiddleware,getUserBooking);
bookingRouter.get("/hotel",authMiddleware,getHotelBooking);
bookingRouter.post("/stripe-payment",authMiddleware,stripePayment);
bookingRouter.post("/confirm-payment", confirmPayment);
bookingRouter.get("/:id/pay-qr", authMiddleware, getPayQr);
bookingRouter.patch("/:id/cancel", authMiddleware, cancelBooking);
bookingRouter.patch("/:id/complete", authMiddleware, completeBooking);
bookingRouter.post("/:id/request-refund", authMiddleware, requestRefund);
bookingRouter.patch("/:id/review-refund", authMiddleware, reviewRefund);
bookingRouter.post("/:id/request-platform-refund-review", authMiddleware, requestPlatformRefundReview);

export default bookingRouter;