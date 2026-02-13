import Hotel from "../models/hotel.model.js";
import Room from "../models/room.model.js";
import OpenAI from "openai";

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
        if (destination) {
            const re = new RegExp(destination, "i");
            hotelFilter.$or = [{ city: re }, { name: re }];
        }
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
};

const SMART_SEARCH_SYSTEM = `你是一个酒店预订助手的解析器。用户会用自然语言描述出行需求，可能不规范（如只说"我和我朋友去"、"一家四口"、景点名等），你需要理解真实意图并推断合理默认值。
请只输出一个 JSON 对象，不要输出任何其他文字、解释或 markdown 标记。
JSON 必须包含且仅包含以下 6 个字段（均为数字或字符串）：

1. destination: 目的地**城市名称**。
   - 若用户说的是景点、地标或俗称，请解析为所在城市。例如：中山陵→南京，外滩/塔里木外滩/上海外滩→上海，天安门/故宫→北京，西湖→杭州，兵马俑→西安，夫子庙→南京。
   - 若用户本轮未提及且存在上一轮条件则保留上一轮值，否则填空字符串 ""。

2. adults: 成人数，数字。从"我和我朋友"、"两人"等推断为 2；未提及则保留上一轮或填 1。

3. children: 儿童数，数字。从"一家四口带两个小孩"等推断；未提及则保留上一轮或填 0。

4. nights: 入住晚数，数字。未提及则保留上一轮或填 1。

5. budget: 酒店总预算（单位：元），数字。未提及则保留上一轮或填 0。

6. roomType: 推荐房型。根据人数与关系推断，**只能**从以下四选一填写，无法推断时填空字符串 ""：
   - "Single Bed"：一人、单人出行
   - "Double Bed"：两人、情侣、朋友、夫妻（如"我和我朋友"、"两个人"）
   - "Luxury Room"：明确要豪华、高端
   - "Family Suite"：一家多口、带小孩、家庭出游（如"一家四口"、"带两个孩子"）

若请求中带有「上一轮条件」，则在上一轮基础上只更新用户本轮提到或可推断的字段，未提到的保持上一轮的值。`;

/** 智能搜索：用 OpenAI 解析用户自然语言，再按条件筛选房间；支持多轮对话，可传 previousCriteria 合并上一轮条件 */
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
        if (!apiKey) {
            return res.status(503).json({
                success: false,
                message: "智能搜索暂未配置（缺少 AI_API_KEY），请联系管理员",
            });
        }
        const baseURL = process.env.AI_API_BASE_URL || "https://api.deepseek.com/v1";
        const model = process.env.AI_CHAT_MODEL || "deepseek-chat";
        const client = new OpenAI({ apiKey, baseURL });
        const completion = await client.chat.completions.create({
            model,
            messages: [
                { role: "system", content: SMART_SEARCH_SYSTEM },
                { role: "user", content: userContent },
            ],
            response_format: { type: "json_object" },
            temperature: 0.2,
        });
        const raw = completion.choices[0]?.message?.content;
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
        const prev = previousCriteria && typeof previousCriteria === "object" ? previousCriteria : {};
        const destStr = String(criteria.destination ?? "").trim();
        const destination = destStr || prev.destination || null;
        const parseNum = (val, fallback) => { const n = parseInt(val, 10); return Number.isNaN(n) ? (fallback != null ? Number(fallback) : null) : n; };
        const adults = Math.max(0, parseNum(criteria.adults, prev.adults) || 1);
        const children = Math.max(0, parseNum(criteria.children, prev.children) || 0);
        const nights = Math.max(1, parseNum(criteria.nights, prev.nights) || 1);
        const budget = Math.max(0, parseNum(criteria.budget, prev.budget) || 0);
        const VALID_ROOM_TYPES = ["Single Bed", "Double Bed", "Luxury Room", "Family Suite"];
        const rawRoomType = String(criteria.roomType ?? prev.roomType ?? "").trim();
        const roomType = VALID_ROOM_TYPES.includes(rawRoomType) ? rawRoomType : null;
        const criteriaOut = { destination: destination || null, adults, children, nights, budget: budget || null, roomType };
        const hotelFilter = { status: "approved" };
        if (destination) hotelFilter.city = new RegExp(destination, "i");
        const approvedHotelIds = await Hotel.find(hotelFilter).distinct("_id").then((ids) => ids.map((id) => id.toString()));
        const roomFilter = { isAvailable: true, hotel: { $in: approvedHotelIds } };
        if (roomType) roomFilter.roomType = roomType;
        if (budget > 0 && nights >= 1) {
            const maxPricePerNight = Math.floor(budget / nights);
            roomFilter.pricePerNight = { $lte: maxPricePerNight };
        }
        const rooms = await Room.find(roomFilter)
            .populate({ path: "hotel" })
            .sort({ pricePerNight: 1, createdAt: -1 })
            .limit(50)
            .lean();
        return res.status(200).json({
            success: true,
            criteria: criteriaOut,
            rooms,
            total: rooms.length,
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