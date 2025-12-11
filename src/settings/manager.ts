/**
 * Settings management class
 */

import R2ImageUploaderPlugin from "../main";
import { R2UploaderSettings, DEFAULT_SETTINGS, R2Settings, ImageProcessingSettings } from "./data";

export class SettingsManager {
  private plugin: R2ImageUploaderPlugin;
  private settings: R2UploaderSettings;

  constructor(plugin: R2ImageUploaderPlugin) {
    this.plugin = plugin;
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
  }

  /**
   * Load settings from plugin data
   */
  async load(): Promise<R2UploaderSettings> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.plugin.loadData());
    return this.settings;
  }

  /**
   * Save settings to plugin data
   */
  async save(): Promise<void> {
    await this.plugin.saveData(this.settings);
  }

  /**
   * Get current settings
   */
  get(): R2UploaderSettings {
    return this.settings;
  }

  getR2Settings(): R2Settings {
    return {
        // R2 Configuration
        r2Endpoint: this.settings.r2Endpoint,
        r2AccessKeyId: this.settings.r2AccessKeyId,
        r2SecretAccessKey: this.settings.r2SecretAccessKey,
        r2Bucket: this.settings.r2Bucket,
        r2Region: this.settings.r2Region,
        r2PublicBaseUrl: this.settings.r2PublicBaseUrl,

        // Upload Options
        uploadPath: this.settings.uploadPath,
        enableUpload: this.settings.enableUpload,
        deleteLocalAfterUpload: this.settings.deleteLocalAfterUpload,

        // Advanced
        retryAttempts: this.settings.retryAttempts,
        timeoutSeconds: this.settings.timeoutSeconds,
    };
  }

  getImageProcessingSettings(): ImageProcessingSettings {
    return {
        imageFormat: this.settings.imageFormat,
        imageQuality: this.settings.imageQuality,
        maxWidth: this.settings.maxWidth,
        maxHeight: this.settings.maxHeight,
        preserveOriginalName: this.settings.preserveOriginalName,
    };
  }

  /**
   * Update settings
   */
  set(newSettings: Partial<R2UploaderSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Update a single setting
   */
  update(key: keyof R2UploaderSettings, value: any): void {
    this.settings = { ...this.settings, [key]: value };
  }
}