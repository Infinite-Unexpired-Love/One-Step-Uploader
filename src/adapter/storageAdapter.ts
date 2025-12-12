/**
 * Storage Adapter Interface
 * 负责底层传输，不包含任何路径生成或文件类型判断逻辑
 */

export interface UploadOptions {
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface UploadResult {
  success: boolean;
  key?: string;
  error?: string;
}

export interface StorageAdapter {
  /**
   * 初始化适配器
   */
  initialize(): void;

  /**
   * 检查是否已配置
   */
  isConfigured(): boolean;

  /**
   * 测试连接
   */
  testConnection(): Promise<void>;

  /**
   * 上传对象 (核心方法)
   * 只负责把 buffer 放到指定的 key，不关心 key 是怎么生成的
   */
  put(key: string, buffer: Buffer, options?: UploadOptions): Promise<UploadResult>;

  /**
   * 更新设置
   */
  updateSettings(settings: any): void;
}