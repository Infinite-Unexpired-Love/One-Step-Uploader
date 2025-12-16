/**
 * Image processing module using Browser Native APIs
 * Cross-platform compatible (Desktop + Mobile)
 */

import { ImageFormat,ImageProcessingSettings } from "../settings/data";
import { wrapError, formatBytes,ImageUtils,Logger } from "../utils";

const logger = Logger.getInstance();

export interface ProcessedImage {
  blob: Blob;
  format: string;
  width: number;
  height: number;
  size: number;
}

// Type alias for backwards compatibility
export interface ImageProcessorOptions extends ImageProcessingSettings{
  
}

export class ImageConvertProcessor {
  /**
   * Process image using Canvas API: compress and convert format
   */
  static async process(
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
      const { width, height } = ImageUtils.calculateDimensions(
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
      const blob = await this.canvasToBlob(canvas, options.imageFormat, options.imageQuality);

      const processed: ProcessedImage = {
        blob,
        format: options.imageFormat,
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
  private static async loadImage(source: Blob | File): Promise<ImageBitmap> {
    try {
      return await createImageBitmap(source);
    } catch (error) {
      throw wrapError(error, "Failed to load image");
    }
  }

  /**
   * Create canvas (OffscreenCanvas if available, fallback to HTMLCanvasElement)
   */
  private static createCanvas(width: number, height: number): OffscreenCanvas | HTMLCanvasElement {
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
  private static async canvasToBlob(
    canvas: OffscreenCanvas | HTMLCanvasElement,
    format: ImageFormat,
    quality: number
  ): Promise<Blob> {
    const mimeType = ImageUtils.getMimeType(format);
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
}