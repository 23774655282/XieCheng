import mongoose from "mongoose";
import Hotel from "../models/hotel.model.js";
import Room from "../models/room.model.js";
import RoomEditApplication from "../models/roomEditApplication.model.js";
import OpenAI from "openai";
import { searchSimilarRooms, generateRecommendationReasons } from "../services/rag.service.js";
import { emitReasons } from "../ws.js";

/** 推荐理由缓存：key = reasonsCacheKey，value = { roomId: reason }，供「换一批」时优先读取 */
const reasonsCache = new Map();
const REASONS_CACHE_TTL_MS = 30 * 60 * 1000;

export const createRoom = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities, promoDiscount, roomCount, hotelId } = req.body;

        let hotel;
        if (hotelId) {
            hotel = await Hotel.findOne({ _id: hotelId, owner: req.user._id });
        } else {
            hotel = await Hotel.findOne({ owner: req.user._id });
        }

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        // 本地图片：由 multer 保存到 server/uploads/rooms 下，这里生成可访问的 URL
        let images = [];
        if (req.files && req.files.length > 0) {
            const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
            images = req.files.map((file) => `${baseUrl}/uploads/rooms/${file.filename}`);
        }


        let x;

        x = amenities ? JSON.parse(amenities) : [];

        console.log(x);


        const promoVal = promoDiscount !== undefined && promoDiscount !== "" ? Math.min(100, Math.max(0, Number(promoDiscount))) : null;
        const countVal = roomCount != null && Number(roomCount) >= 1 ? Math.max(1, Math.floor(Number(roomCount))) : 1;
        // 已上架酒店新增房型需再审核，待审核/待上架酒店新增房型随酒店一并审核
        const hotelApproved = hotel.status === "approved";
        const newRoom = await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: +pricePerNight,
            amenties: Array.isArray(x) ? x : [],
            images,
            promoDiscount: promoVal === 0 ? null : promoVal,
            roomCount: countVal,
            status: hotelApproved ? "pending_audit" : "approved",
        });

        console.log(newRoom)


        return res.status(201).json({
            success: true,
            message: hotelApproved ? "房间已提交，等待管理员审核上架" : "房间已添加",
            room: {
                hotel: hotel._id,
                roomType,
                pricePerNight,
                amenities,
                images
            }
        });

    } catch (error) {
        console.error("Error creating room:", error);
        res.status(500).json({
            success: false,
            message: "error in creating room"
        });
    }
}


const DEFAULT_PAGE_SIZE = 12;
const NEARBY_KM = 12; // 12km，略大于 10km 以应对坐标系偏差和边界误差

