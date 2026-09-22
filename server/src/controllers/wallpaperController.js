import Wallpaper from '../models/Wallpaper.js';
import { WALLPAPER_DIR, resolveUpload, removeUpload } from '../config/storage.js';
import { serializeWallpaper } from '../utils/serialize.js';

async function findOr404(id) {
  const wallpaper = await Wallpaper.findById(id);
  if (!wallpaper) throw Object.assign(new Error('Wallpaper not found'), { status: 404 });
  return wallpaper;
}

function fileMeta(file) {
  return {
    fileName: file.filename,
    originalName: file.originalname,
    mimeType: file.mimetype,
    size: file.size,
  };
}

/** Accepts "true"/"false" from multipart form fields as well as real booleans. */
function toBoolean(value) {
  if (typeof value === 'boolean') return value;
  return value === 'true' || value === '1';
}

// GET /api/wallpapers        — what the hero renders (active only)
// GET /api/wallpapers?all=true — the admin list, including retired slides
export async function listWallpapers(req, res) {
  const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';

  const wallpapers = await Wallpaper.find(includeInactive ? {} : { isActive: true }).sort({
    order: 1,
    createdAt: 1,
  });

  res.json(wallpapers.map(serializeWallpaper));
}

// GET /api/wallpapers/:id
export async function getWallpaper(req, res) {
  const wallpaper = await findOr404(req.params.id);
  res.json(serializeWallpaper(wallpaper));
}

// POST /api/wallpapers  (multipart, required "image")
export async function createWallpaper(req, res) {
  if (!req.file) throw Object.assign(new Error('An "image" file is required'), { status: 400 });

  const { title, subtitle, linkUrl, linkLabel, order, isActive } = req.body;

  // Append to the end unless a position was given.
  const position = order !== undefined ? Number(order) : await Wallpaper.countDocuments();

  try {
    const wallpaper = await Wallpaper.create({
      title,
      subtitle,
      linkUrl,
      linkLabel,
      order: position,
      isActive: isActive === undefined ? true : toBoolean(isActive),
      image: fileMeta(req.file),
    });
    res.status(201).json(serializeWallpaper(wallpaper));
  } catch (err) {
    await removeUpload(WALLPAPER_DIR, req.file.filename);
    throw err;
  }
}

// PUT /api/wallpapers/:id  (multipart, optional replacement "image")
export async function updateWallpaper(req, res) {
  const wallpaper = await findOr404(req.params.id);

  for (const field of ['title', 'subtitle', 'linkUrl', 'linkLabel']) {
    if (req.body[field] !== undefined) wallpaper[field] = req.body[field];
  }
  if (req.body.order !== undefined) wallpaper.order = Number(req.body.order);
  if (req.body.isActive !== undefined) wallpaper.isActive = toBoolean(req.body.isActive);

  const previousImage = wallpaper.image?.fileName;
  if (req.file) wallpaper.image = fileMeta(req.file);

  try {
    await wallpaper.save();
  } catch (err) {
    if (req.file) await removeUpload(WALLPAPER_DIR, req.file.filename);
    throw err;
  }

  if (req.file && previousImage) await removeUpload(WALLPAPER_DIR, previousImage);
  res.json(serializeWallpaper(wallpaper));
}

// PUT /api/wallpapers/reorder  — { ids: [...] } in the order they should show
export async function reorderWallpapers(req, res) {
  const { ids } = req.body;

  if (!Array.isArray(ids) || ids.length === 0) {
    throw Object.assign(new Error('Send an "ids" array in the new display order'), {
      status: 400,
    });
  }

  const found = await Wallpaper.countDocuments({ _id: { $in: ids } });
  if (found !== ids.length) {
    throw Object.assign(new Error('One or more wallpapers do not exist'), { status: 404 });
  }

  await Wallpaper.bulkWrite(
    ids.map((id, index) => ({
      updateOne: { filter: { _id: id }, update: { $set: { order: index } } },
    }))
  );

  const wallpapers = await Wallpaper.find().sort({ order: 1, createdAt: 1 });
  res.json(wallpapers.map(serializeWallpaper));
}

// DELETE /api/wallpapers/:id
export async function deleteWallpaper(req, res) {
  const wallpaper = await findOr404(req.params.id);

  await Wallpaper.deleteOne({ _id: wallpaper._id });
  await removeUpload(WALLPAPER_DIR, wallpaper.image?.fileName);

  res.status(204).end();
}

// GET /api/wallpapers/:id/image
export async function getWallpaperImage(req, res) {
  const wallpaper = await findOr404(req.params.id);

  res.type(wallpaper.image.mimeType);
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.sendFile(resolveUpload(WALLPAPER_DIR, wallpaper.image.fileName));
}
