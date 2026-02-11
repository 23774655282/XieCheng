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
export default upload;