/** 转义正则特殊字符，避免用户输入导致正则异常 */
function escapeRegex(str) {
    return String(str || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** 后置过滤：对向量检索结果按用户硬性条件（目的地、预算、房型）过滤，保持向量相似度顺序 */
function filterRoomsByCriteria(rooms, criteria) {
    if (!rooms?.length) return [];
    const { destination, nights, budget, roomType } = criteria || {};
    const maxPricePerNight = budget > 0 && nights >= 1 ? Math.floor(budget / nights) : null;
    let destRe = null;
    if (destination && String(destination).trim()) {
        destRe = new RegExp(escapeRegex(destination.trim()), "i");
    }
    return rooms.filter((r) => {
        if (destRe) {
            const hotel = r.hotel;
            const city = hotel?.city || "";
            const name = hotel?.name || "";
            const address = hotel?.address || "";
            if (!destRe.test(city) && !destRe.test(name) && !destRe.test(address)) return false;
        }
        if (maxPricePerNight != null && maxPricePerNight >= 0) {
            const effectivePrice = (r.promoDiscount != null && r.promoDiscount > 0)
                ? Math.round(r.pricePerNight * (1 - r.promoDiscount / 100))
                : r.pricePerNight;
            if (effectivePrice > maxPricePerNight) return false;
        }
        if (roomType) {
            if (r.roomType !== roomType) return false;
        }
        return true;
    });
}

/** Haversine 球面距离（km） */
function haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/** 限时优惠筛选：promo 为 1–100 的整数，表示「优惠力度 ≥ promo%」的房间（即 promoDiscount >= promo 且 promoDiscount 有效） */
const PROMO_MIN = 1;
const PROMO_MAX = 100;

/** 用户端：仅返回已审核通过且未下线的酒店的房间，支持分页、按目的地筛选、按限时优惠（promo=1–100，展示优惠力度≥该值的房间）、按中心点 10km 内筛选 */
export const getRooms = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
        const destination = (req.query.destination || req.query.city || "").trim();
        const promoRaw = req.query.promo != null && req.query.promo !== "" ? parseInt(req.query.promo, 10) : null;
        const promo = Number.isFinite(promoRaw) && promoRaw >= PROMO_MIN && promoRaw <= PROMO_MAX ? promoRaw : null;
        const searchLat = req.query.lat != null ? parseFloat(req.query.lat) : null;
        const searchLng = req.query.lng != null ? parseFloat(req.query.lng) : null;
        const useNearby = Number.isFinite(searchLat) && Number.isFinite(searchLng);

        let approvedHotelIds;
        let hotelIdToDistance = {};

        if (useNearby) {
            const hotels = await Hotel.find({ status: "approved", latitude: { $exists: true, $ne: null }, longitude: { $exists: true, $ne: null } }).lean();
            const withDist = hotels
                .map((h) => ({ id: h._id.toString(), lat: h.latitude, lng: h.longitude, dist: haversineKm(searchLat, searchLng, h.latitude, h.longitude) }))
                .filter((x) => x.dist <= NEARBY_KM)
                .sort((a, b) => a.dist - b.dist);
            approvedHotelIds = withDist.map((x) => x.id);
            withDist.forEach((x) => { hotelIdToDistance[x.id] = x.dist; });
        } else {
            const hotelFilter = { status: "approved" };
            if (destination) {
                const re = new RegExp(escapeRegex(destination), "i");
                hotelFilter.$or = [{ city: re }, { name: re }, { address: re }];
            }
            approvedHotelIds = await Hotel.find(hotelFilter).distinct("_id").then(ids => ids.map(id => id.toString()));
        }
        // 只排除待审核房间，兼容旧数据：无 status 或 status 非 pending_audit 的房型均可展示
        const filter = {
            isAvailable: true,
            hotel: { $in: approvedHotelIds },
            status: { $ne: "pending_audit" },
        };

        let rooms, total, hasMore;
        const sortByPrice = { pricePerNight: 1, createdAt: -1 };

        if (useNearby && approvedHotelIds.length > 0) {
            const allRooms = await Room.find(filter)
                .populate({
                    path: "hotel",
                    populate: { path: "owner", select: "avatar" },
                })
                .lean();
            allRooms.sort((a, b) => {
                const hidA = (a.hotel?._id || a.hotel)?.toString?.() || "";
                const hidB = (b.hotel?._id || b.hotel)?.toString?.() || "";
                const dA = hotelIdToDistance[hidA] ?? 999999;
                const dB = hotelIdToDistance[hidB] ?? 999999;
                if (dA !== dB) return dA - dB;
                return (a.pricePerNight ?? 0) - (b.pricePerNight ?? 0);
            });
            total = allRooms.length;
            const skip = (page - 1) * limit;
            rooms = allRooms.slice(skip, skip + limit).map((r) => {
                const hid = (r.hotel?._id || r.hotel)?.toString?.() || "";
                const dist = hotelIdToDistance[hid];
                return { ...r, distanceKm: dist != null ? Math.round(dist * 10) / 10 : undefined };
            });
            hasMore = skip + rooms.length < total;
        } else if (promo !== null) {
            // 限时优惠：展示优惠力度 ≥ promo% 的房间（promoDiscount 为数字且 >= promo）
            filter.$and = [
                { promoDiscount: { $ne: null } },
                { promoDiscount: { $gte: promo } },
            ];
            const skip = (page - 1) * limit;
            [rooms, total] = await Promise.all([
                Room.find(filter)
                    .populate({
                        path: "hotel",
                        populate: { path: "owner", select: "avatar" },
                    })
                    .sort(sortByPrice)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Room.countDocuments(filter),
            ]);
            hasMore = skip + rooms.length < total;
        } else {
            const skip = (page - 1) * limit;
            [rooms, total] = await Promise.all([
                Room.find(filter)
                    .populate({
                        path: "hotel",
                        populate: { path: "owner", select: "avatar" },
                    })
                    .sort(sortByPrice)
                    .skip(skip)
                    .limit(limit)
                    .lean(),
                Room.countDocuments(filter),
            ]);
            hasMore = skip + rooms.length < total;
        }

        return res.status(200).json({
            success: true,
            message: "Rooms fetched successfully",
            rooms,
            total,
            page,
            hasMore,
        });
    } catch (error) {
        console.error("Error fetching rooms:", error);
        return res.status(500).json({
            success: false,
            message: "error in fetching rooms",
        });
    }
};

/** 用户端：根据 id 获取单间（仅已审核酒店） */
export const getRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findById(id).populate("hotel");
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        const hotel = await Hotel.findById(room.hotel._id || room.hotel);
        if (!hotel || hotel.status !== "approved") return res.status(404).json({ success: false, message: "Room not found" });
        if (room.status === "pending_audit") return res.status(404).json({ success: false, message: "Room not found" });
        return res.status(200).json({ success: true, room });
    } catch (error) {
        console.error("Error fetching room:", error);
        return res.status(500).json({ success: false, message: "error in fetching room" });
    }
};

