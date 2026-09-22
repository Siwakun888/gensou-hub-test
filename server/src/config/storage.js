import path from 'node:path';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));

// UPLOAD_DIR lets the test suite redirect writes to a temp directory.
export const UPLOAD_ROOT = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR)
  : path.resolve(here, '../../uploads');
export const COVER_DIR = path.join(UPLOAD_ROOT, 'covers');
export const TRACK_DIR = path.join(UPLOAD_ROOT, 'tracks');
export const WALLPAPER_DIR = path.join(UPLOAD_ROOT, 'wallpapers');
export const CIRCLE_DIR = path.join(UPLOAD_ROOT, 'circles');

export async function ensureUploadDirs() {
  await fs.mkdir(COVER_DIR, { recursive: true });
  await fs.mkdir(TRACK_DIR, { recursive: true });
  await fs.mkdir(WALLPAPER_DIR, { recursive: true });
  await fs.mkdir(CIRCLE_DIR, { recursive: true });
}

/**
 * Resolve a stored file name to an absolute path, refusing anything that
 * escapes the upload directory (a stored name should never contain a
 * separator, but the DB is not a trust boundary worth skipping this for).
 */
export function resolveUpload(dir, fileName) {
  const full = path.resolve(dir, fileName);
  if (full !== path.join(dir, path.basename(full))) {
    throw Object.assign(new Error('Invalid file path'), { status: 400 });
  }
  return full;
}

/** Best-effort delete: a missing file must not fail the request. */
export async function removeUpload(dir, fileName) {
  if (!fileName) return;
  try {
    await fs.unlink(resolveUpload(dir, fileName));
  } catch (err) {
    if (err.code !== 'ENOENT') console.error('Failed to remove upload:', err.message);
  }
}
