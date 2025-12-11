/**
 * Image utility functions extracted from ImageProcessor
 */

import { Logger } from "./logger";
import { ImageFormat } from "../settings/data";


const logger = Logger.getInstance();

export class ImageUtils {
  /**
   * Validate if file is a valid image
   */
  static async validateImage(file: File | Blob): Promise<boolean> {
    try {
      const bitmap = await createImageBitmap(file);
      bitmap.close();
      return true;
    } catch (error) {
      logger.warn("Invalid image file", error);
      return false;
    }
  }

  /**
   * Get image metadata without full processing
   */
  static async getMetadata(
    file: File | Blob
  ): Promise<{ width: number; height: number; type: string }> {
    try {
      const bitmap = await createImageBitmap(file);
      const metadata = {
        width: bitmap.width,
        height: bitmap.height,
        type: file.type,
      };
      bitmap.close();
      return metadata;
    } catch (error) {
      throw error instanceof Error ? error : new Error(String(error));
    }
  }

  /**
   * Convert Blob to ArrayBuffer
   */
  static async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
  }

  /**
   * Get MIME type from format
   */
  static getMimeType(format: ImageFormat): string {
    const mimeTypes: Record<ImageFormat, string> = {
      webp: "image/webp",
      avif: "image/avif",
      jpeg: "image/jpeg",
      png: "image/png",
    };

    return mimeTypes[format] || "image/jpeg";
  }

  /**
   * Calculate target dimensions maintaining aspect ratio
   */
  static calculateDimensions(
    originalWidth: number,
    originalHeight: number,
    maxWidth: number,
    maxHeight: number
  ): { width: number; height: number } {
    // No limits set
    if (maxWidth === 0 && maxHeight === 0) {
      return { width: originalWidth, height: originalHeight };
    }

    let width = originalWidth;
    let height = originalHeight;

    // Apply max width constraint
    if (maxWidth > 0 && width > maxWidth) {
      const ratio = maxWidth / width;
      width = maxWidth;
      height = Math.round(height * ratio);
    }

    // Apply max height constraint
    if (maxHeight > 0 && height > maxHeight) {
      const ratio = maxHeight / height;
      height = maxHeight;
      width = Math.round(width * ratio);
    }

    return { width, height };
  }

  /**
   * Check if format is supported by browser
   */
  static async isSupportedFormat(format: ImageFormat): Promise<boolean> {
    // Create a small test canvas
    let canvas: OffscreenCanvas | HTMLCanvasElement;

    // Try OffscreenCanvas first (better performance, works in workers)
    if (typeof OffscreenCanvas !== "undefined") {
      canvas = new OffscreenCanvas(1, 1);
    } else {
      // Fallback to HTMLCanvasElement
      canvas = document.createElement("canvas");
      canvas.width = 1;
      canvas.height = 1;
    }

    const mimeType = ImageUtils.getMimeType(format);

    try {
      if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: mimeType });
        return blob.type === mimeType;
      } else {
        return new Promise<boolean>((resolve) => {
          (canvas as HTMLCanvasElement).toBlob(
            (blob) => {
              resolve(blob !== null && blob.type === mimeType);
            },
            mimeType
          );
        });
      }
    } catch (error) {
      logger.warn(`Format ${format} not supported`, error);
      return false;
    } finally {
      // Clean up if needed
    }
  }
}