/** 商户：获取名下房间列表，分页：每页 10 或 20 条 */
export const getOwnerRooms = async (req, res) => {
    try {
        const { hotelId: queryHotelId, page: pageStr, limit: limitStr } = req.query;
        const page = Math.max(1, parseInt(pageStr, 10) || 1);
        const rawLimit = parseInt(limitStr, 10);
        const limit = rawLimit === 20 ? 20 : 10;
        let hotel;
        if (queryHotelId) {
            hotel = await Hotel.findOne({ _id: queryHotelId, owner: req.user._id });
        } else {
            hotel = await Hotel.findOne({ owner: req.user._id });
        }

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        const roomFilter = { hotel: hotel._id.toString() };
        const totalCount = await Room.countDocuments(roomFilter);
        let rooms = await Room.find(roomFilter)
            .populate("hotel")
            .sort({ pricePerNight: 1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();

        const roomEdits = await RoomEditApplication.find({ hotel: hotel._id, status: "pending" })
            .sort({ updatedAt: -1 })
            .lean();
        const editMap = {};
        for (const re of roomEdits) {
            const rid = String(re.room);
            if (!editMap[rid]) editMap[rid] = re;
        }
        rooms = rooms.map((r) => {
            const edit = editMap[String(r._id)];
            if (!edit) return r;
            const merged = { ...r };
            if (edit.roomType !== undefined) merged.roomType = edit.roomType;
            if (edit.pricePerNight !== undefined) merged.pricePerNight = edit.pricePerNight;
            if (edit.amenties !== undefined) merged.amenties = edit.amenties;
            if (edit.promoDiscount !== undefined) merged.promoDiscount = edit.promoDiscount;
            if (edit.roomCount !== undefined) merged.roomCount = edit.roomCount;
            if (edit.images && edit.images.length > 0) merged.images = edit.images;
            if (edit.isAvailable !== undefined) merged.isAvailable = edit.isAvailable;
            return merged;
        });

        return res.status(200).json({
            success: true,
            message: "Owner's rooms fetched successfully",
            rooms,
            totalCount,
            page,
            limit
        });
    } catch (error) {
        console.error("Error fetching owner's rooms:", error);
        return res.status(500).json({
            success: false,
            message: "error in fetching owner's rooms"
        });
    }
};

/** 商户端：根据 id 获取单间（仅能查自己酒店下的房间，不要求酒店已审核/上线，用于编辑） */
export const getOwnerRoomById = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findById(id).populate("hotel");
        if (!room || !room.hotel) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        if (room.hotel.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        return res.status(200).json({ success: true, room });
    } catch (error) {
        console.error("Error fetching owner room:", error);
        return res.status(500).json({ success: false, message: "error in fetching room" });
    }
};


/** 商户编辑房间：编辑后需管理员审核（当酒店在线时创建待审核修改，离线时直接更新） */
export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findById(id).populate("hotel");
        if (!room || !room.hotel) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        const hotel = room.hotel;
        if (hotel.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        const { roomType, pricePerNight, amenities, promoDiscount } = req.body;
        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;

        if (hotel.status !== "approved" && hotel.status !== "pending_list") {
            // 酒店未上架时直接更新
            if (roomType !== undefined) room.roomType = roomType;
            if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
            if (amenities !== undefined) {
                const list = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
                room.amenties = Array.isArray(list) ? list : [];
            }
            if (promoDiscount !== undefined && promoDiscount !== "") {
                const val = Math.min(100, Math.max(0, Number(promoDiscount)));
                room.promoDiscount = val === 0 ? null : val;
            } else if (promoDiscount === "" || promoDiscount === null) room.promoDiscount = null;
            if (req.body.roomCount !== undefined) {
                const c = Math.max(1, Math.floor(Number(req.body.roomCount) || 1));
                room.roomCount = c;
            }
            if (req.files && req.files.length > 0) {
                room.images = req.files.map((f) => `${baseUrl}/uploads/rooms/${f.filename}`);
            }
            await room.save({ validateBeforeSave: false });
            return res.status(200).json({ success: true, message: "房间已更新", room });
        }

        // 酒店在线时提交待审核
        const updates = {};
        if (roomType !== undefined) updates.roomType = roomType;
        if (pricePerNight !== undefined) updates.pricePerNight = Number(pricePerNight);
        if (amenities !== undefined) {
            const list = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
            updates.amenties = Array.isArray(list) ? list : [];
        }
        if (promoDiscount !== undefined) {
            updates.promoDiscount = promoDiscount === "" || promoDiscount == null ? null : Math.min(100, Math.max(0, Number(promoDiscount)));
        }
        if (req.body.roomCount !== undefined) updates.roomCount = Math.max(1, Math.floor(Number(req.body.roomCount) || 1));
        if (req.files && req.files.length > 0) updates.images = req.files.map((f) => `${baseUrl}/uploads/rooms/${f.filename}`);

        const existing = await RoomEditApplication.findOne({ room: id, hotel: hotel._id, status: "pending" });
        if (existing) {
            Object.assign(existing, updates);
            await existing.save();
        } else {
            await RoomEditApplication.create({ room: id, hotel: hotel._id, ...updates, status: "pending" });
        }
        return res.status(200).json({ success: true, message: "修改已提交，等待再审核（管理员以最后一次提交为准）", needsApproval: true });
    } catch (error) {
        console.error("Error updating room:", error);
        return res.status(500).json({ success: false, message: "error in updating room" });
    }
};

