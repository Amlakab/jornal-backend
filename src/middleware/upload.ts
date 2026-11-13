import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { v2 as cloudinary } from 'cloudinary';

// Ensure local uploads directory exists
const uploadDir = path.resolve(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure Cloudinary if credentials are present
const isCloudinaryConfigured = !!(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Multer Disk Storage
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter: png, jpg, jpeg, webp, max 5MB
const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPEG, PNG, and WebP are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter,
});

export const tradeScreenshotsUpload = upload.fields([
  { name: 'before', maxCount: 1 },
  { name: 'atEntry', maxCount: 1 },
  { name: 'after', maxCount: 1 },
  { name: 'extras', maxCount: 10 },
]);

/**
 * Upload helper that uploads to Cloudinary if configured, otherwise returns local URL
 */
export const processUploadedFile = async (
  file: Express.Multer.File,
  req: Request
): Promise<string> => {
  if (isCloudinaryConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'trading-journal',
      });
      // Optionally remove local file after upload
      fs.unlink(file.path, () => {});
      return result.secure_url;
    } catch (err) {
      console.error('Cloudinary upload failed, falling back to local URL:', err);
    }
  }

  // Local URL
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return `${baseUrl}/uploads/${file.filename}`;
};
