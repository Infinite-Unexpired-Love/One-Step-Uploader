/**
 * Settings panel and configuration schema
 */

import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import R2ImageUploaderPlugin from "../main";
import { ImageFormat, R2UploaderSettings } from "./data";

export class R2UploaderSettingTab extends PluginSettingTab {
  plugin: R2ImageUploaderPlugin;

  constructor(app: App, plugin: R2ImageUploaderPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    containerEl.createEl("h2", { text: "R2 Image Uploader Settings" });

    // R2 Configuration Section
    containerEl.createEl("h3", { text: "Cloudflare R2 Configuration" });

    new Setting(containerEl)
      .setName("Enable Upload")
      .setDesc("Enable automatic upload to R2. If disabled, images will only be saved locally.")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.enableUpload).onChange(async (value) => {
          this.plugin.settings.enableUpload = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName("R2 Endpoint")
      .setDesc("Your Cloudflare R2 endpoint URL")
      .addText((text) =>
        text
          .setPlaceholder("https://your-account-id.r2.cloudflarestorage.com")
          .setValue(this.plugin.settings.r2Endpoint)
          .onChange(async (value) => {
            this.plugin.settings.r2Endpoint = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Access Key ID")
      .setDesc("R2 Access Key ID")
      .addText((text) => {
        text
          .setPlaceholder("Enter Access Key ID")
          .setValue(this.plugin.settings.r2AccessKeyId)
          .onChange(async (value) => {
            this.plugin.settings.r2AccessKeyId = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("Secret Access Key")
      .setDesc("R2 Secret Access Key (stored securely)")
      .addText((text) => {
        text
          .setPlaceholder("Enter Secret Access Key")
          .setValue(this.plugin.settings.r2SecretAccessKey)
          .onChange(async (value) => {
            this.plugin.settings.r2SecretAccessKey = value.trim();
            await this.plugin.saveSettings();
          });
        text.inputEl.type = "password";
      });

    new Setting(containerEl)
      .setName("Bucket Name")
      .setDesc("R2 bucket name")
      .addText((text) =>
        text
          .setPlaceholder("obsidian-images")
          .setValue(this.plugin.settings.r2Bucket)
          .onChange(async (value) => {
            this.plugin.settings.r2Bucket = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Region")
      .setDesc('R2 region (usually "auto" for Cloudflare)')
      .addText((text) =>
        text
          .setPlaceholder("auto")
          .setValue(this.plugin.settings.r2Region)
          .onChange(async (value) => {
            this.plugin.settings.r2Region = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Public Base URL")
      .setDesc("Public URL for accessing uploaded images (your R2 custom domain)")
      .addText((text) =>
        text
          .setPlaceholder("https://your-domain.com")
          .setValue(this.plugin.settings.r2PublicBaseUrl)
          .onChange(async (value) => {
            this.plugin.settings.r2PublicBaseUrl = value.trim().replace(/\/$/, "");
            await this.plugin.saveSettings();
          })
      );

    // Image Processing Section
    containerEl.createEl("h3", { text: "Image Processing" });

    new Setting(containerEl)
      .setName("Output Format")
      .setDesc("Format to convert images to")
      .addDropdown((dropdown) =>
        dropdown
          .addOption("webp", "WebP (Recommended)")
          .addOption("avif", "AVIF (Smaller, slower)")
          .addOption("jpeg", "JPEG")
          .addOption("png", "PNG")
          .setValue(this.plugin.settings.imageFormat)
          .onChange(async (value) => {
            this.plugin.settings.imageFormat = value as ImageFormat;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Image Quality")
      .setDesc("Quality for lossy compression (1-100, higher is better)")
      .addSlider((slider) =>
        slider
          .setLimits(1, 100, 1)
          .setValue(this.plugin.settings.imageQuality)
          .setDynamicTooltip()
          .onChange(async (value) => {
            this.plugin.settings.imageQuality = value;
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Max Width")
      .setDesc("Maximum image width in pixels (0 = no limit)")
      .addText((text) =>
        text
          .setPlaceholder("1920")
          .setValue(String(this.plugin.settings.maxWidth))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.maxWidth = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Max Height")
      .setDesc("Maximum image height in pixels (0 = no limit)")
      .addText((text) =>
        text
          .setPlaceholder("1080")
          .setValue(String(this.plugin.settings.maxHeight))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 0) {
              this.plugin.settings.maxHeight = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Preserve Original Name")
      .setDesc("Keep the original filename (with timestamp suffix)")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.preserveOriginalName).onChange(async (value) => {
          this.plugin.settings.preserveOriginalName = value;
          await this.plugin.saveSettings();
        })
      );

    // Upload Options Section
    containerEl.createEl("h3", { text: "Upload Options" });

    new Setting(containerEl)
      .setName("Upload Path")
      .setDesc(
        "Path pattern for uploaded files. Variables: {year}, {month}, {day}. Example: images/{year}/{month}"
      )
      .addText((text) =>
        text
          .setPlaceholder("images/{year}/{month}")
          .setValue(this.plugin.settings.uploadPath)
          .onChange(async (value) => {
            this.plugin.settings.uploadPath = value.trim();
            await this.plugin.saveSettings();
          })
      );

    new Setting(containerEl)
      .setName("Delete Local After Upload")
      .setDesc("⚠️ Delete local image file after successful upload (not recommended)")
      .addToggle((toggle) =>
        toggle.setValue(this.plugin.settings.deleteLocalAfterUpload).onChange(async (value) => {
          this.plugin.settings.deleteLocalAfterUpload = value;
          await this.plugin.saveSettings();
        })
      );

    // Advanced Section
    containerEl.createEl("h3", { text: "Advanced" });

    new Setting(containerEl)
      .setName("Retry Attempts")
      .setDesc("Number of retry attempts for failed uploads")
      .addText((text) =>
        text
          .setPlaceholder("3")
          .setValue(String(this.plugin.settings.retryAttempts))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 1 && num <= 10) {
              this.plugin.settings.retryAttempts = num;
              await this.plugin.saveSettings();
            }
          })
      );

    new Setting(containerEl)
      .setName("Timeout (seconds)")
      .setDesc("Upload timeout in seconds")
      .addText((text) =>
        text
          .setPlaceholder("30")
          .setValue(String(this.plugin.settings.timeoutSeconds))
          .onChange(async (value) => {
            const num = parseInt(value);
            if (!isNaN(num) && num >= 5 && num <= 300) {
              this.plugin.settings.timeoutSeconds = num;
              await this.plugin.saveSettings();
            }
          })
      );

    // Test Connection Button
    new Setting(containerEl)
      .setName("Test Connection")
      .setDesc("Test your R2 configuration")
      .addButton((button) =>
        button
          .setButtonText("Test Connection")
          .setCta()
          .onClick(async () => {
            button.setDisabled(true);
            button.setButtonText("Testing...");

            try {
              await this.plugin.testConnection();
              new Notice("✅ R2 connection successful!");
            } catch (error) {
              new Notice(`❌ R2 connection failed: ${error.message}`);
            } finally {
              button.setDisabled(false);
              button.setButtonText("Test Connection");
            }
          })
      );
  }
}