/** 商户删除自己的房间（仅能删自己酒店下的房间） */
export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findById(id).populate("hotel");
        if (!room || !room.hotel) {
            return res.status(404).json({ success: false, message: "Room not found" });
        }
        if (room.hotel.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        await Room.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        return res.status(500).json({ success: false, message: "error in deleting room" });
    }
};

/** 商户切换房间上架/下架。下架直接生效；上架时酒店已上架需管理员审核 */
export const toggleRoomAvailability = async (req, res) => {
    try {
        const { roomId } = req.body;
        const room = await Room.findById(roomId);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        const hotel = await Hotel.findById(room.hotel);
        if (!hotel || hotel.owner.toString() !== req.user._id.toString()) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        const newAvailable = !room.isAvailable;
        // 下架直接生效；上架时酒店已上架需管理员审核
        const needApproval = newAvailable && (hotel.status === "approved" || hotel.status === "pending_list");
        if (needApproval) {
            const existing = await RoomEditApplication.findOne({ room: roomId, hotel: hotel._id, status: "pending" });
            const preserveAmenties = Array.isArray(room.amenties) ? room.amenties : [];
            if (existing) {
                existing.isAvailable = newAvailable;
                // 上架时保留房间原有设施：无 amenties 或空数组且房间有设施时，写入保留
                const wouldClear = existing.amenties === undefined || (Array.isArray(existing.amenties) && existing.amenties.length === 0);
                if (wouldClear && preserveAmenties.length > 0) existing.amenties = preserveAmenties;
                await existing.save();
            } else {
                await RoomEditApplication.create({ room: roomId, hotel: hotel._id, isAvailable: newAvailable, amenties: preserveAmenties, status: "pending" });
            }
            return res.status(200).json({
                success: true,
                message: "上架申请已提交，等待管理员审核",
                needsApproval: true,
                room: { ...room.toObject(), isAvailable: newAvailable },
            });
        }
        room.isAvailable = newAvailable;
        await room.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, message: newAvailable ? "已上架" : "已下架", room });
    } catch (error) {
        console.error("Error toggling room availability:", error);
        return res.status(500).json({ success: false, message: "error in toggling room availability" });
    }
};

/** 商户更新房间优惠幅度（0-100，null 表示无优惠）。酒店已上架时需管理员审核 */
export const updatePromoDiscount = async (req, res) => {
    try {
        const { id } = req.params;
        const { promoDiscount } = req.body;
        const room = await Room.findById(id);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        const hotel = await Hotel.findById(room.hotel);
        if (!hotel || hotel.owner.toString() !== req.user._id.toString()) return res.status(404).json({ success: false, message: "Room not found or not your room" });
        const val = promoDiscount == null || promoDiscount === "" ? null : Math.min(100, Math.max(0, Math.floor(Number(promoDiscount) || 0)));
        if (hotel.status === "approved" || hotel.status === "pending_list") {
            const existing = await RoomEditApplication.findOne({ room: id, hotel: hotel._id, status: "pending" });
            if (existing) {
                existing.promoDiscount = val === 0 ? null : val;
                await existing.save();
            } else {
                await RoomEditApplication.create({ room: id, hotel: hotel._id, promoDiscount: val, status: "pending" });
            }
            return res.status(200).json({ success: true, message: "修改已提交，等待再审核（管理员以最后一次提交为准）", needsApproval: true });
        }
        room.promoDiscount = val === 0 ? null : val;
        await room.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, message: "优惠幅度已更新", room });
    } catch (error) {
        console.error("Error updating promo discount:", error);
        return res.status(500).json({ success: false, message: "更新优惠幅度失败" });
    }
};

/** 商户更新房间数量。酒店已上架时需管理员审核 */
export const updateRoomCount = async (req, res) => {
    try {
        const { id } = req.params;
        const { roomCount } = req.body;
        const room = await Room.findById(id);
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });
        const hotel = await Hotel.findById(room.hotel);
        if (!hotel || hotel.owner.toString() !== req.user._id.toString()) return res.status(404).json({ success: false, message: "Room not found or not your room" });
        const c = Math.max(1, Math.floor(Number(roomCount) || 1));
        if (hotel.status === "approved" || hotel.status === "pending_list") {
            const existing = await RoomEditApplication.findOne({ room: id, hotel: hotel._id, status: "pending" });
            if (existing) {
                existing.roomCount = c;
                await existing.save();
            } else {
                await RoomEditApplication.create({ room: id, hotel: hotel._id, roomCount: c, status: "pending" });
            }
            return res.status(200).json({ success: true, message: "修改已提交，等待再审核（管理员以最后一次提交为准）", needsApproval: true });
        }
        room.roomCount = c;
        await room.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, message: "房间数量已更新", room });
    } catch (error) {
        console.error("Error updating room count:", error);
        return res.status(500).json({
            success: false,
            message: "更新房间数量失败"
        });
    }
};

