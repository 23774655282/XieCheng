/**
 * 删除状态为 rejected 且无申请人来源的房间修改申请
 * 使用: node scripts/deleteOrphanRoomEdit.js (在 server 目录下运行)
 */
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import RoomEditApplication from "../models/roomEditApplication.model.js";
import Hotel from "../models/hotel.model.js";

configDotenv();

const connectDB = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB 已连接");
};

const run = async () => {
    await connectDB();
    const rejected = await RoomEditApplication.find({ status: "rejected" }).lean();
    console.log("已驳回的房间修改申请共", rejected.length, "条");
    for (const app of rejected) {
        const hotel = await Hotel.findById(app.hotel).select("owner").lean();
        const hasApplicant = hotel?.owner != null;
        if (!hasApplicant) {
            console.log("删除无申请人来源的记录:", app._id);
            await RoomEditApplication.findByIdAndDelete(app._id);
            console.log("已删除");
        } else {
            console.log("保留（有申请人）:", app._id);
        }
    }
    await mongoose.disconnect();
    console.log("完成");
};

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
