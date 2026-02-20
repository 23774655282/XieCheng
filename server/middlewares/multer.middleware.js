import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 本地上传目录：server/uploads/rooms
const uploadDir = path.join(__dirname, "..", "uploads", "rooms");
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({ storage });

// 酒店图片上传目录：server/uploads/hotels
const hotelUploadDir = path.join(__dirname, "..", "uploads", "hotels");
fs.mkdirSync(hotelUploadDir, { recursive: true });

const hotelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, hotelUploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

export const uploadHotel = multer({ storage: hotelStorage });

// 商户申请：营业执照上传目录 server/uploads/licenses
const licenseUploadDir = path.join(__dirname, "..", "uploads", "licenses");
fs.mkdirSync(licenseUploadDir, { recursive: true });
const licenseStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, licenseUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}-license${ext}`);
  },
});
export const uploadLicense = multer({ storage: licenseStorage });

// 商户申请：营业执照 + 酒店照片（外部/内部）
const merchantApplyDir = path.join(__dirname, "..", "uploads", "merchant-apply");
fs.mkdirSync(merchantApplyDir, { recursive: true });
const merchantApplyStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, merchantApplyDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const field = file.fieldname;
    cb(null, `${field}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`);
  },
});
export const uploadMerchantApply = multer({
  storage: merchantApplyStorage,
}).fields([
  { name: "license", maxCount: 1 },
  { name: "exterior", maxCount: 5 },
  { name: "interior", maxCount: 5 },
]);

// 用户评价图片上传目录 server/uploads/reviews
const reviewUploadDir = path.join(__dirname, "..", "uploads", "reviews");
fs.mkdirSync(reviewUploadDir, { recursive: true });
const reviewStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, reviewUploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    const base = path.basename(file.originalname, ext).replace(/\s+/g, "-");
    cb(null, `${Date.now()}-${base}${ext}`);
  },
});
export const uploadReview = multer({
  storage: reviewStorage,
});
export default upload;