/** 管理员：列出房间修改申请（支持 status 筛选：''|pending|approved|rejected） */
export const listRoomEditApplications = async (req, res) => {
    try {
        const { status } = req.query;
        const statusFilter = status ? { status } : { status: { $in: ["pending", "approved", "rejected"] } };
        let apps = await RoomEditApplication.find(statusFilter)
            .populate("room")
            .populate({ path: "hotel", model: "Hotel", select: "name owner", populate: { path: "owner", select: "username phone" } })
            .sort({ createdAt: -1 })
            .lean();
        if (!status) {
            const statusOrder = { pending: 0, approved: 1, rejected: 2 };
            apps.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || new Date(b.createdAt) - new Date(a.createdAt));
        }
        return res.status(200).json({ success: true, applications: apps });
    } catch (error) {
        console.error("Error listing room edit applications:", error);
        return res.status(500).json({ success: false, message: "获取列表失败" });
    }
};

/** 管理员：通过房间修改申请 */
export const approveRoomEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const app = await RoomEditApplication.findById(id);
        if (!app || app.status !== "pending") {
            return res.status(404).json({ success: false, message: "申请不存在或已处理" });
        }
        const room = await Room.findById(app.room);
        if (!room) {
            return res.status(404).json({ success: false, message: "房间不存在" });
        }
        if (app.roomType !== undefined) room.roomType = app.roomType;
        if (app.pricePerNight !== undefined) room.pricePerNight = app.pricePerNight;
        if (app.amenties !== undefined) room.amenties = app.amenties;
        if (app.promoDiscount !== undefined) room.promoDiscount = app.promoDiscount;
        if (app.roomCount !== undefined) room.roomCount = app.roomCount;
        if (app.images && app.images.length > 0) room.images = app.images;
        if (app.isAvailable !== undefined) room.isAvailable = app.isAvailable;
        await room.save({ validateBeforeSave: false });
        app.status = "approved";
        app.reviewedAt = new Date();
        app.reviewedBy = req.user._id;
        await app.save();
        return res.status(200).json({ success: true, message: "已通过", room });
    } catch (error) {
        console.error("Error approving room edit:", error);
        return res.status(500).json({ success: false, message: "操作失败" });
    }
};

/** 管理员：列出房间上架申请（仅新增房型 Room.status=pending_audit/approved；已有房间的上架走 RoomEditApplication，在「再审核（酒店信息）」处理）。支持 status 筛选与分页 */
export const listPendingRoomAdds = async (req, res) => {
    try {
        const { status, page: pageStr, limit: limitStr } = req.query;
        const page = Math.max(1, parseInt(pageStr, 10) || 1);
        const rawLimit = parseInt(limitStr, 10);
        const limit = rawLimit === 20 ? 20 : 10;
        const statusFilter = status ? { status } : { status: { $in: ["pending_audit", "approved"] } };
        const totalCount = await Room.countDocuments(statusFilter);
        let rooms = await Room.find(statusFilter)
            .populate({ path: "hotel", select: "name city owner", populate: { path: "owner", select: "username phone" } })
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .lean();
        if (!status) {
            const statusOrder = { pending_audit: 0, approved: 1 };
            rooms.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || new Date(b.createdAt) - new Date(a.createdAt));
        }
        return res.status(200).json({ success: true, rooms, totalCount, page, limit });
    } catch (error) {
        console.error("Error listing pending room adds:", error);
        return res.status(500).json({ success: false, message: "获取列表失败" });
    }
};

/** 管理员：通过房间上架申请 */
export const approveRoomAdd = async (req, res) => {
    try {
        const { id } = req.params;
        const room = await Room.findById(id);
        if (!room) return res.status(404).json({ success: false, message: "房间不存在" });
        if (room.status !== "pending_audit") return res.status(400).json({ success: false, message: "该房间已处理" });
        room.status = "approved";
        await room.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, message: "已通过上架" });
    } catch (error) {
        console.error("Error approving room add:", error);
        return res.status(500).json({ success: false, message: "操作失败" });
    }
};

/** 管理员：驳回房间上架申请（删除待审核房间，商户可重新提交） */
export const rejectRoomAdd = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const room = await Room.findById(id);
        if (!room) return res.status(404).json({ success: false, message: "房间不存在" });
        if (room.status !== "pending_audit") return res.status(400).json({ success: false, message: "该房间已处理" });
        await Room.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "已驳回" });
    } catch (error) {
        console.error("Error rejecting room add:", error);
        return res.status(500).json({ success: false, message: "操作失败" });
    }
};

/** 管理员：驳回房间修改申请 */
export const rejectRoomEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const app = await RoomEditApplication.findById(id);
        if (!app || app.status !== "pending") {
            return res.status(404).json({ success: false, message: "申请不存在或已处理" });
        }
        app.status = "rejected";
        app.rejectReason = reason || "未填写原因";
        app.reviewedAt = new Date();
        app.reviewedBy = req.user._id;
        await app.save();
        return res.status(200).json({ success: true, message: "已驳回" });
    } catch (error) {
        console.error("Error rejecting room edit:", error);
        return res.status(500).json({ success: false, message: "操作失败" });
    }
};

