import Hotel from "../models/hotel.model.js";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";

/** 用户端：获取单家已审核酒店及其房型（房型按价格从低到高） */
export const getHotelPublicById = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ _id: id, status: "approved" });
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        const rooms = await Room.find({ hotel: id.toString() }).sort({ pricePerNight: 1 });
        return res.status(200).json({ success: true, hotel, rooms });
    } catch (error) {
        console.error("Error fetching hotel:", error);
        res.status(500).json({ success: false, message: "error in fetching hotel" });
    }
};

/** 用户端：仅返回已审核且未下线的酒店（支持城市、星级等筛选） */
export const listHotelsPublic = async (req, res) => {
    try {
        const { city, starRating, page = 1, limit = 20 } = req.query;
        const filter = { status: "approved" };
        if (city) filter.city = new RegExp(city, "i");
        if (starRating) filter.starRating = Number(starRating);
        const skip = (Math.max(1, Number(page)) - 1) * Math.min(50, Math.max(1, Number(limit)));
        const hotels = await Hotel.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(Math.min(50, Math.max(1, Number(limit))));
        const total = await Hotel.countDocuments(filter);
        return res.status(200).json({ success: true, hotels, total });
    } catch (error) {
        console.error("Error listing public hotels:", error);
        res.status(500).json({ success: false, message: "error in listing hotels" });
    }
};

/** 用户端：地图用，按当前视野范围（bounds）返回已审核酒店，支持可选筛选 city、starRating */
export const listHotelsForMap = async (req, res) => {
    try {
        const { minLat, maxLat, minLng, maxLng, city, starRating } = req.query;
        const filter = { status: "approved" };
        const minLatN = parseFloat(minLat);
        const maxLatN = parseFloat(maxLat);
        const minLngN = parseFloat(minLng);
        const maxLngN = parseFloat(maxLng);
        const hasValidBounds =
            Number.isFinite(minLatN) && Number.isFinite(maxLatN) && Number.isFinite(minLngN) && Number.isFinite(maxLngN);
        if (hasValidBounds) {
            filter.latitude = { $gte: Math.min(minLatN, maxLatN), $lte: Math.max(minLatN, maxLatN) };
            filter.longitude = { $gte: Math.min(minLngN, maxLngN), $lte: Math.max(minLngN, maxLngN) };
        } else {
            return res.status(200).json({ success: true, hotels: [] });
        }
        if (city && String(city).trim()) filter.city = new RegExp(String(city).trim(), "i");
        if (starRating != null && starRating !== "") {
            const r = Number(starRating);
            if (Number.isFinite(r)) filter.starRating = r;
        }
        const hotels = await Hotel.find(filter)
            .select("name address city starRating images latitude longitude")
            .sort({ updatedAt: -1 })
            .limit(500)
            .lean();
        const withPosition = hotels.map((h) => ({ ...h, _lat: h.latitude, _lng: h.longitude }));
        return res.status(200).json({ success: true, hotels: withPosition });
    } catch (error) {
        console.error("Error listing hotels for map:", error);
        return res.status(500).json({ success: false, message: "error in listing hotels for map" });
    }
};

/** 用户端：获取当前所有已审核酒店的所在地（城市列表，去重） */
export const getCities = async (req, res) => {
    try {
        const cities = await Hotel.find({ status: "approved" }).distinct("city");
        const sorted = [...cities].filter(Boolean).sort((a, b) => String(a).localeCompare(String(b)));
        return res.status(200).json({ success: true, cities: sorted });
    } catch (error) {
        console.error("Error fetching cities:", error);
        return res.status(500).json({ success: false, message: "error in fetching cities" });
    }
};

/** 商户：注册酒店，初始状态为待审核 */
export const registerHotel = async (req, res) => {
    try {
        const { name, nameEn, address, contact, city, starRating, openTime, nearbyAttractions, promotions } = req.body;
        const owner = req.user._id;

        const existing = await Hotel.findOne({ owner });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: "You have already registered a hotel",
            });
        }

        const newHotel = await Hotel.create({
            name,
            nameEn: nameEn || "",
            address,
            contact,
            owner,
            city,
            starRating: starRating ? Number(starRating) : 3,
            openTime: openTime || undefined,
            nearbyAttractions: Array.isArray(nearbyAttractions) ? nearbyAttractions : (nearbyAttractions ? [nearbyAttractions] : []),
            promotions: Array.isArray(promotions) ? promotions : (promotions ? [promotions] : []),
            status: "pending_audit",
        });

        await User.findByIdAndUpdate(owner, { $set: { role: "merchant" } }, { new: true });

        return res.status(201).json({
            success: true,
            message: "Hotel registered successfully, pending admin audit",
            hotel: newHotel,
        });
    } catch (error) {
        console.error("Error registering hotel:", error);
        res.status(500).json({
            success: false,
            message: "error in registering hotel",
        });
    }
};

/** 商户：获取自己的酒店（用于编辑） */
export const getMyHotel = async (req, res) => {
    try {
        const hotel = await Hotel.findOne({ owner: req.user._id });
        if (!hotel) {
            return res.status(404).json({ success: false, message: "Hotel not found" });
        }
        return res.status(200).json({ success: true, hotel });
    } catch (error) {
        console.error("Error fetching hotel:", error);
        res.status(500).json({ success: false, message: "error in fetching hotel" });
    }
};

/** 从 body 中解析数组字段（支持 JSON 字符串，如 FormData 提交） */
function parseBodyArray(val) {
    if (Array.isArray(val)) return val;
    if (typeof val === "string") {
        try {
            const p = JSON.parse(val);
            return Array.isArray(p) ? p : [];
        } catch (_) {}
    }
    return val ? [val] : [];
}

