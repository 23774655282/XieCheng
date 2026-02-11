import Hotel from "../models/hotel.model.js";
import Room from "../models/room.model.js";

export const createRoom = async (req, res) => {
    try {
        const { roomType, pricePerNight, amenities, promoDiscount } = req.body;

        const hotel = await Hotel.findOne({ owner: req.user._id });

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        // 本地图片：由 multer 保存到 server/uploads/rooms 下，这里生成可访问的 URL
        let images = [];
        if (req.files && req.files.length > 0) {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            images = req.files.map((file) => `${baseUrl}/uploads/rooms/${file.filename}`);
        }


        let x;

        x = amenities ? JSON.parse(amenities) : [];

        console.log(x);


        const promoVal = promoDiscount !== undefined && promoDiscount !== "" ? Math.min(100, Math.max(0, Number(promoDiscount))) : null;
        const newRoom = await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight: +pricePerNight,
            amenties: x,
            images,
            promoDiscount: promoVal === 0 ? null : promoVal,
        });

        console.log(newRoom)


        return res.status(201).json({
            success: true,
            message: "Room created successfully",
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

/** 首页优惠档位：仅支持 20、25、30，按房间的 promoDiscount 字段匹配 */
const PROMO_VALUES = [20, 25, 30];

/** 用户端：仅返回已审核通过且未下线的酒店的房间，支持分页、按目的地筛选、按优惠档位（promo=20|25|30，按房间优惠百分比筛选） */
export const getRooms = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
        const destination = (req.query.destination || req.query.city || "").trim();
        const promo = req.query.promo ? parseInt(req.query.promo, 10) : null;

        const hotelFilter = { status: "approved" };
        if (destination) hotelFilter.city = new RegExp(destination, "i");
        const approvedHotelIds = await Hotel.find(hotelFilter).distinct("_id").then(ids => ids.map(id => id.toString()));
        const filter = { isAvailable: true, hotel: { $in: approvedHotelIds } };

        let rooms, total, hasMore;

        if (promo !== null && PROMO_VALUES.includes(promo)) {
            filter.promoDiscount = promo;
            const skip = (page - 1) * limit;
            [rooms, total] = await Promise.all([
                Room.find(filter)
                    .populate({
                        path: "hotel",
                        populate: { path: "owner", select: "avatar" },
                    })
                    .sort({ pricePerNight: 1, createdAt: -1 })
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
                    .sort({ pricePerNight: 1, createdAt: -1 })
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
        return res.status(200).json({ success: true, room });
    } catch (error) {
        console.error("Error fetching room:", error);
        return res.status(500).json({ success: false, message: "error in fetching room" });
    }
};

export const getOwnerRooms = async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ owner: req.user._id });

        if (!hotel) {
            return res.status(404).json({
                success: false,
                message: "Hotel not found"
            });
        }

        const rooms = await Room.find({
            hotel: hotel._id.toString()
        }).populate("hotel");

        return res.status(200).json({
            success: true,
            message: "Owner's rooms fetched successfully",
            rooms
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
        const hotel = await Hotel.findOne({ owner: req.user._id });
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Hotel not found" });
        }
        const room = await Room.findOne({ _id: id, hotel: hotel._id.toString() }).populate("hotel");
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        return res.status(200).json({ success: true, room });
    } catch (error) {
        console.error("Error fetching owner room:", error);
        return res.status(500).json({ success: false, message: "error in fetching room" });
    }
};


/** 商户编辑房间：仅当酒店已被管理员下线（status === 'offline'）时允许 */
export const updateRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ owner: req.user._id });
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Hotel not found" });
        }
        if (hotel.status !== "offline") {
            return res.status(403).json({
                success: false,
                message: "仅当酒店被管理员下线后才可以编辑房间",
            });
        }
        const room = await Room.findOne({ _id: id, hotel: hotel._id.toString() });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        const { roomType, pricePerNight, amenities, promoDiscount } = req.body;
        if (roomType !== undefined) room.roomType = roomType;
        if (pricePerNight !== undefined) room.pricePerNight = Number(pricePerNight);
        if (amenities !== undefined) {
            const list = typeof amenities === "string" ? JSON.parse(amenities) : amenities;
            room.amenties = Array.isArray(list) ? list : [];
        }
        if (promoDiscount !== undefined && promoDiscount !== "") {
            const val = Math.min(100, Math.max(0, Number(promoDiscount)));
            room.promoDiscount = val === 0 ? null : val;
        }
        if (req.files && req.files.length > 0) {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            room.images = req.files.map((f) => `${baseUrl}/uploads/rooms/${f.filename}`);
        }
        await room.save({ validateBeforeSave: false });
        // 编辑时至少保留原有图片或新图：若未传新图则上面未改 room.images
        return res.status(200).json({ success: true, message: "Room updated successfully", room });
    } catch (error) {
        console.error("Error updating room:", error);
        return res.status(500).json({ success: false, message: "error in updating room" });
    }
};

/** 商户删除自己的房间（仅能删自己酒店下的房间） */
export const deleteRoom = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ owner: req.user._id });
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Hotel not found" });
        }
        const room = await Room.findOne({ _id: id, hotel: hotel._id.toString() });
        if (!room) {
            return res.status(404).json({ success: false, message: "Room not found or not your room" });
        }
        await Room.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Room deleted successfully" });
    } catch (error) {
        console.error("Error deleting room:", error);
        return res.status(500).json({ success: false, message: "error in deleting room" });
    }
};

export const toggleRoomAvailability = async (req, res) => {
    try {

        console.log("Toggling room availability");
        const {roomId} = req.body;
        const _id = roomId;
        const room = await Room.findById(_id);

        if (!room) {
            return res.status(404).json({
                success: false,
                message: "Room not found"
            });
        }

        console.log(room)


        room.isAvailable = !room.isAvailable;

        await room.save({
            validateBeforeSave: false
        });


        return res.status(200).json({
            success: true,
            message: "Room availability toggled successfully",
            room
        });
    } catch (error) {
        console.error("Error toggling room availability:", error);
        return res.status(500).json({
            success: false,
            message: "error in toggling room availability"
        });
    }
}