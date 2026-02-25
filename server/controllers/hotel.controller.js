import Hotel from "../models/hotel.model.js";
import HotelPreReviewApplication from "../models/hotelPreReviewApplication.model.js";
import HotelSupplementEdit from "../models/hotelSupplementEdit.model.js";
import RoomEditApplication from "../models/roomEditApplication.model.js";
import User from "../models/user.model.js";
import Room from "../models/room.model.js";

/** 用户端：获取单家已审核酒店及其房型（房型按价格从低到高） */
export const getHotelPublicById = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ _id: id, status: "approved" });
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        const rooms = await Room.find({ hotel: id.toString(), status: { $ne: "pending_audit" } }).sort({ pricePerNight: 1 });
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

/** 用户端：按关键字搜索酒店（支持酒店名称、城市），用于目的地下拉联想 */
export const searchHotelsPublic = async (req, res) => {
    try {
        const q = (req.query.q || req.query.keyword || "").trim();
        if (!q) return res.status(200).json({ success: true, hotels: [] });
        const regex = new RegExp(q, "i");
        const hotels = await Hotel.find({
            status: "approved",
            $or: [{ name: regex }, { city: regex }],
        })
            .select("name city")
            .limit(10)
            .lean();
        return res.status(200).json({ success: true, hotels });
    } catch (error) {
        console.error("Error searching hotels:", error);
        return res.status(500).json({ success: false, message: "error in searching hotels" });
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
        const { name, nameEn, address, contact, city, starRating, openTime, nearbyAttractions, promotions, hotelIntro } = req.body;
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
            hotelIntro: hotelIntro || "",
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

/** 商户：提交预审单新增酒店（与首次申请入驻表单相同，按初审对待，出现在预审核列表） */
export const registerHotelPreReview = async (req, res) => {
    try {
        const owner = req.user._id;
        if (req.user.role !== "merchant" && req.user.role !== "admin") {
            return res.status(403).json({ success: false, message: "仅商户可提交酒店预审单" });
        }

        const { applicantName, applicantPhone, hotelName, hotelAddress, hotelCity, hotelContact } = req.body;
        const files = req.files || {};
        const licenseFiles = files.license || [];
        const starRatingFiles = files.starRating || [];
        const exteriorFiles = files.exterior || [];
        const interiorFiles = files.interior || [];

        if (!applicantName?.trim() || !applicantPhone?.trim() || !hotelName?.trim() || !hotelAddress?.trim() || !hotelCity?.trim() || !hotelContact?.trim()) {
            return res.status(400).json({ success: false, message: "请填写所有必填信息" });
        }
        if (!licenseFiles.length) {
            return res.status(400).json({ success: false, message: "请上传营业执照" });
        }
        if (!starRatingFiles.length) {
            return res.status(400).json({ success: false, message: "请上传星级评定证明" });
        }
        if (!exteriorFiles.length) {
            return res.status(400).json({ success: false, message: "请上传至少一张酒店外部照片" });
        }
        if (!interiorFiles.length) {
            return res.status(400).json({ success: false, message: "请上传至少一张酒店内部照片" });
        }

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
        const licenseUrl = `${baseUrl}/uploads/merchant-apply/${licenseFiles[0].filename}`;
        const starRatingCertificateUrl = `${baseUrl}/uploads/merchant-apply/${starRatingFiles[0].filename}`;
        const exteriorUrls = exteriorFiles.map((f) => `${baseUrl}/uploads/merchant-apply/${f.filename}`);
        const interiorUrls = interiorFiles.map((f) => `${baseUrl}/uploads/merchant-apply/${f.filename}`);
        const images = [...exteriorUrls, ...interiorUrls];

        const app = await HotelPreReviewApplication.create({
            owner,
            applicantName: String(applicantName).trim(),
            applicantPhone: String(applicantPhone).trim(),
            hotelName: String(hotelName).trim(),
            hotelAddress: String(hotelAddress).trim(),
            hotelCity: String(hotelCity).trim(),
            hotelContact: String(hotelContact).trim(),
            licenseUrl,
            starRatingCertificateUrl,
            hotelExteriorImages: exteriorUrls,
            hotelInteriorImages: interiorUrls,
            status: "pending",
        });

        return res.status(201).json({
            success: true,
            message: "预审单已提交，等待管理员预审核",
            application: app,
        });
    } catch (error) {
        console.error("Error registerHotelPreReview:", error);
        res.status(500).json({ success: false, message: "提交失败" });
    }
};

/** 商户：获取名下酒店列表（含待再审核/上架中/已驳回/已下架；返回 hasPendingMods） */
export const getOwnerHotels = async (req, res) => {
    try {
        const { status } = req.query;
        const statusFilter = status
            ? { status }
            : { status: { $in: ["pending_audit", "pending_list", "approved", "rejected"] } };
        const hotels = await Hotel.find({
            owner: req.user._id,
            ...statusFilter,
        })
            .select("name nameEn address city starRating images hotelIntro status rejectReason")
            .sort({ updatedAt: -1 })
            .lean();
        const hotelIds = hotels.map((h) => h._id);
        const suppHotelIds = new Set((await HotelSupplementEdit.distinct("hotel", { hotel: { $in: hotelIds }, status: "pending" })).map(String));
        const roomHotelIds = new Set((await RoomEditApplication.distinct("hotel", { hotel: { $in: hotelIds }, status: "pending" })).map(String));
        const withMods = hotels.map((h) => ({ ...h, hasPendingMods: suppHotelIds.has(String(h._id)) || roomHotelIds.has(String(h._id)) }));
        return res.status(200).json({ success: true, hotels: withMods });
    } catch (error) {
        console.error("Error fetching owner hotels:", error);
        res.status(500).json({ success: false, message: "error in fetching hotels" });
    }
};

/** 商户：重新申请（仅已驳回酒店，仅更新补充信息，按再审核标准提交） */
export const reapplyHotel = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ _id: id, owner: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: "酒店不存在" });
        if (hotel.status !== "rejected") {
            return res.status(400).json({ success: false, message: "仅已驳回的酒店可重新申请" });
        }
        const { hotelIntro, nearbyAttractions, promotions, openTime } = req.body;
        const nearArr = parseBodyArray(nearbyAttractions);
        const promArr = parseBodyArray(promotions);
        if (hotelIntro !== undefined) hotel.hotelIntro = hotelIntro || "";
        if (nearbyAttractions !== undefined) hotel.nearbyAttractions = nearArr;
        if (promotions !== undefined) hotel.promotions = promArr;
        if (openTime !== undefined) hotel.openTime = openTime ? new Date(openTime) : null;
        if (req.files && req.files.length > 0) {
            const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
            const newUrls = req.files.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`);
            hotel.images = [...(hotel.images || []), ...newUrls];
        }
        hotel.status = "pending_audit";
        hotel.rejectReason = "";
        await hotel.save();
        return res.status(200).json({ success: true, message: "已提交再审核", hotel });
    } catch (error) {
        console.error("Error reapplyHotel:", error);
        res.status(500).json({ success: false, message: "提交失败" });
    }
};

/** 商户：提交/保存补充信息。待审核首次提交设置 supplementSubmitted；待上架/已上架可随时保存更新 */
export const submitHotelSupplement = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ _id: id, owner: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: "酒店不存在" });
        const allowedStatuses = ["pending_audit", "pending_list", "approved"];
        if (!allowedStatuses.includes(hotel.status)) return res.status(400).json({ success: false, message: "当前状态不可编辑补充信息" });

        const { latitude, longitude, doorNumber, totalRoomCount, nameEn } = req.body;
        const safeParseNumber = (val, allowNull = true) => {
            if (val === "" || val == null) return allowNull ? null : 0;
            const n = Number(val);
            if (!Number.isFinite(n)) return allowNull ? null : 0;
            return n;
        };

        const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
        const files = req.files || {};
        const exteriorFiles = files.exterior || [];
        const interiorFiles = files.interior || [];
        let parsedExterior = null;
        let parsedInterior = null;
        try {
            if (req.body.exteriorUrls) parsedExterior = JSON.parse(req.body.exteriorUrls);
            if (req.body.interiorUrls) parsedInterior = JSON.parse(req.body.interiorUrls);
        } catch (_) {}

        // 1）待审核状态：直接写回 Hotel 本身
        if (hotel.status === "pending_audit") {
            if (latitude !== undefined) hotel.latitude = safeParseNumber(latitude);
            if (longitude !== undefined) hotel.longitude = safeParseNumber(longitude);
            if (doorNumber !== undefined) hotel.doorNumber = String(doorNumber || "").trim();
            if (totalRoomCount !== undefined) {
                hotel.totalRoomCount =
                    totalRoomCount === "" || totalRoomCount == null ? null : Math.max(0, safeParseNumber(totalRoomCount, false));
            }
            if (nameEn !== undefined) hotel.nameEn = String(nameEn || "").trim();

            if (Array.isArray(parsedExterior)) {
                hotel.hotelExteriorImages = [
                    ...parsedExterior,
                    ...exteriorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`),
                ];
            } else if (exteriorFiles.length > 0) {
                hotel.hotelExteriorImages = [
                    ...(hotel.hotelExteriorImages || []),
                    ...exteriorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`),
                ];
            }
            if (Array.isArray(parsedInterior)) {
                hotel.hotelInteriorImages = [
                    ...parsedInterior,
                    ...interiorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`),
                ];
            } else if (interiorFiles.length > 0) {
                hotel.hotelInteriorImages = [
                    ...(hotel.hotelInteriorImages || []),
                    ...interiorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`),
                ];
            }

            const firstSubmit = !hotel.supplementSubmitted;
            if (firstSubmit) hotel.supplementSubmitted = true;
            await hotel.save();
            return res
                .status(200)
                .json({ success: true, message: firstSubmit ? "已提交，等待管理员审核" : "已保存" });
        }

        // 2）已上架/待上架：写入 HotelSupplementEdit，管理员再审核
        if (hotel.status === "approved" || hotel.status === "pending_list") {
            const existingPending = await HotelSupplementEdit.findOne({ hotel: hotel._id, status: "pending" });
            const baseHotel = existingPending || hotel;
            const curLat = baseHotel.latitude;
            const curLng = baseHotel.longitude;
            const curDoor = baseHotel.doorNumber || "";
            const curTotal = baseHotel.totalRoomCount;
            const curNameEn = baseHotel.nameEn || "";
            const curExterior = baseHotel.hotelExteriorImages || [];
            const curInterior = baseHotel.hotelInteriorImages || [];

            const newLat = latitude !== undefined ? safeParseNumber(latitude) : curLat;
            const newLng = longitude !== undefined ? safeParseNumber(longitude) : curLng;
            const newDoor = doorNumber !== undefined ? String(doorNumber || "").trim() : curDoor;
            const newTotal = totalRoomCount !== undefined
                ? (totalRoomCount === "" || totalRoomCount == null
                    ? null
                    : Math.max(0, safeParseNumber(totalRoomCount, false)))
                : curTotal;
            const newNameEn = nameEn !== undefined ? String(nameEn || "").trim() : curNameEn;
            let newExterior = Array.isArray(parsedExterior) ? parsedExterior : [...curExterior];
            let newInterior = Array.isArray(parsedInterior) ? parsedInterior : [...curInterior];
            if (exteriorFiles.length > 0) newExterior = [...newExterior, ...exteriorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`)];
            if (interiorFiles.length > 0) newInterior = [...newInterior, ...interiorFiles.map((f) => `${baseUrl}/uploads/hotels/${f.filename}`)];

            const sameLat = (curLat == null && newLat == null) || (curLat != null && newLat != null && Number(curLat) === Number(newLat));
            const sameLng = (curLng == null && newLng == null) || (curLng != null && newLng != null && Number(curLng) === Number(newLng));
            const sameDoor = String(curDoor) === String(newDoor);
            const sameTotal = (curTotal == null && newTotal == null) || (curTotal != null && newTotal != null && Number(curTotal) === Number(newTotal));
            const sameNameEn = String(curNameEn) === String(newNameEn);
            const sameExterior = curExterior.length === newExterior.length && curExterior.every((u, i) => u === newExterior[i]);
            const sameInterior = curInterior.length === newInterior.length && curInterior.every((u, i) => u === newInterior[i]);

            const hasChanges = exteriorFiles.length > 0 || interiorFiles.length > 0 ||
                !sameLat || !sameLng || !sameDoor || !sameTotal || !sameNameEn || !sameExterior || !sameInterior;

            if (!hasChanges) {
                return res.status(200).json({ success: true, message: "未作修改，无需提交审核" });
            }
            const payload = { latitude: newLat, longitude: newLng, doorNumber: newDoor, totalRoomCount: newTotal, nameEn: newNameEn, hotelExteriorImages: newExterior, hotelInteriorImages: newInterior };
            if (existingPending) {
                await HotelSupplementEdit.findByIdAndUpdate(existingPending._id, { $set: payload });
            } else {
                await HotelSupplementEdit.create({ hotel: hotel._id, ...payload, status: "pending" });
            }
            return res.status(200).json({ success: true, message: "修改已提交，等待再审核（管理员以最后一次提交为准）", needsApproval: true });
        }
        // 理论上不会走到这里，兜底返回
        return res.status(200).json({ success: true, message: "已保存" });
    } catch (error) {
        console.error("Error submitHotelSupplement:", error);
        res.status(500).json({ success: false, message: "提交失败" });
    }
};

