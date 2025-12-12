/**
 * Settings management class
 */

import { PluginSettings, DEFAULT_SETTINGS, R2Settings, ImageProcessingSettings,UploadSettings,DataPersister } from "./data";

export class SettingsManager {
  private static instance: SettingsManager;
  private persister: DataPersister;
  private settings: PluginSettings;

  private constructor(persister: DataPersister) {
    this.persister = persister;
    this.settings = Object.assign({}, DEFAULT_SETTINGS);
  }

  public static initialize(persister: DataPersister): SettingsManager {
    if (!SettingsManager.instance) {
      SettingsManager.instance = new SettingsManager(persister);
    }
    return SettingsManager.instance;
  }

  public static getInstance(): SettingsManager {
    if (!SettingsManager.instance) {
      throw new Error("SettingsManager not initialized! Call initialize() first.");
    }
    return SettingsManager.instance;
  }

  /**
   * Load settings from plugin data
   */
  async load(): Promise<PluginSettings> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.persister.loadData());
    return this.settings;
  }

  /**
   * Save settings to plugin data
   */
  async save(): Promise<void> {
    await this.persister.saveData(this.settings);
  }

  /**
   * Get current settings
   */
  get(): PluginSettings {
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

    };
  }

  getUploadSettings(): UploadSettings {
    return {
        uploadPathPattern: this.settings.uploadPathPattern,
        publicBaseUrl: this.settings.publicBaseUrl,
        enableUpload: this.settings.enableUpload,
        deleteLocalAfterUpload: this.settings.deleteLocalAfterUpload,
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
  set(newSettings: Partial<PluginSettings>): void {
    this.settings = { ...this.settings, ...newSettings };
  }

  /**
   * Update a single setting
   */
  update(key: keyof PluginSettings, value: any): void {
    this.settings = { ...this.settings, [key]: value };
  }
}