/**
 * Image processing module using Browser Native APIs
 * Cross-platform compatible (Desktop + Mobile)
 */

import { Logger } from "./logger";
import { ImageFormat } from "./settings";
import { wrapError, formatBytes } from "./utils";

const logger = Logger.getInstance();

export interface ProcessedImage {
  blob: Blob;
  format: string;
  width: number;
  height: number;
  size: number;
}

export interface ImageProcessorOptions {
  format: ImageFormat;
  quality: number;
  maxWidth: number;
  maxHeight: number;
}

export class ImageProcessor {
  /**
   * Process image using Canvas API: compress and convert format
   */
  async processImage(
    file: File | Blob,
    options: ImageProcessorOptions
  ): Promise<ProcessedImage> {
    try {
      logger.debug("Processing image", {
        inputSize: formatBytes(file.size),
        options,
      });

      const originalSize = file.size;

      // Step 1: Load image
      const bitmap = await this.loadImage(file);
      const originalWidth = bitmap.width;
      const originalHeight = bitmap.height;

      logger.debug("Original image loaded", {
        width: originalWidth,
        height: originalHeight,
      });

      // Step 2: Calculate target dimensions
      const { width, height } = this.calculateDimensions(
        originalWidth,
        originalHeight,
        options.maxWidth,
        options.maxHeight
      );

      // Step 3: Create canvas and draw image
      const canvas = this.createCanvas(width, height);
      const ctx = canvas.getContext("2d") as CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
      
      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Use high-quality scaling
      if ('imageSmoothingEnabled' in ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
      
      ctx.drawImage(bitmap, 0, 0, width, height);

      // Clean up bitmap
      bitmap.close();

      // Step 4: Convert to target format
      const blob = await this.canvasToBlob(canvas, options.format, options.quality);

      const processed: ProcessedImage = {
        blob,
        format: options.format,
        width,
        height,
        size: blob.size,
      };

      const compressionRatio = ((1 - processed.size / originalSize) * 100).toFixed(1);
      logger.info("Image processed successfully", {
        originalSize: formatBytes(originalSize),
        processedSize: formatBytes(processed.size),
        compressionRatio: `${compressionRatio}%`,
        dimensions: `${processed.width}x${processed.height}`,
        format: processed.format,
      });

      return processed;
    } catch (error) {
      throw wrapError(error, "Failed to process image");
    }
  }

  /**
   * Load image from Blob/File using createImageBitmap
   */
  private async loadImage(source: Blob | File): Promise<ImageBitmap> {
    try {
      return await createImageBitmap(source);
    } catch (error) {
      throw wrapError(error, "Failed to load image");
    }
  }

  /**
   * Calculate target dimensions maintaining aspect ratio
   */
  private calculateDimensions(
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
   * Create canvas (OffscreenCanvas if available, fallback to HTMLCanvasElement)
   */
  private createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
    // Try OffscreenCanvas first (better performance, works in workers)
    if (typeof OffscreenCanvas !== "undefined") {
      return new OffscreenCanvas(width, height);
    }

    // Fallback to HTMLCanvasElement
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  /**
   * Convert canvas to Blob with specified format and quality
   */
  private async canvasToBlob(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    format: ImageFormat,
    quality: number
  ): Promise<Blob> {
    const mimeType = this.getMimeType(format);
    const qualityValue = quality / 100; // Convert 0-100 to 0-1

    // OffscreenCanvas has convertToBlob method
    if (canvas instanceof OffscreenCanvas) {
      return await canvas.convertToBlob({
        type: mimeType,
        quality: qualityValue,
      });
    }

    // HTMLCanvasElement uses toBlob
    return new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to convert canvas to blob"));
          }
        },
        mimeType,
        qualityValue
      );
    });
  }

  /**
   * Get MIME type from format
   */
  private getMimeType(format: ImageFormat): string {
    const mimeTypes: Record<ImageFormat, string> = {
      webp: "image/webp",
      avif: "image/avif",
      jpeg: "image/jpeg",
      png: "image/png",
    };

    return mimeTypes[format] || "image/jpeg";
  }

  /**
   * Validate if file is a valid image
   */
  async validateImage(file: File | Blob): Promise<boolean> {
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
  async getMetadata(
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
      throw wrapError(error, "Failed to read image metadata");
    }
  }

  /**
   * Convert Blob to ArrayBuffer
   */
  async blobToArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
    return await blob.arrayBuffer();
  }

  /**
   * Check if format is supported by browser
   */
  async isSupportedFormat(format: ImageFormat): Promise<boolean> {
    // Create a small test canvas
    const canvas = this.createCanvas(1, 1);
    const mimeType = this.getMimeType(format);

    try {
      if (canvas instanceof OffscreenCanvas) {
        const blob = await canvas.convertToBlob({ type: mimeType });
        return blob.type === mimeType;
      } else {
        return new Promise<boolean>((resolve) => {
          canvas.toBlob(
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
    }
  }
}