import Stripe from "stripe";
import Booking from "../models/booking.model.js"

async function stripeWebhook(req,res) {
    const stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);

    const sig = req.headers["stripe-signature"];

    let event;

    try {
        event = stripeInstance.webhooks.constructEvent(req.body,sig,process.env.STRIPE_WEBHOOK_SECRET);

    } catch (error) {
        console.error("Error constructing webhook event:", error);
        return res.status(400).send(`Webhook Error: ${error.message}`);        
    }

    if (event.type === "payment_intent.succeeded") {
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;

        const session = await stripeInstance.checkout.sessions.list({
            payment_intent: paymentIntentId
        })

        const {bookingId} = session.data[0].metadata;

        await Booking.findByIdAndUpdate(bookingId,{
            isPaid: true,
            paymentMethod: "Stripe",
        })
    }else{
        console.warn(`Unhandled event type: ${event.type}`);
    }

    return res.status(200).json({received: true});
}

export default stripeWebhook;