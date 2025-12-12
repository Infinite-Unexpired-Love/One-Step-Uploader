/**
 * Media Repository
 * 负责业务逻辑：文件命名、路径规划、类型判断
 */
import { StorageAdapter } from "../adapter";

// 定义 Repository 需要的配置，解耦了具体的 R2Settings
export interface MediaRepoConfig {
  uploadPathPattern: string; // e.g., "uploads/{year}/{month}"
  publicBaseUrl: string;     // e.g., "https://cdn.example.com"
}

export interface MediaUploadResult {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export class MediaRepository {
  constructor(
    private adapter: StorageAdapter,
    private config: MediaRepoConfig
  ) {}

  /**
   * 上传文件的主入口
   */
  async upload(buffer: Buffer, originalFileName: string, format: string): Promise<MediaUploadResult> {
    if (!this.adapter.isConfigured()) {
      return { success: false, error: "Storage adapter is not configured" };
    }

    // 1. 业务决策：文件类型
    const contentType = this.getContentType(format);

    // 2. 业务决策：存储路径 (Key)
    const key = this.generateKey(originalFileName);

    // 3. 执行：调用 Adapter 传输
    const result = await this.adapter.put(key, buffer, { contentType });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // 4. 业务决策：生成最终访问 URL
    const publicUrl = this.constructPublicUrl(key);

    return {
      success: true,
      key: key,
      url: publicUrl
    };
  }

  /**
   * 更新配置
   */
  updateConfig(config: MediaRepoConfig) {
    this.config = config;
  }

  testConnection(): Promise<void> {
    return this.adapter.testConnection();
  }

  // 业务逻辑

  private generateKey(fileName: string): string {
    const now = new Date();
    const year = String(now.getFullYear());
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    let path = this.config.uploadPathPattern
      .replace("{year}", year)
      .replace("{month}", month)
      .replace("{day}", day)
      .replace(/^\/+|\/+$/g, ""); // Remove leading/trailing slashes

    if (path && !path.endsWith("/")) {
      path += "/";
    }

    return `${path}${fileName}`;
  }

  private constructPublicUrl(key: string): string {
    const baseUrl = this.config.publicBaseUrl.replace(/\/$/, "");
    const cleanKey = key.replace(/^\//, "");
    return `${baseUrl}/${cleanKey}`;
  }

  private getContentType(format: string): string {
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
}