const SMART_SEARCH_SYSTEM = `你是一个酒店预订助手的解析器。用户会用自然语言描述出行需求，可能不规范（如只说"我和我朋友去"、"一家四口"、景点名等），你需要理解真实意图并推断合理默认值。
请只输出一个 JSON 对象，不要输出任何其他文字、解释或 markdown 标记。
JSON 必须包含以下 7 个字段（均为数字或字符串）：

1. destination: 目的地**城市名称**。
   - 若用户说的是景点、地标或俗称，请解析为所在城市。例如：中山陵→南京，外滩/塔里木外滩/上海外滩→上海，天安门/故宫→北京，西湖→杭州，兵马俑→西安，夫子庙→南京。
   - 若用户本轮未提及且存在上一轮条件则保留上一轮值，否则填空字符串 ""。

2. adults: 成人数，数字。从"我和我朋友"、"两人"等推断为 2；未提及则保留上一轮或填 1。

3. children: 儿童数，数字。从"一家四口带两个小孩"等推断；未提及则保留上一轮或填 0。

4. nights: 入住晚数，数字。未提及则保留上一轮或填 1。

5. budget: 酒店总预算（单位：元），数字。未提及则保留上一轮或填 0。**填 0 表示不限制预算**。

6. roomType: 推荐房型。根据人数与关系推断，从以下选一填写，无法推断时填空字符串 ""：
   - "Single Bed"：一人、单人出行
   - "Double Bed"：两人、情侣、朋友、夫妻
   - "King Bed" / "Elegant King Bed" / "Premium King Bed" / "Comfortable King Bed" / "Deluxe King Bed" / "Cozy King Bed"：大床类（雅致、高端、舒适、豪华、温馨等）
   - "View King Bed" / "Sea View Room"：观景、海景
   - "Business King Bed" / "Standard Room"：商务、标准间
   - "Suite" / "Luxury Room"：套房、豪华房
   - "Family Suite"：一家多口、带小孩、家庭出游

**合并规则**：若请求中带有「上一轮条件」，则在上一轮基础上只更新用户本轮提到或可推断的字段，未提到的保持上一轮的值。

**重置/放宽规则（重要）**：当用户表示要重新开始、换地方、放宽条件时，**未在本轮明确提及的字段应填 0 或空字符串**，不沿用上一轮。同时必须设置 resetScope 字段：
- resetScope: "all" — 用户说"随便看看"、"重新推荐"、"重新来"、"不要之前的条件"时，完全重置，所有字段按本轮填，未说的填默认值。
- resetScope: "destination" — 用户说"换一个地方"、"去上海吧"、"改成北京"等**更换目的地**时，destination 填新城市，budget 和 roomType 若未提及则填 0 和 ""。
- resetScope: "none" — 正常多轮补充，沿用上一轮未提及的字段。

7. resetScope: 字符串，必填。"all" | "destination" | "none"。`;

