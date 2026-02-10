import express from 'express';
import { Webhook } from 'svix';
import User from '../models/user.model.js'; // Assuming you have this

const router = express.Router();

router.post('/webhook', async (req, res) => {


 const whook = new Webhook(process.env.CLERK_WEBHOOK_SECRET);

        await whook.verify(JSON.stringify(req.body), {
            "svix-id": req.headers["svix-id"],
            "svix-timestamp": req.headers["svix-timestamp"],
            "svix-signature": req.headers["svix-signature"]
        })

        const {data, type} = req.body;

    try {

        if (type === 'user.created') {
            const {id,email_addresses, first_name, last_name,image_url } = data;
            const email = email_addresses[0]?.email_address;

            await User.create({
                _id: id,
                email,
                username: first_name+' ' + last_name,
                avatar:image_url
            });

            console.log(`User ${email} created.`);

            return res.status(200).json({ success: true,
                message: `User ${email} created successfully.`
            });
        } else if (type === "user.deleted") {
            const { id } = data;
            await User.deleteOne({ _id: id });
            return res.status(200).json({ success: true, message: `User deleted.` });
        }
    } catch (err) {
        console.error('Webhook signature failed:', err.message);
        res.status(400).json({ error: 'Invalid signature' });
    }
});

export default router;
