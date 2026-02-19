import User from "../models/user.model.js";
import MerchantApplication from "../models/merchantApplication.model.js";

/** 普通用户申请成为商户：提交执照、酒店信息、申请人等必填信息 */
export const applyMerchant = async (req, res) => {
  try {
    const user = req.user;
    if (user.role !== "user") {
      return res.status(400).json({ success: false, message: "仅普通用户可申请成为商户" });
    }
    const status = user.merchantApplicationStatus || "none";
    if (status === "pending") {
      return res.status(400).json({ success: false, message: "您已有申请在审核中" });
    }
    if (status === "approved" || user.role === "merchant") {
      return res.status(400).json({ success: false, message: "您已是商户" });
    }

    const { applicantName, applicantPhone, hotelName, hotelAddress, hotelCity, hotelContact } = req.body;
    const files = req.files || {};
    const licenseFiles = files.license || [];
    const exteriorFiles = files.exterior || [];
    const interiorFiles = files.interior || [];
    if (!applicantName?.trim() || !applicantPhone?.trim() || !hotelName?.trim() || !hotelAddress?.trim() || !hotelCity?.trim() || !hotelContact?.trim()) {
      return res.status(400).json({ success: false, message: "请填写所有必填信息" });
    }
    if (!licenseFiles.length) {
      return res.status(400).json({ success: false, message: "请上传营业执照" });
    }
    if (!exteriorFiles.length) {
      return res.status(400).json({ success: false, message: "请上传至少一张酒店外部照片" });
    }
    if (!interiorFiles.length) {
      return res.status(400).json({ success: false, message: "请上传至少一张酒店内部照片" });
    }

    const baseUrl = process.env.PUBLIC_URL || `${req.protocol}://${req.get("host")}`;
    const licenseUrl = `${baseUrl}/uploads/merchant-apply/${licenseFiles[0].filename}`;
    const hotelExteriorImages = exteriorFiles.map((f) => `${baseUrl}/uploads/merchant-apply/${f.filename}`);
    const hotelInteriorImages = interiorFiles.map((f) => `${baseUrl}/uploads/merchant-apply/${f.filename}`);

    const existingApp = await MerchantApplication.findOne({ userId: user._id });
    if (existingApp) await MerchantApplication.deleteOne({ _id: existingApp._id });

    await MerchantApplication.create({
      userId: user._id,
      applicantName: String(applicantName).trim(),
      applicantPhone: String(applicantPhone).trim(),
      hotelName: String(hotelName).trim(),
      hotelAddress: String(hotelAddress).trim(),
      hotelCity: String(hotelCity).trim(),
      hotelContact: String(hotelContact).trim(),
      licenseUrl,
      hotelExteriorImages,
      hotelInteriorImages,
    });

    user.merchantApplicationStatus = "pending";
    await user.save({ validateBeforeSave: false });

    return res.status(200).json({
      success: true,
      message: "申请已提交，请等待审核",
      merchantApplicationStatus: "pending",
    });
  } catch (error) {
    console.error("applyMerchant error:", error);
    return res.status(500).json({ success: false, message: "申请失败" });
  }
};

/** 当前用户查看自己的申请详情（含驳回原因） */
export const getMyApplication = async (req, res) => {
  try {
    const app = await MerchantApplication.findOne({ userId: req.user._id }).lean();
    return res.status(200).json({ success: true, application: app || null });
  } catch (error) {
    console.error("getMyApplication error:", error);
    return res.status(500).json({ success: false, message: "获取失败" });
  }
};

/** 管理员：获取待审核商户申请列表（含申请详情） */
export const listMerchantApplications = async (req, res) => {
  try {
    const users = await User.find({ merchantApplicationStatus: "pending", role: "user" })
      .select("_id username phone createdAt")
      .sort({ updatedAt: -1 })
      .lean();

    const applications = [];
    for (const u of users) {
      const app = await MerchantApplication.findOne({ userId: u._id }).lean();
      applications.push({
        _id: u._id,
        username: u.username,
        phone: u.phone,
        createdAt: u.createdAt,
        applicantName: app?.applicantName,
        applicantPhone: app?.applicantPhone,
        hotelName: app?.hotelName,
        hotelAddress: app?.hotelAddress,
        hotelCity: app?.hotelCity,
        hotelContact: app?.hotelContact,
        licenseUrl: app?.licenseUrl,
        hotelExteriorImages: app?.hotelExteriorImages || [],
        hotelInteriorImages: app?.hotelInteriorImages || [],
        rejectReason: app?.rejectReason,
      });
    }

    return res.status(200).json({ success: true, applications });
  } catch (error) {
    console.error("listMerchantApplications error:", error);
    return res.status(500).json({ success: false, message: "获取申请列表失败" });
  }
};

/** 管理员：通过商户申请 */
export const approveMerchantApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }
    if (user.role !== "user" || (user.merchantApplicationStatus || "none") !== "pending") {
      return res.status(400).json({ success: false, message: "该用户无待审核的商户申请" });
    }
    user.role = "merchant";
    user.merchantApplicationStatus = "approved";
    await user.save({ validateBeforeSave: false });
    return res.status(200).json({ success: true, message: "已批准成为商户", user: { id: user._id, role: user.role } });
  } catch (error) {
    console.error("approveMerchantApplication error:", error);
    return res.status(500).json({ success: false, message: "操作失败" });
  }
};

/** 管理员：驳回商户申请（必须填写驳回原因） */
export const rejectMerchantApplication = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectReason } = req.body || {};
    const reason = String(rejectReason || "").trim();
    if (!reason) {
      return res.status(400).json({ success: false, message: "请填写驳回原因" });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: "用户不存在" });
    }
    if ((user.merchantApplicationStatus || "none") !== "pending") {
      return res.status(400).json({ success: false, message: "该用户无待审核的商户申请" });
    }

    user.merchantApplicationStatus = "rejected";
    await user.save({ validateBeforeSave: false });

    await MerchantApplication.findOneAndUpdate(
      { userId: id },
      { $set: { rejectReason: reason } },
      { new: true }
    );

    return res.status(200).json({ success: true, message: "已驳回申请" });
  } catch (error) {
    console.error("rejectMerchantApplication error:", error);
    return res.status(500).json({ success: false, message: "操作失败" });
  }
};
