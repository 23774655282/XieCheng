/**
 * 迁移脚本：将 status 为 offline 的酒店统一改为 pending_list（待上架）
 * 执行：node scripts/migrate-offline-to-pending-list.js
 */
import mongoose from "mongoose";
import Hotel from "../server/models/hotel.model.js";
import "dotenv/config";

async function migrate() {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/trip");
    const result = await Hotel.updateMany({ status: "offline" }, { $set: { status: "pending_list" } });
    console.log(`已迁移 ${result.modifiedCount} 家酒店：offline → pending_list`);
    await mongoose.disconnect();
}

migrate().catch((e) => {
    console.error(e);
    process.exit(1);
});