/** 商户：按 ID 获取名下某家酒店详情（含预审单字段；若有待审核修改则合并展示，并返回 hasPendingMods） */
export const getOwnerHotelById = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findOne({ _id: id, owner: req.user._id }).lean();
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        if (hotel.images?.length) hotel.images = [...new Set(hotel.images)];
        const hasSupp = await HotelSupplementEdit.exists({ hotel: id, status: "pending" });
        const hasRoom = await RoomEditApplication.exists({ hotel: id, status: "pending" });
        const hasPendingMods = !!(hasSupp || hasRoom);
        let hotelData = { ...hotel, hasPendingMods };
        const suppEdit = await HotelSupplementEdit.findOne({ hotel: id, status: "pending" }).lean();
        if (suppEdit) {
            if (suppEdit.latitude !== undefined) hotelData.latitude = suppEdit.latitude;
            if (suppEdit.longitude !== undefined) hotelData.longitude = suppEdit.longitude;
            if (suppEdit.doorNumber !== undefined) hotelData.doorNumber = suppEdit.doorNumber;
            if (suppEdit.totalRoomCount !== undefined) hotelData.totalRoomCount = suppEdit.totalRoomCount;
            if (suppEdit.nameEn !== undefined) hotelData.nameEn = suppEdit.nameEn;
            if (suppEdit.hotelExteriorImages !== undefined) hotelData.hotelExteriorImages = suppEdit.hotelExteriorImages;
            if (suppEdit.hotelInteriorImages !== undefined) hotelData.hotelInteriorImages = suppEdit.hotelInteriorImages;
        }
        return res.status(200).json({ success: true, hotel: hotelData });
    } catch (error) {
        console.error("Error fetching owner hotel:", error);
        res.status(500).json({ success: false, message: "error in fetching hotel" });
    }
};

