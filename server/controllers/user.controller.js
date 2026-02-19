export const getUserData = (req, res) => {
    try {
        const role = req.user.role;
        const recentSerachCities = req.user.recentSerachCities;
        const merchantApplicationStatus = req.user.merchantApplicationStatus || 'none';
        res.status(200).json({
            success: true,
            role,
            merchantApplicationStatus,
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
