export const getUserData = (req, res) => {
    try {
        const role = req.user.role;
        const recentSerachCities = req.user.recentSerachCities;
        res.status(200).json({
            success: true,
            role,
            recentSerachCities,
        });
    } catch (error) {
        console.error("Error fetching user data:", error);
        res.status(500).json({
            success: false,
            message: "error in fetching user data",
        });
    }
};

/** 注册时选择角色：仅当当前角色为 user 时可设置一次为 merchant 或 admin */
export const setRole = async (req, res) => {
    try {
        const { role } = req.body;
        if (!["merchant", "admin"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role" });
        }
        const user = req.user;
        if (user.role !== "user") {
            return res.status(400).json({ success: false, message: "Role already set" });
        }
        user.role = role;
        await user.save({ validateBeforeSave: false });
        return res.status(200).json({ success: true, role: user.role });
    } catch (error) {
        console.error("Error setting role:", error);
        res.status(500).json({ success: false, message: "error in setting role" });
    }
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