/** 智能搜索：纯向量检索，将用户问题向量化后与房间文档做语义相似度匹配；支持多轮对话，可传 previousCriteria 合并上一轮条件（用于展示） */
export const smartSearchRooms = async (req, res) => {
    try {
        const query = (req.body?.query || "").trim();
        if (!query) {
            return res.status(400).json({ success: false, message: "请输入您的出行需求" });
        }
        const previousCriteria = req.body?.previousCriteria || null;
        let userContent = query;
        if (previousCriteria && typeof previousCriteria === "object") {
            const prev = previousCriteria;
            const parts = [];
            if (prev.destination) parts.push(`目的地=${prev.destination}`);
            if (prev.adults != null) parts.push(`成人数=${prev.adults}`);
            if (prev.children != null) parts.push(`儿童数=${prev.children}`);
            if (prev.nights != null) parts.push(`晚数=${prev.nights}`);
            if (prev.budget != null && prev.budget > 0) parts.push(`预算=${prev.budget}元`);
            if (prev.roomType) parts.push(`房型=${prev.roomType}`);
            if (parts.length > 0) userContent = `【上一轮条件】${parts.join("，")}\n【用户本轮说】${query}`;
        }
        const apiKey = process.env.AI_API_KEY;
        const reasonApiKey = process.env.AI_REASON_API_KEY || apiKey;
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "智能搜索暂未配置（缺少 AI_API_KEY），请联系管理员",
            });
        }
        const baseURL = process.env.AI_API_BASE_URL || "https://api.deepseek.com/v1";
        const reasonBaseURL = process.env.AI_REASON_BASE_URL || baseURL;
        const model = process.env.AI_CHAT_MODEL || "deepseek-chat";
        const reasonModel = process.env.AI_REASON_MODEL || "qwen-turbo";
        const embeddingModel = process.env.AI_EMBEDDING_MODEL || "deepseek-embedding-v2";
        const embeddingBaseURL = process.env.AI_EMBEDDING_BASE_URL || process.env.AI_API_BASE_URL || "https://api.deepseek.com/v1";
        const embeddingApiKey = process.env.AI_EMBEDDING_API_KEY || apiKey;

        // 并行执行：LLM 意图解析 + 向量检索
        const client = new OpenAI({ apiKey, baseURL });
        const [completionRes, similarRooms] = await Promise.all([
            client.chat.completions.create({
                model,
                messages: [
                    { role: "system", content: SMART_SEARCH_SYSTEM },
                    { role: "user", content: userContent },
                ],
                response_format: { type: "json_object" },
                temperature: 0.2,
            }),
            searchSimilarRooms(query, 50, embeddingApiKey, embeddingBaseURL, embeddingModel).catch(() => []),
        ]);

        const raw = completionRes.choices[0]?.message?.content;
        if (!raw) {
            return res.status(502).json({ success: false, message: "AI 未返回有效结果，请重试" });
        }
        let criteria;
        try {
            const str = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();
            criteria = JSON.parse(str);
        } catch (e) {
            console.error("Smart search parse error:", raw, e);
            return res.status(502).json({ success: false, message: "解析结果格式异常，请换一种说法重试" });
        }
        const resetScope = String(criteria.resetScope ?? "none").trim();
        const prev = (resetScope === "all" || !previousCriteria || typeof previousCriteria !== "object")
            ? {}
            : previousCriteria;
        const destStr = String(criteria.destination ?? "").trim();
        const destination = destStr || (resetScope === "all" ? null : prev.destination) || null;
        const parseNum = (val, fallback) => { const n = parseInt(val, 10); return Number.isNaN(n) ? (fallback != null ? Number(fallback) : null) : n; };
        const adults = Math.max(0, parseNum(criteria.adults, prev.adults) || 1);
        const children = Math.max(0, parseNum(criteria.children, prev.children) || 0);
        const nights = Math.max(1, parseNum(criteria.nights, prev.nights) || 1);
        const budgetSource = (resetScope === "destination" || resetScope === "all") ? criteria.budget : (criteria.budget ?? prev.budget);
        const budgetOut = Math.max(0, parseNum(budgetSource, 0) || 0);
        const VALID_ROOM_TYPES = [
            "Single Bed", "Double Bed", "King Bed", "Elegant King Bed", "Premium King Bed", "Comfortable King Bed",
            "Deluxe King Bed", "Cozy King Bed", "View King Bed", "Business King Bed", "Business Room", "Standard Room",
            "Sea View Room", "Suite", "Luxury Room", "Family Suite",
        ];
        const rawRoomType = String((resetScope === "destination" || resetScope === "all") ? (criteria.roomType ?? "") : (criteria.roomType ?? prev.roomType ?? "")).trim();
        const roomType = VALID_ROOM_TYPES.includes(rawRoomType) ? rawRoomType : null;
        const criteriaOut = { destination: destination || null, adults, children, nights, budget: budgetOut || null, roomType };

        // 后置过滤：保证满足用户硬性条件（目的地、预算、房型）
        const roomsFiltered = filterRoomsByCriteria(similarRooms, criteriaOut);

        // 最多取 24 个房型（8 批 × 3 个，供前端「换一批」轮流展示）
        const roomsFinal = roomsFiltered.slice(0, 24);

        // 首屏只生成 3 条，立即返回；后台继续异步生成其余房型的推荐理由
        const ROOMS_PER_BATCH = 3;
        const initialRooms = roomsFinal.slice(0, ROOMS_PER_BATCH);
        let reasonsMap = {};
        try {
            reasonsMap = await generateRecommendationReasons(initialRooms, query, criteriaOut, reasonApiKey, reasonBaseURL, reasonModel);
        } catch (_) {
            // 理由生成失败时不影响主流程
        }

        const reasonsCacheKey = `reasons:${query}:${roomsFinal.map((r) => String(r._id)).join(",")}`;
        reasonsCache.set(reasonsCacheKey, { ...reasonsMap, _ts: Date.now() });

        // 后台并行生成其余房型的推荐理由（不阻塞响应），完成时通过 WebSocket 主动推送
        const remainingRooms = roomsFinal.slice(ROOMS_PER_BATCH);
        if (remainingRooms.length > 0) {
            (async () => {
                const BATCH = 3;
                const batches = [];
                for (let i = 0; i < remainingRooms.length; i += BATCH) {
                    batches.push(remainingRooms.slice(i, i + BATCH));
                }
                const results = await Promise.allSettled(
                    batches.map(async (batch) => {
                        const value = await generateRecommendationReasons(batch, query, criteriaOut, reasonApiKey, reasonBaseURL, reasonModel);
                        if (value && typeof value === "object") {
                            emitReasons(reasonsCacheKey, value);
                        }
                        return value;
                    })
                );
                const cached = reasonsCache.get(reasonsCacheKey);
                if (cached && typeof cached === "object" && cached._ts) {
                    const { _ts, ...rest } = cached;
                    for (const result of results) {
                        if (result.status === "fulfilled" && result.value && typeof result.value === "object") {
                            Object.assign(rest, result.value);
                        } else if (result.status === "rejected") {
                            console.error("[RAG] 后台推荐理由生成失败:", result.reason?.message);
                        }
                    }
                    reasonsCache.set(reasonsCacheKey, { ...rest, _ts: Date.now() });
                }
            })().catch(() => {});
        }

        const roomsWithReasons = roomsFinal.map((r) => ({
            ...r,
            recommendationReason: reasonsMap[String(r._id)] || null,
        }));

        return res.status(200).json({
            success: true,
            criteria: criteriaOut,
            rooms: roomsWithReasons,
            total: roomsWithReasons.length,
            reasonsCacheKey,
        });
    } catch (error) {
        const errMsg = error?.message || String(error);
        const errCode = error?.code || error?.status;
        console.error("Smart search error:", errCode, errMsg);
        let msg = "智能搜索失败，请稍后重试";
        if (error?.status === 401 || errMsg?.includes("401")) msg = "AI 服务认证失败，请检查 .env 中的 AI_API_KEY 是否正确";
        else if (error?.status === 402 || errMsg?.includes("402") || errMsg?.includes("Insufficient Balance"))
            msg = "AI 账户余额不足，请前往 DeepSeek 控制台充值后再试";
        else if (errMsg?.includes("timed out") || errMsg?.includes("timeout") || errCode === "ETIMEDOUT")
            msg = "连接 AI 服务超时，请检查网络后重试";
        else if (errCode === "ENOTFOUND" || errCode === "ECONNREFUSED" || errCode === "ECONNRESET" || errMsg?.includes("fetch") || errMsg?.includes("ECONNREFUSED"))
            msg = "无法连接 AI 服务，请检查网络或 API 配置";
        else if (errMsg) msg = errMsg;
        return res.status(500).json({ success: false, message: msg });
    }
};

