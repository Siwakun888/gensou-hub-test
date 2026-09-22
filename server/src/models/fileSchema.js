import mongoose from 'mongoose';

/**
 * How an uploaded file is recorded. Shared by album covers, audio tracks and
 * hero wallpapers. `fileName` is the generated name on disk and is never
 * exposed by the API.
 */
const fileSchema = new mongoose.Schema(
  {
    fileName: { type: String, required: true },
    originalName: { type: String, required: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true }, // bytes
  },
  { _id: false }
);

export default fileSchema;
