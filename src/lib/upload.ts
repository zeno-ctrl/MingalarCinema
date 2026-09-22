import { v2 as cloudinary } from "cloudinary";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const configured =
  !!process.env.CLOUDINARY_CLOUD_NAME && !!process.env.CLOUDINARY_API_KEY && !!process.env.CLOUDINARY_API_SECRET;

if (configured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

export const isUploadConfigured = configured;

export type UploadResult = { ok: true; url: string } | { ok: false; error: string };

export async function uploadImage(file: File): Promise<UploadResult> {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false, error: "Only JPEG, PNG or WebP images are allowed." };
  }
  if (file.size > MAX_SIZE_BYTES) {
    return { ok: false, error: "Image must be smaller than 5MB." };
  }
  if (!configured) {
    return {
      ok: false,
      error: "Image uploads aren't configured yet (missing Cloudinary credentials). Paste an image URL instead.",
    };
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "cinetown",
    resource_type: "image",
  });

  return { ok: true, url: result.secure_url };
}
