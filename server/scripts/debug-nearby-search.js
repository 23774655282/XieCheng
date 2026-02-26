/**
 * 调试「附近酒店搜索」：排查胶囊酒店搜不到的原因
 * 使用: node scripts/debug-nearby-search.js (在 server 目录下运行)
 */
import { configDotenv } from "dotenv";
import mongoose from "mongoose";
import Hotel from "../models/hotel.model.js";
import Room from "../models/room.model.js";

configDotenv();

const SEARCH_LAT = 31.731634;
const SEARCH_LNG = 118.871181;
const NEARBY_KM = 12;

function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const run = async () => {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB 已连接\n");
    console.log("=== 搜索中心 ===");
    console.log(`lat=${SEARCH_LAT}, lng=${SEARCH_LNG}\n`);

    const hotel = await Hotel.findOne({ name: "胶囊酒店" }).lean();
    if (!hotel) {
        console.log("❌ 未找到「胶囊酒店」");
        process.exit(1);
    }

    console.log("=== 酒店信息 ===");
    console.log("_id:", hotel._id.toString());
    console.log("name:", hotel.name);
    console.log("status:", hotel.status, hotel.status === "approved" ? "✓ 已上架" : "✗ 需为 approved");
    console.log("latitude:", hotel.latitude ?? "null", hotel.latitude != null ? "✓" : "✗ 缺失");
    console.log("longitude:", hotel.longitude ?? "null", hotel.longitude != null ? "✓" : "✗ 缺失");

    if (hotel.latitude != null && hotel.longitude != null) {
        const dist = haversineKm(SEARCH_LAT, SEARCH_LNG, hotel.latitude, hotel.longitude);
        console.log("距搜索中心:", dist.toFixed(2), "km", dist <= NEARBY_KM ? "✓ 在范围内" : "✗ 超出 12km");
    }

    const rooms = await Room.find({ hotel: hotel._id.toString() }).lean();
    console.log("\n=== 房间列表 (共", rooms.length, "间) ===");
    rooms.forEach((r, i) => {
        console.log(`  [${i + 1}] roomType=${r.roomType}, isAvailable=${r.isAvailable}, status=${r.status ?? "(无)"}`);
        const ok = r.isAvailable && r.status !== "pending_audit";
        console.log(`      符合展示条件(isAvailable=true, status!=pending_audit): ${ok ? "✓" : "✗"}`);
    });

    const passFilter = rooms.filter((r) => r.isAvailable && r.status !== "pending_audit");
    console.log("\n=== 结论 ===");
    if (hotel.status !== "approved") {
        console.log("❌ 酒店未上架 (status 需为 approved)");
    } else if (hotel.latitude == null || hotel.longitude == null) {
        console.log("❌ 酒店缺少经纬度");
    } else {
        const dist = haversineKm(SEARCH_LAT, SEARCH_LNG, hotel.latitude, hotel.longitude);
        if (dist > NEARBY_KM) {
            console.log("❌ 酒店超出 12km 范围");
        } else if (passFilter.length === 0) {
            console.log("❌ 无符合展示条件的房间 (需 isAvailable=true 且 status!=pending_audit)");
            console.log("   若房间为待审核(pending_audit)，需管理员在「房间上架申请」中通过");
        } else {
            console.log("✓ 酒店与房间均符合条件，理论上应出现在搜索结果中");
        }
    }
    process.exit(0);
};

run().catch((e) => {
    console.error(e);
    process.exit(1);
});
