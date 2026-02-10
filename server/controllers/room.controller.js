import Hotel from "../models/hotel.model.js";
import Room from "../models/room.model.js";

export const createRoom = async (req, res) => {
    try {
        const {roomType,pricePerNight,amenities} = req.body;

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


        const newRoom=await Room.create({
            hotel: hotel._id,
            roomType,
            pricePerNight:+pricePerNight,
            amenties: x,
            images
        })

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

/** 用户端：仅返回已审核通过且未下线的酒店的房间，房型按价格从低到高，支持分页（上滑加载） */
export const getRooms = async (req, res) => {
    try {
        const page = Math.max(1, parseInt(req.query.page) || 1);
        const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || DEFAULT_PAGE_SIZE));
        const skip = (page - 1) * limit;

        const approvedHotelIds = await Hotel.find({ status: "approved" }).distinct("_id").then(ids => ids.map(id => id.toString()));
        const filter = { isAvailable: true, hotel: { $in: approvedHotelIds } };

        const [rooms, total] = await Promise.all([
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

        return res.status(200).json({
            success: true,
            message: "Rooms fetched successfully",
            rooms,
            total,
            page,
            hasMore: skip + rooms.length < total,
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
}


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