/** 商户：获取自己的酒店（用于编辑，单酒店场景） */
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
        const { name, nameEn, address, contact, city, starRating, openTime, nearbyAttractions, promotions, existingImages, latitude, longitude, hotelIntro } = req.body;

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
            const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
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
                hotelIntro: hotelIntro || "",
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
        if (hotelIntro !== undefined) hotel.hotelIntro = hotelIntro;
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

/** 管理员：获取所有酒店（用于审核/发布/下线列表；待审核 = 初次再审核 + 有修改待审核的酒店） */
export const listHotelsForAudit = async (req, res) => {
    try {
        const { status } = req.query; // 可选筛选 pending_audit | pending_list | approved | rejected
        let filter;
        if (status === "pending_audit") {
            // 待审核：初次再审核(pending_audit+supplementSubmitted) 或 有修改待审核(pending_list/approved+RoomEditApplication/HotelSupplementEdit)
            const pendingRoomHotelIds = await RoomEditApplication.distinct("hotel", { status: "pending" });
            const pendingSuppHotelIds = await HotelSupplementEdit.distinct("hotel", { status: "pending" });
            const modHotelIds = [...new Set([...pendingRoomHotelIds.map(String), ...pendingSuppHotelIds.map(String)])];
            filter = {
                $or: [
                    { status: "pending_audit", supplementSubmitted: true },
                    { _id: { $in: modHotelIds }, status: { $in: ["pending_list", "approved"] } },
                ],
            };
        } else if (status) {
            filter = { status };
        } else {
            filter = { $or: [{ status: { $ne: "pending_audit" } }, { status: "pending_audit", supplementSubmitted: true }] };
        }
        let hotels = await Hotel.find(filter)
            .populate("owner", "username phone email")
            .sort({ updatedAt: -1 })
            .lean();
        // 标记有修改待审核的酒店
        const pendingRoomHotels = await RoomEditApplication.distinct("hotel", { status: "pending" });
        const pendingSuppHotels = await HotelSupplementEdit.distinct("hotel", { status: "pending" });
        const modHotelIdSet = new Set([...pendingRoomHotels.map(String), ...pendingSuppHotels.map(String)]);
        hotels = hotels.map((h) => ({ ...h, hasPendingMods: modHotelIdSet.has(String(h._id)) }));
        if (!status) {
            const statusOrder = { pending_audit: 0, pending_list: 1, approved: 2, rejected: 3 };
            hotels.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || new Date(b.updatedAt) - new Date(a.updatedAt));
        }
        return res.status(200).json({ success: true, hotels });
    } catch (error) {
        console.error("Error listing hotels for audit:", error);
        res.status(500).json({ success: false, message: "error in listing hotels" });
    }
};

