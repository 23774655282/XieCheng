export const getUserData = (req, res) => {
    try {
        const u = req.user;
        res.status(200).json({
            success: true,
            _id: u._id?.toString?.(),
            role: u.role,
            merchantApplicationStatus: u.merchantApplicationStatus || 'none',
            recentSerachCities: u.recentSerachCities,
            username: u.username,
            avatar: u.avatar,
            birthday: u.birthday ? u.birthday.toISOString().slice(0, 10) : null,
            favoriteHotels: u.favoriteHotels || [],
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({
            success: false,
            message: "error in fetching user data",
        });
    }
};

/** 更新个人资料：用户名、生日、头像 */
export const updateProfile = async (req, res) => {
    try {
        const user = req.user;
        const { username, birthday } = req.body;
        if (username != null && typeof username === 'string' && username.trim()) {
            user.username = username.trim();
        }
        if (birthday != null) {
            if (birthday === '' || birthday === null) {
                user.birthday = null;
            } else {
                const d = new Date(birthday);
                if (!isNaN(d.getTime())) user.birthday = d;
            }
        }
        if (req.file && req.file.filename) {
            const baseUrl = `${req.protocol}://${req.get('host')}`;
            user.avatar = `${baseUrl}/uploads/avatars/${req.file.filename}`;
        }
        await user.save({ validateBeforeSave: false });
        res.status(200).json({
            success: true,
            username: user.username,
            avatar: user.avatar,
            birthday: user.birthday ? user.birthday.toISOString().slice(0, 10) : null,
        });
    } catch (error) {
        console.error("Error updating profile:", error);
        res.status(500).json({ success: false, message: "更新失败" });
    }
};

/** 获取收藏的酒店列表 */
export const getFavorites = async (req, res) => {
    try {
        const user = await req.user.populate('favoriteHotels');
        const hotels = (user.favoriteHotels || []).filter((h) => h && h.status === 'approved');
        res.status(200).json({ success: true, hotels });
    } catch (error) {
        console.error("Error fetching favorites:", error);
        res.status(500).json({ success: false, message: "获取收藏失败" });
    }
};

/** 添加收藏 */
export const addFavorite = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const user = req.user;
        if (!user.favoriteHotels) user.favoriteHotels = [];
        if (!user.favoriteHotels.some((id) => String(id) === hotelId)) {
            user.favoriteHotels.push(hotelId);
            await user.save({ validateBeforeSave: false });
        }
        res.status(200).json({ success: true, favoriteHotels: user.favoriteHotels });
    } catch (error) {
        console.error("Error adding favorite:", error);
        res.status(500).json({ success: false, message: "收藏失败" });
    }
};

/** 取消收藏 */
export const removeFavorite = async (req, res) => {
    try {
        const { hotelId } = req.params;
        const user = req.user;
        if (user.favoriteHotels) {
            user.favoriteHotels = user.favoriteHotels.filter((id) => String(id) !== hotelId);
            await user.save({ validateBeforeSave: false });
        }
        res.status(200).json({ success: true, favoriteHotels: user.favoriteHotels });
    } catch (error) {
        console.error("Error removing favorite:", error);
        res.status(500).json({ success: false, message: "取消收藏失败" });
    }
};

/** 已废弃：普通用户不能直接设 role。商户需通过 POST /merchant/apply 申请，由 admin 审核后批准 */
export const setRole = async (req, res) => {
    return res.status(403).json({ success: false, message: "role cannot be set directly. Apply via /merchant/apply for merchant" });
};


export const recentSerachCities = async (req, res) => {
    try {
        const {recentSerachCity} = req.body;
        const user = req.user;

        console.log(recentSerachCity)

        if (user.recentSerachCities.length <3) {
            user.recentSerachCities.push(recentSerachCity);
        }else{
            user.recentSerachCities.shift();
            user.recentSerachCities.push(recentSerachCity);
        }

        await user.save({
            validateBeforeSave: false
        });

        return res.status(200).json({
            success: true,
            message: "recent serach city updated successfully"
        });

    } catch (error) {
        console.error("Error updating recent search cities:", error);
        return res.status(500).json({
            success: false,
            message: "error in updating recent serach cities"
        });
    }
}