/** 按需获取指定房型的推荐理由（供「换一批」时调用）；优先从缓存读取，缓存未命中则生成 */
export const getRecommendationReasons = async (req, res) => {
    try {
        const roomIds = req.body?.roomIds;
        const query = (req.body?.query || "").trim();
        const criteria = req.body?.criteria || {};
        const reasonsCacheKey = req.body?.reasonsCacheKey;
        if (!Array.isArray(roomIds) || roomIds.length === 0 || !query) {
            return res.status(400).json({ success: false, message: "缺少 roomIds 或 query" });
        }
        let reasonsMap = {};
        if (reasonsCacheKey) {
            const cached = reasonsCache.get(reasonsCacheKey);
            if (cached && typeof cached === "object" && cached._ts) {
                if (Date.now() - cached._ts < REASONS_CACHE_TTL_MS) {
                    const { _ts, ...rest } = cached;
                    for (const id of roomIds) {
                        const sid = String(id);
                        if (rest[sid]) reasonsMap[sid] = rest[sid];
                    }
                } else {
                    reasonsCache.delete(reasonsCacheKey);
                }
            }
        }
        const needIds = roomIds.filter((id) => !reasonsMap[String(id)]);
        if (needIds.length === 0) {
            return res.status(200).json({ success: true, reasons: reasonsMap });
        }
        const apiKey = process.env.AI_API_KEY;
        const reasonApiKey = process.env.AI_REASON_API_KEY || apiKey;
        if (!apiKey) {
            return res.status(503).json({ success: false, message: "智能搜索暂未配置" });
        }
        const baseURL = process.env.AI_API_BASE_URL || "https://api.deepseek.com/v1";
        const reasonBaseURL = process.env.AI_REASON_BASE_URL || baseURL;
        const reasonModel = process.env.AI_REASON_MODEL || "qwen-turbo";
        const ids = needIds.slice(0, 10).map((id) => {
            try {
                return new mongoose.Types.ObjectId(id);
            } catch {
                return null;
            }
        }).filter(Boolean);
        if (ids.length === 0) {
            return res.status(200).json({ success: true, reasons: reasonsMap });
        }
        const rooms = await Room.find({ _id: { $in: ids } }).populate("hotel").lean();
        if (rooms.length > 0) {
            try {
                const generated = await generateRecommendationReasons(rooms, query, criteria, reasonApiKey, reasonBaseURL, reasonModel);
                Object.assign(reasonsMap, generated);
                if (reasonsCacheKey) {
                    const cached = reasonsCache.get(reasonsCacheKey);
                    if (cached && typeof cached === "object" && cached._ts) {
                        const { _ts, ...rest } = cached;
                        reasonsCache.set(reasonsCacheKey, { ...rest, ...generated, _ts: Date.now() });
                    }
                }
            } catch (err) {
                console.error("[RAG] getRecommendationReasons error:", err?.message);
            }
        }
        return res.status(200).json({ success: true, reasons: reasonsMap });
    } catch (error) {
        console.error("getRecommendationReasons error:", error?.message);
        return res.status(500).json({ success: false, message: "获取推荐理由失败" });
    }
};