/** 管理员：按 ID 获取酒店详情（用于再审核弹窗，含房间列表；若有待审核修改则合并显示） */
export const getHotelForAuditDetail = async (req, res) => {
    try {
        const { id } = req.params;
        const hotel = await Hotel.findById(id).populate("owner", "username phone email").lean();
        if (!hotel) return res.status(404).json({ success: false, message: "酒店不存在" });
        // 预审照片去重（避免 exterior+interior 同一张图重复）
        if (hotel.images && hotel.images.length > 0) hotel.images = [...new Set(hotel.images)];
        let rooms = await Room.find({ hotel: id }).sort({ pricePerNight: 1, createdAt: -1 }).lean();
        // 合并待审核的酒店补充信息
        const suppEdit = await HotelSupplementEdit.findOne({ hotel: id, status: "pending" }).lean();
        let hotelData = { ...hotel };
        if (suppEdit) {
            if (suppEdit.latitude !== undefined) hotelData.latitude = suppEdit.latitude;
            if (suppEdit.longitude !== undefined) hotelData.longitude = suppEdit.longitude;
            if (suppEdit.doorNumber !== undefined) hotelData.doorNumber = suppEdit.doorNumber;
            if (suppEdit.totalRoomCount !== undefined) hotelData.totalRoomCount = suppEdit.totalRoomCount;
            if (suppEdit.nameEn !== undefined) hotelData.nameEn = suppEdit.nameEn;
            if (suppEdit.hotelExteriorImages !== undefined) hotelData.hotelExteriorImages = suppEdit.hotelExteriorImages;
            if (suppEdit.hotelInteriorImages !== undefined) hotelData.hotelInteriorImages = suppEdit.hotelInteriorImages;
        }
        // 合并待审核的房间修改（按房间取最新的 pending 申请）
        const roomEdits = await RoomEditApplication.find({ hotel: id, status: "pending" })
            .sort({ updatedAt: -1 })
            .lean();
        const roomEditMap = {}; // roomId -> edit (只保留每个房间最新一条)
        for (const re of roomEdits) {
            const rid = String(re.room);
            if (!roomEditMap[rid]) roomEditMap[rid] = re;
        }
        rooms = rooms.map((r) => {
            const edit = roomEditMap[String(r._id)];
            if (!edit) return r;
            const merged = { ...r };
            if (edit.roomType !== undefined) merged.roomType = edit.roomType;
            if (edit.pricePerNight !== undefined) merged.pricePerNight = edit.pricePerNight;
            if (edit.amenties !== undefined) merged.amenties = edit.amenties;
            if (edit.promoDiscount !== undefined) merged.promoDiscount = edit.promoDiscount;
            if (edit.roomCount !== undefined) merged.roomCount = edit.roomCount;
            if (edit.images && edit.images.length > 0) merged.images = edit.images;
            return merged;
        });
        return res.status(200).json({ success: true, hotel: hotelData, rooms, hasPendingSupp: !!suppEdit });
    } catch (error) {
        console.error("Error getHotelForAuditDetail:", error);
        res.status(500).json({ success: false, message: "获取详情失败" });
    }
};