/** 商户：更新酒店信息（保存后实时更新），支持上传酒店图片 */
export const updateHotel = async (req, res) => {
    try {
        const { name, nameEn, address, contact, city, starRating, openTime, nearbyAttractions, promotions, existingImages, latitude, longitude } = req.body;

        let hotel = await Hotel.findOne({ owner: req.user._id });

        // 处理酒店图片：保留已有 URL + 本次新上传
        let imageUrls = [];
        if (existingImages) {
            try {
                const parsed = typeof existingImages === "string" ? JSON.parse(existingImages) : existingImages;
                if (Array.isArray(parsed)) imageUrls = parsed;
            } catch (_) {}
        }
        if (req.files && req.files.length > 0) {
            const baseUrl = `${req.protocol}://${req.get("host")}`;
            const newUrls = req.files.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`);
            imageUrls = [...imageUrls, ...newUrls];
        }
        if (hotel) hotel.images = imageUrls;

        const nearArr = parseBodyArray(nearbyAttractions);
        const promArr = parseBodyArray(promotions);

        // 如果当前商户还没有酒店，视为首次保存，直接创建一条酒店记录
        if (!hotel) {
            const owner = req.user._id;
            const latVal = latitude === "" || latitude == null ? null : Number(latitude);
            const lngVal = longitude === "" || longitude == null ? null : Number(longitude);
            hotel = await Hotel.create({
                owner,
                name,
                nameEn: nameEn || "",
                address,
                contact,
                city,
                starRating: starRating ? Number(starRating) : 3,
                openTime: openTime || undefined,
                nearbyAttractions: nearArr,
                promotions: promArr,
                status: "pending_audit",
                images: imageUrls.length > 0 ? imageUrls : [],
                latitude: Number.isFinite(latVal) ? latVal : null,
                longitude: Number.isFinite(lngVal) ? lngVal : null,
            });

            // 首次创建酒店时，将用户角色设为商户
            await User.findByIdAndUpdate(owner, { $set: { role: "merchant" } }, { new: true });

            return res.status(201).json({
                success: true,
                message: "Hotel created successfully, pending admin audit",
                hotel,
            });
        }

        // 已有酒店：执行更新
        if (name !== undefined) hotel.name = name;
        if (nameEn !== undefined) hotel.nameEn = nameEn;
        if (address !== undefined) hotel.address = address;
        if (contact !== undefined) hotel.contact = contact;
        if (city !== undefined) hotel.city = city;
        if (starRating !== undefined) hotel.starRating = Number(starRating);
        if (openTime !== undefined) hotel.openTime = openTime ? new Date(openTime) : undefined;
        if (nearbyAttractions !== undefined) hotel.nearbyAttractions = nearArr;
        if (promotions !== undefined) hotel.promotions = promArr;
        if (latitude !== undefined) {
            const v = latitude === "" || latitude == null ? null : Number(latitude);
            hotel.latitude = Number.isFinite(v) ? v : null;
        }
        if (longitude !== undefined) {
            const v = longitude === "" || longitude == null ? null : Number(longitude);
            hotel.longitude = Number.isFinite(v) ? v : null;
        }
        hotel.images = imageUrls;
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel updated successfully", hotel });
    } catch (error) {
        console.error("Error updating hotel:", error);
        res.status(500).json({ success: false, message: "error in updating hotel" });
    }
};

/** 管理员：获取所有酒店（用于审核/发布/下线列表） */
export const listHotelsForAudit = async (req, res) => {
    try {
        const { status } = req.query; // 可选筛选 pending_audit | approved | rejected | offline
        const filter = status ? { status } : {};
        const hotels = await Hotel.find(filter)
            .populate("owner", "username email")
            .sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, hotels });
    } catch (error) {
        console.error("Error listing hotels for audit:", error);
        res.status(500).json({ success: false, message: "error in listing hotels" });
    }
};

/** 管理员：审核通过 */
export const approveHotel = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        hotel.status = "approved";
        hotel.rejectReason = "";
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel approved", hotel });
    } catch (error) {
        console.error("Error approving hotel:", error);
        res.status(500).json({ success: false, message: "error in approving hotel" });
    }
};

/** 管理员：审核不通过，需填写原因 */
export const rejectHotel = async (req, res) => {
    try {
        const { hotelId, rejectReason } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        hotel.status = "rejected";
        hotel.rejectReason = rejectReason || "未填写原因";
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel rejected", hotel });
    } catch (error) {
        console.error("Error rejecting hotel:", error);
        res.status(500).json({ success: false, message: "error in rejecting hotel" });
    }
};

/** 管理员：下线（可恢复，非删除） */
export const setHotelOffline = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        if (hotel.status !== "approved") {
            return res.status(400).json({ success: false, message: "Only approved hotels can be set offline" });
        }
        hotel.status = "offline";
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel set offline", hotel });
    } catch (error) {
        console.error("Error setting hotel offline:", error);
        res.status(500).json({ success: false, message: "error in setting hotel offline" });
    }
};

/** 管理员：恢复已下线的酒店 */
export const restoreHotel = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        if (hotel.status !== "offline") {
            return res.status(400).json({ success: false, message: "Only offline hotels can be restored" });
        }
        hotel.status = "approved";
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel restored", hotel });
    } catch (error) {
        console.error("Error restoring hotel:", error);
        res.status(500).json({ success: false, message: "error in restoring hotel" });
    }
};
