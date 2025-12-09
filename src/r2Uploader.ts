/**
 * R2 uploader module using AWS SDK v3
 */

import { S3Client, PutObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { Logger } from "./logger";
import { R2UploaderSettings } from "./settings";
import { wrapError, retryWithBackoff } from "./utils";

const logger = Logger.getInstance();

export interface UploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export class R2Uploader {
  private client: S3Client | null = null;
  private settings: R2UploaderSettings;

  constructor(settings: R2UploaderSettings) {
    this.settings = settings;
    this.initializeClient();
  }

  /**
   * Initialize S3 client for R2
   */
  private initializeClient(): void {
    try {
      if (!this.settings.r2AccessKeyId || !this.settings.r2SecretAccessKey) {
        logger.warn("R2 credentials not configured");
        return;
      }

      this.client = new S3Client({
        region: this.settings.r2Region,
        endpoint: this.settings.r2Endpoint,
        credentials: {
          accessKeyId: this.settings.r2AccessKeyId,
          secretAccessKey: this.settings.r2SecretAccessKey,
        },
        // Force path-style URLs for R2 compatibility
        forcePathStyle: false,
      });

      logger.info("R2 client initialized");
    } catch (error) {
      logger.error("Failed to initialize R2 client", error);
      this.client = null;
    }
  }

  /**
   * Update settings and reinitialize client
   */
  updateSettings(settings: R2UploaderSettings): void {
    this.settings = settings;
    this.initializeClient();
  }

  /**
   * Test R2 connection
   */
  async testConnection(): Promise<void> {
    if (!this.client) {
      throw new Error("R2 client not initialized. Please check your credentials.");
    }

    try {
      const command = new HeadBucketCommand({
        Bucket: this.settings.r2Bucket,
      });

      await this.client.send(command);
      logger.info("R2 connection test successful");
    } catch (error) {
      throw wrapError(error, "R2 connection test failed");
    }
  }

  /**
   * Upload file to R2
   */
  async upload(buffer: Buffer, key: string, contentType: string): Promise<UploadResult> {
    if (!this.client) {
      return {
        success: false,
        error: "R2 client not initialized",
      };
    }

    try {
      logger.info("Starting R2 upload", {
        key,
        size: buffer.length,
        contentType,
      });

      // Use multipart upload for better reliability
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.settings.r2Bucket,
          Key: key,
          Body: buffer,
          ContentType: contentType,
          CacheControl: "public, max-age=31536000, immutable",
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024, // 5MB parts
        leavePartsOnError: false,
      });

      // Set timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Upload timeout after ${this.settings.timeoutSeconds} seconds`));
        }, this.settings.timeoutSeconds * 1000);
      });

      // Race between upload and timeout
      await Promise.race([upload.done(), timeoutPromise]);

      const publicUrl = this.constructPublicUrl(key);

      logger.info("R2 upload successful", { key, url: publicUrl });

      return {
        success: true,
        url: publicUrl,
        key,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("R2 upload failed", error);

      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Upload with retry
   */
  async uploadWithRetry(
    buffer: Buffer,
    key: string,
    contentType: string
  ): Promise<UploadResult> {
    try {
      return await retryWithBackoff(
        () => this.upload(buffer, key, contentType),
        this.settings.retryAttempts
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      logger.error("All upload retry attempts failed", error);

      return {
        success: false,
        error: `Upload failed after ${this.settings.retryAttempts} attempts: ${errorMessage}`,
      };
    }
  }

  /**
   * Construct public URL for uploaded file
   */
  private constructPublicUrl(key: string): string {
    const baseUrl = this.settings.r2PublicBaseUrl.replace(/\/$/, "");
    const cleanKey = key.replace(/^\//, "");
    return `${baseUrl}/${cleanKey}`;
  }

  /**
   * Generate upload key with path pattern
   */
  generateUploadKey(fileName: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    let path = this.settings.uploadPath
      .replace("{year}", String(year))
      .replace("{month}", month)
      .replace("{day}", day)
      .replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes

    // Ensure path doesn't end with slash
    if (path && !path.endsWith("/")) {
      path += "/";
    }

    return `${path}${fileName}`;
  }

  /**
   * Get content type from format
   */
  getContentType(format: string): string {
    const contentTypes: { [key: string]: string } = {
      webp: "image/webp",
      avif: "image/avif",
      jpeg: "image/jpeg",
      jpg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
    };

    return contentTypes[format.toLowerCase()] || "application/octet-stream";
  }

  /**
   * Check if uploader is configured
   */
  isConfigured(): boolean {
    return !!(
      this.client &&
      this.settings.r2AccessKeyId &&
      this.settings.r2SecretAccessKey &&
      this.settings.r2Bucket &&
      this.settings.r2Endpoint &&
      this.settings.r2PublicBaseUrl
    );
  }
}