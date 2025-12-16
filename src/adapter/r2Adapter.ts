/**
 * R2 Storage Adapter
 */
import { S3Client, HeadBucketCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { StorageAdapter, UploadOptions, UploadResult } from "./storageAdapter";
import { R2Settings } from "../settings/data";
import { wrapError, Logger, ObsidianHttpHandler } from "../utils";

const logger = Logger.getInstance();

export class R2Adapter implements StorageAdapter {
  private client: S3Client | null = null;
  private settings: R2Settings;

  constructor(settings: R2Settings) {
    this.settings = settings;
    this.initialize();
  }

  public initialize(): void {
    try {
      if (!this.settings.r2AccessKeyId || !this.settings.r2SecretAccessKey) {
        logger.warn("R2 credentials not configured");
        this.client = null;
        return;
      }

      this.client = new S3Client({
        region: this.settings.r2Region || "auto",
        endpoint: this.settings.r2Endpoint,
        credentials: {
          accessKeyId: this.settings.r2AccessKeyId,
          secretAccessKey: this.settings.r2SecretAccessKey,
        },
        forcePathStyle: false, // Cloudflare R2 通常不需要强制 path style，视具体情况而定
        requestHandler: new ObsidianHttpHandler(),
      });

      logger.info("R2 adapter initialized");
    } catch (error) {
      logger.error("Failed to initialize R2 adapter", error);
      this.client = null;
    }
  }

  public isConfigured(): boolean {
    return !!(this.client && this.settings.r2Bucket);
  }

  public async testConnection(): Promise<void> {
    if (!this.client) throw new Error("Adapter not initialized");
    try{
      const command = new HeadBucketCommand({ Bucket: this.settings.r2Bucket });
      await this.client.send(command);
    }catch (error) {
      throw wrapError(error, "R2 connection test failed");
    }
  }

  /**
   * 纯粹的上传逻辑
   */
  public async put(key: string, buffer: Buffer, options?: UploadOptions): Promise<UploadResult> {
    if (!this.client) return { success: false, error: "Adapter not initialized" };

    try {
      const upload = new Upload({
        client: this.client,
        params: {
          Bucket: this.settings.r2Bucket,
          Key: key,
          Body: buffer,
          ContentType: options?.contentType || "application/octet-stream",
          // 可以根据需要从 options 传入 CacheControl
          CacheControl: "public, max-age=31536000, immutable",
        },
        queueSize: 4,
        partSize: 5 * 1024 * 1024,
      });
      await upload.done();
      
      // Adapter 只返回 key，因为 URL 构造是业务层的逻辑（涉及域名配置）
      return { success: true, key }; 

    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      logger.error("R2 upload failed", error);
      return { success: false, error: msg };
    }
  }

  public updateSettings(settings: R2Settings): void {
    this.settings = settings;
    this.initialize();
  }
}