/** 管理员：审核通过（初次再审核 → pending_list；有修改待审核 → 应用修改） */
export const approveHotel = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        const hasSupp = await HotelSupplementEdit.exists({ hotel: hotelId, status: "pending" });
        const hasRoom = await RoomEditApplication.exists({ hotel: hotelId, status: "pending" });
        if (hasSupp || hasRoom) {
            // 修改待审核：应用所有 pending 修改
            const suppEdits = await HotelSupplementEdit.find({ hotel: hotelId, status: "pending" });
            for (const app of suppEdits) {
                if (app.latitude !== undefined) hotel.latitude = app.latitude;
                if (app.longitude !== undefined) hotel.longitude = app.longitude;
                if (app.doorNumber !== undefined) hotel.doorNumber = app.doorNumber;
                if (app.totalRoomCount !== undefined) hotel.totalRoomCount = app.totalRoomCount;
                if (app.nameEn !== undefined) hotel.nameEn = app.nameEn;
                if (app.hotelExteriorImages !== undefined) hotel.hotelExteriorImages = app.hotelExteriorImages;
                if (app.hotelInteriorImages !== undefined) hotel.hotelInteriorImages = app.hotelInteriorImages;
                app.status = "approved";
                app.reviewedAt = new Date();
                app.reviewedBy = req.user._id;
                await app.save();
            }
            const roomEdits = await RoomEditApplication.find({ hotel: hotelId, status: "pending" });
            for (const app of roomEdits) {
                const room = await Room.findById(app.room);
                if (room) {
                    if (app.roomType !== undefined) room.roomType = app.roomType;
                    if (app.pricePerNight !== undefined) room.pricePerNight = app.pricePerNight;
                    if (app.amenties !== undefined) room.amenties = app.amenties;
                    if (app.promoDiscount !== undefined) room.promoDiscount = app.promoDiscount;
                    if (app.roomCount !== undefined) room.roomCount = app.roomCount;
                    if (app.images && app.images.length > 0) room.images = app.images;
                    if (app.isAvailable !== undefined) room.isAvailable = app.isAvailable;
                    await room.save({ validateBeforeSave: false });
                }
                app.status = "approved";
                app.reviewedAt = new Date();
                app.reviewedBy = req.user._id;
                await app.save();
            }
            await hotel.save();
            return res.status(200).json({ success: true, message: "修改已通过", hotel });
        }
        // 初次再审核
        hotel.status = "pending_list";
        hotel.rejectReason = "";
        await hotel.save();
        return res.status(200).json({ success: true, message: "审核通过，商户可上架", hotel });
    } catch (error) {
        console.error("Error approving hotel:", error);
        res.status(500).json({ success: false, message: "error in approving hotel" });
    }
};

