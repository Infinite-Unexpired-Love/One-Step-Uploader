/**
 * Settings data interface and defaults
 */

export type ImageFormat = "webp" | "avif" | "jpeg" | "png";

// Individual module settings interfaces
export interface R2Settings {
  // R2 Configuration
  r2Endpoint: string;
  r2AccessKeyId: string;
  r2SecretAccessKey: string;
  r2Bucket: string;
  r2Region: string;

}

export interface UploadSettings {
  uploadPathPattern: string;
  publicBaseUrl: string;
  enableUpload: boolean;
  deleteLocalAfterUpload: boolean;

  // Advanced
  retryAttempts: number;
  timeoutSeconds: number;
}

export interface ImageProcessingSettings {
  // Image Processing
  imageFormat: ImageFormat;
  imageQuality: number;
  maxWidth: number;
  maxHeight: number;
  preserveOriginalName: boolean;
}

export interface DataPersister {
  loadData(): Promise<any>;
  saveData(data: any): Promise<void>;
}

// Combined settings interface
export interface PluginSettings extends R2Settings, UploadSettings,ImageProcessingSettings {}

export const DEFAULT_R2_SETTINGS: R2Settings = {
  // R2 Configuration
  r2Endpoint: "https://your-account-id.r2.cloudflarestorage.com",
  r2AccessKeyId: "",
  r2SecretAccessKey: "",
  r2Bucket: "obsidian-images",
  r2Region: "auto",
};

export const DEFAULT_UPLOAD_SETTINGS: UploadSettings = {
  uploadPathPattern: "images/{year}/{month}",
  publicBaseUrl: "https://your-domain.com",
  enableUpload: true,
  deleteLocalAfterUpload: false,

  // Advanced
  retryAttempts: 3,
  timeoutSeconds: 30,
};

export const DEFAULT_IMAGE_PROCESSING_SETTINGS: ImageProcessingSettings = {
  // Image Processing
  imageFormat: "webp",
  imageQuality: 80,
  maxWidth: 1920,
  maxHeight: 1080,
  preserveOriginalName: false,
};

export const DEFAULT_SETTINGS: PluginSettings = {
  ...DEFAULT_R2_SETTINGS,
  ...DEFAULT_UPLOAD_SETTINGS,
  ...DEFAULT_IMAGE_PROCESSING_SETTINGS,
};