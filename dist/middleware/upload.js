"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.processUploadedFile = exports.tradeScreenshotsUpload = exports.upload = void 0;
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const cloudinary_1 = require("cloudinary");
// Ensure local uploads directory exists
const uploadDir = path_1.default.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
if (!fs_1.default.existsSync(uploadDir)) {
    fs_1.default.mkdirSync(uploadDir, { recursive: true });
}
// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = !!(process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET);
if (isCloudinaryConfigured) {
    cloudinary_1.v2.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
    });
}
// Multer Disk Storage
const storage = multer_1.default.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
        const ext = path_1.default.extname(file.originalname).toLowerCase();
        cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    },
});
// File filter: png, jpg, jpeg, webp, max 5MB
const fileFilter = (_req, file, cb) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    if (allowedMimeTypes.includes(file.mimetype)) {
        cb(null, true);
    }
    else {
        cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
    }
};
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter,
});
exports.tradeScreenshotsUpload = exports.upload.fields([
    { name: 'before', maxCount: 1 },
    { name: 'atEntry', maxCount: 1 },
    { name: 'after', maxCount: 1 },
    { name: 'extras', maxCount: 10 },
]);
/**
 * Upload helper that uploads to Cloudinary if configured, otherwise returns local URL
 */
const processUploadedFile = async (file, req) => {
    if (isCloudinaryConfigured) {
        try {
            const result = await cloudinary_1.v2.uploader.upload(file.path, {
                folder: 'trading-journal',
            });
            // Optionally remove local file after upload
            fs_1.default.unlink(file.path, () => { });
            return result.secure_url;
        }
        catch (err) {
            console.error('Cloudinary upload failed, falling back to local URL:', err);
        }
    }
    // Local URL
    const baseUrl = `${req.protocol}://${req.get('host')}`;
    return `${baseUrl}/uploads/${file.filename}`;
};
exports.processUploadedFile = processUploadedFile;
