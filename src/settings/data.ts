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
  r2PublicBaseUrl: string;

  // Upload Options
  uploadPath: string;
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

// Combined settings interface
export interface R2UploaderSettings extends R2Settings, ImageProcessingSettings {}

export const DEFAULT_R2_SETTINGS: R2Settings = {
  // R2 Configuration
  r2Endpoint: "https://your-account-id.r2.cloudflarestorage.com",
  r2AccessKeyId: "",
  r2SecretAccessKey: "",
  r2Bucket: "obsidian-images",
  r2Region: "auto",
  r2PublicBaseUrl: "https://your-domain.com",

  // Upload Options
  uploadPath: "images/{year}/{month}",
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

export const DEFAULT_SETTINGS: R2UploaderSettings = {
  ...DEFAULT_R2_SETTINGS,
  ...DEFAULT_IMAGE_PROCESSING_SETTINGS,
};