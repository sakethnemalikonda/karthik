import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs';

const uploadDir = process.env.UPLOAD_DIR || './uploads';
const absDir = path.resolve(uploadDir);

if (!fs.existsSync(absDir)) {
  fs.mkdirSync(absDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, absDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const randomName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`;
    cb(null, randomName);
  },
});

export const uploadComplaintImage = multer({
  storage,
  limits: {
    fileSize: 8 * 1024 * 1024, // 8MB limit
  },
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|webp|gif/;
    const extname = allowed.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowed.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files (JPEG, PNG, WebP, GIF) are allowed for upload.'));
  },
});