/** 管理员：审核不通过，需填写原因（初次再审核 → rejected；有修改待审核 → 驳回修改） */
export const rejectHotel = async (req, res) => {
    try {
        const { hotelId, rejectReason } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        const reason = rejectReason || "未填写原因";
        const hasSupp = await HotelSupplementEdit.exists({ hotel: hotelId, status: "pending" });
        const hasRoom = await RoomEditApplication.exists({ hotel: hotelId, status: "pending" });
        if (hasSupp || hasRoom) {
            await HotelSupplementEdit.updateMany({ hotel: hotelId, status: "pending" }, { $set: { status: "rejected", rejectReason: reason, reviewedAt: new Date(), reviewedBy: req.user._id } });
            await RoomEditApplication.updateMany({ hotel: hotelId, status: "pending" }, { $set: { status: "rejected", rejectReason: reason, reviewedAt: new Date(), reviewedBy: req.user._id } });
            return res.status(200).json({ success: true, message: "修改已驳回", hotel });
        }
        hotel.status = "rejected";
        hotel.rejectReason = reason;
        await hotel.save();
        return res.status(200).json({ success: true, message: "Hotel rejected", hotel });
    } catch (error) {
        console.error("Error rejecting hotel:", error);
        res.status(500).json({ success: false, message: "error in rejecting hotel" });
    }
};

