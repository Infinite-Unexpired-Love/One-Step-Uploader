/**
 * File utility functions
 */

/**
 * Generate unique filename with timestamp
 */
export function generateUniqueFileName(
  originalName: string,
  extension: string,
  preserveOriginalName: boolean
): string {
  const timestamp = Date.now();
  const randomStr = Math.random().toString(36).substring(2, 8);

  if (preserveOriginalName && originalName) {
    const baseName = originalName.replace(/\.[^/.]+$/, "");
    const safeName = sanitizeFileName(baseName);
    return `${safeName}_${timestamp}.${extension}`;
  }

  return `image_${timestamp}_${randomStr}.${extension}`;
}

/**
 * Sanitize filename to remove special characters
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^\w\s.-]/g, "")
    .replace(/\s+/g, "_")
    .substring(0, 100);
}

/**
 * Get file extension from MIME type
 */
export function getExtensionFromMimeType(mimeType: string): string {
  const mimeMap: { [key: string]: string } = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/avif": "avif",
    "image/bmp": "bmp",
    "image/tiff": "tiff",
  };

  return mimeMap[mimeType.toLowerCase()] || "jpg";
}

/**
 * Check if file is an image
 */
export function isImageFile(file: File | Blob): boolean {
  if (file instanceof File) {
    return file.type.startsWith("image/");
  }
  return file.type.startsWith("image/");
}