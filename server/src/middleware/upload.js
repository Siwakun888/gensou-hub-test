import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { COVER_DIR, TRACK_DIR, WALLPAPER_DIR, CIRCLE_DIR } from '../config/storage.js';
import { AUDIO_MIME_TYPES, IMAGE_MIME_TYPES } from '../models/Album.js';

const MB = 1024 * 1024;

function storageFor(destination) {
  return multer.diskStorage({
    destination: (req, file, cb) => cb(null, destination),
    filename: (req, file, cb) => {
      // Never trust the client's file name on disk.
      const ext = path.extname(file.originalname).toLowerCase().slice(0, 10);
      cb(null, `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
    },
  });
}

function filterFor(allowed, label) {
  return (req, file, cb) => {
    if (allowed.includes(file.mimetype)) return cb(null, true);
    cb(
      Object.assign(new Error(`Unsupported ${label} type: ${file.mimetype}`), { status: 400 })
    );
  };
}

export const uploadCover = multer({
  storage: storageFor(COVER_DIR),
  fileFilter: filterFor(IMAGE_MIME_TYPES, 'image'),
  limits: { fileSize: Number(process.env.MAX_COVER_MB || 5) * MB, files: 1 },
}).single('cover');

export const uploadAudio = multer({
  storage: storageFor(TRACK_DIR),
  fileFilter: filterFor(AUDIO_MIME_TYPES, 'audio'),
  limits: { fileSize: Number(process.env.MAX_AUDIO_MB || 50) * MB, files: 1 },
}).single('audio');

export const uploadWallpaper = multer({
  storage: storageFor(WALLPAPER_DIR),
  fileFilter: filterFor(IMAGE_MIME_TYPES, 'image'),
  // Hero images are full-bleed, so they get a larger budget than a cover.
  limits: { fileSize: Number(process.env.MAX_WALLPAPER_MB || 10) * MB, files: 1 },
}).single('image');

export const uploadCircleLogo = multer({
  storage: storageFor(CIRCLE_DIR),
  fileFilter: filterFor(IMAGE_MIME_TYPES, 'image'),
  // A logo is shown small wherever it appears, so it needs less room than a
  // cover, let alone a hero image.
  limits: { fileSize: Number(process.env.MAX_LOGO_MB || 3) * MB, files: 1 },
}).single('logo');