/** 管理员：下架（已上架 → 待上架） */
export const setHotelOffline = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        if (hotel.status !== "approved") {
            return res.status(400).json({ success: false, message: "仅已上架酒店可下架" });
        }
        hotel.status = "pending_list";
        await hotel.save();
        return res.status(200).json({ success: true, message: "已下架", hotel });
    } catch (error) {
        console.error("Error setting hotel offline:", error);
        res.status(500).json({ success: false, message: "下架失败" });
    }
};

/** 商户：批量上架酒店（pending_list → approved；有待审核修改的酒店不可上架） */
export const batchListHotels = async (req, res) => {
    try {
        const { hotelIds } = req.body;
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ success: false, message: "请选择要上架的酒店" });
        }
        const suppIds = new Set((await HotelSupplementEdit.distinct("hotel", { hotel: { $in: hotelIds }, status: "pending" })).map(String));
        const roomIds = new Set((await RoomEditApplication.distinct("hotel", { hotel: { $in: hotelIds }, status: "pending" })).map(String));
        const modIds = new Set([...suppIds, ...roomIds]);
        const allowedIds = hotelIds.filter((id) => !modIds.has(String(id)));
        if (allowedIds.length === 0) {
            return res.status(400).json({ success: false, message: "所选酒店均有待审核修改，请等待管理员审核通过后再上架" });
        }
        const result = await Hotel.updateMany(
            { _id: { $in: allowedIds }, owner: req.user._id, status: "pending_list" },
            { $set: { status: "approved" } }
        );
        const msg = modIds.size > 0 ? `已上架 ${result.modifiedCount} 家，${modIds.size} 家有待审核修改暂不可上架` : `已上架 ${result.modifiedCount} 家酒店`;
        return res.status(200).json({ success: true, message: msg, count: result.modifiedCount });
    } catch (error) {
        console.error("Error batch listing hotels:", error);
        res.status(500).json({ success: false, message: "上架失败" });
    }
};

/** 商户：批量下架酒店（approved → pending_list 待上架） */
export const batchDelistHotels = async (req, res) => {
    try {
        const { hotelIds } = req.body;
        if (!Array.isArray(hotelIds) || hotelIds.length === 0) {
            return res.status(400).json({ success: false, message: "请选择要下架的酒店" });
        }
        const result = await Hotel.updateMany(
            { _id: { $in: hotelIds }, owner: req.user._id, status: "approved" },
            { $set: { status: "pending_list" } }
        );
        return res.status(200).json({ success: true, message: `已下架 ${result.modifiedCount} 家酒店`, count: result.modifiedCount });
    } catch (error) {
        console.error("Error batch delisting hotels:", error);
        res.status(500).json({ success: false, message: "下架失败" });
    }
};

/** 商户：删除自己的酒店（同时删除该酒店下的所有房型） */
export const deleteHotel = async (req, res) => {
    try {
        const { id } = req.params;
        const ownerId = req.user._id;
        const hotel = await Hotel.findOne({ _id: id, owner: ownerId });
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found or not yours" });
        await Room.deleteMany({ hotel: id });
        await Hotel.findByIdAndDelete(id);
        return res.status(200).json({ success: true, message: "Hotel deleted" });
    } catch (error) {
        console.error("Error deleting hotel:", error);
        res.status(500).json({ success: false, message: "error in deleting hotel" });
    }
};

/** 管理员：上架（待上架 → 已上架） */
export const restoreHotel = async (req, res) => {
    try {
        const { hotelId } = req.body;
        const hotel = await Hotel.findById(hotelId);
        if (!hotel) return res.status(404).json({ success: false, message: "Hotel not found" });
        if (hotel.status !== "pending_list") {
            return res.status(400).json({ success: false, message: "仅待上架酒店可上架" });
        }
        hotel.status = "approved";
        await hotel.save();
        return res.status(200).json({ success: true, message: "已上架", hotel });
    } catch (error) {
        console.error("Error listing hotel:", error);
        res.status(500).json({ success: false, message: "上架失败" });
    }
};

/** 管理员：列出酒店补充信息修改申请 */
export const listHotelSupplementEdits = async (req, res) => {
    try {
        const { status } = req.query;
        const statusFilter = status ? { status } : { status: { $in: ["pending", "approved", "rejected"] } };
        let list = await HotelSupplementEdit.find(statusFilter)
            .populate({ path: "hotel", select: "name owner", populate: { path: "owner", select: "username phone" } })
            .sort({ createdAt: -1 })
            .lean();
        if (!status) {
            const statusOrder = { pending: 0, approved: 1, rejected: 2 };
            list.sort((a, b) => (statusOrder[a.status] ?? 99) - (statusOrder[b.status] ?? 99) || new Date(b.createdAt) - new Date(a.createdAt));
        }
        return res.status(200).json({ success: true, applications: list });
    } catch (error) {
        console.error("Error listing hotel supplement edits:", error);
        res.status(500).json({ success: false, message: "获取列表失败" });
    }
};

/** 管理员：通过酒店补充信息修改 */
export const approveHotelSupplementEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const app = await HotelSupplementEdit.findById(id);
        if (!app || app.status !== "pending") return res.status(404).json({ success: false, message: "申请不存在或已处理" });
        const hotel = await Hotel.findById(app.hotel);
        if (!hotel) return res.status(404).json({ success: false, message: "酒店不存在" });
        if (app.latitude !== undefined) hotel.latitude = app.latitude;
        if (app.longitude !== undefined) hotel.longitude = app.longitude;
        if (app.doorNumber !== undefined) hotel.doorNumber = app.doorNumber;
        if (app.totalRoomCount !== undefined) hotel.totalRoomCount = app.totalRoomCount;
        if (app.nameEn !== undefined) hotel.nameEn = app.nameEn;
        if (app.hotelExteriorImages !== undefined) hotel.hotelExteriorImages = app.hotelExteriorImages;
        if (app.hotelInteriorImages !== undefined) hotel.hotelInteriorImages = app.hotelInteriorImages;
        await hotel.save();
        app.status = "approved";
        app.reviewedAt = new Date();
        app.reviewedBy = req.user._id;
        await app.save();
        return res.status(200).json({ success: true, message: "已通过" });
    } catch (error) {
        console.error("Error approving hotel supplement edit:", error);
        res.status(500).json({ success: false, message: "操作失败" });
    }
};

/** 管理员：驳回酒店补充信息修改 */
export const rejectHotelSupplementEdit = async (req, res) => {
    try {
        const { id } = req.params;
        const { reason } = req.body || {};
        const app = await HotelSupplementEdit.findById(id);
        if (!app || app.status !== "pending") return res.status(404).json({ success: false, message: "申请不存在或已处理" });
        app.status = "rejected";
        app.rejectReason = reason || "未填写原因";
        app.reviewedAt = new Date();
        app.reviewedBy = req.user._id;
        await app.save();
        return res.status(200).json({ success: true, message: "已驳回" });
    } catch (error) {
        console.error("Error rejecting hotel supplement edit:", error);
        res.status(500).json({ success: false, message: "操作失败" });
    }
};

/** 商户：管理酒店展示区图片（仅可从已上传的内/外部照片中选择），实时生效 */
export const updateHotelDisplayImages = async (req, res) => {
    try {
        const { id } = req.params;
        const { images } = req.body || {};
        const hotel = await Hotel.findOne({ _id: id, owner: req.user._id });
        if (!hotel) return res.status(404).json({ success: false, message: "酒店不存在" });

        const allowedStatuses = ["pending_audit", "pending_list", "approved"];
        if (!allowedStatuses.includes(hotel.status)) {
            return res.status(400).json({ success: false, message: "当前状态不可编辑展示图片" });
        }

        const candidates = new Set([
            ...((hotel.hotelExteriorImages || []).map(String)),
            ...((hotel.hotelInteriorImages || []).map(String)),
        ]);

        let nextImages = Array.isArray(images) ? images.map(String).filter(Boolean) : [];
        nextImages = nextImages.filter((url) => candidates.has(url));

        hotel.images = nextImages;
        await hotel.save();

        return res.status(200).json({
            success: true,
            message: "展示图片已保存",
            images: hotel.images,
        });
    } catch (error) {
        console.error("Error updating hotel display images:", error);
        return res.status(500).json({ success: false, message: "保存失败" });
    }
};
