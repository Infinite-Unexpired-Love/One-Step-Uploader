/**
 * Settings panel and configuration schema
 */

import { App, Plugin, Notice, PluginSettingTab, Setting } from "obsidian";
import { ImageFormat,PluginSettings } from "./data";
import { SettingsManager } from "./manager";

export class OneStepUploaderSettingTab extends PluginSettingTab {
  private onTestConnection: () => Promise<void>;
  private onR2SettingsChange:() => void;
  private manager: SettingsManager;
  private ui: HTMLElement;

  constructor(app: App, plugin: Plugin,onTestConnection: () => Promise<void>,onR2SettingsChange:() => void) {
    super(app, plugin);
    this.onTestConnection=onTestConnection;
    this.onR2SettingsChange=onR2SettingsChange;
    this.manager = SettingsManager.getInstance();
    this.ui = this.containerEl;
    this.ui.empty();
  }

  display(): void {
    this.ui.createEl("h2", { text: "One Step Uploader Settings" });

    // R2 Configuration Section
    this.ui.createEl("h3", { text: "Cloudflare R2 Configuration" });
    {
      this.addToggleInputEL(
        "Enable Upload",
        "Enable automatic upload to R2. If disabled, images will only be saved locally.",
        "enableUpload",
        this.onR2SettingsChange
      )

      this.addTextInputEL(
        "R2 Endpoint",
        "Your Cloudflare R2 endpoint URL",
        "r2Endpoint",
        false,
        this.onR2SettingsChange
      )
      
      this.addTextInputEL(
        "Access Key ID",
        "R2 Access Key ID",
        "r2AccessKeyId",
        false,
        this.onR2SettingsChange
      )
      
      this.addTextInputEL(
        "Secret Access Key",
        "R2 Secret Access Key (stored securely)",
        "r2SecretAccessKey",
        true,
        this.onR2SettingsChange
      )
      
      this.addTextInputEL(
        "Bucket Name",
        "R2 bucket name",
        "r2Bucket",
        false,
        this.onR2SettingsChange
      )
      
      this.addTextInputEL(
        "Region",
        'R2 region (usually "auto" for Cloudflare)',
        "r2Region",
        false,
        this.onR2SettingsChange
      )
      
      this.addTextInputEL(
        "Public Base URL",
        "Public URL for accessing uploaded images (your R2 custom domain)",
        "publicBaseUrl",
        false,
        this.onR2SettingsChange
      )

      // Test Connection Button
      new Setting(this.ui)
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
                await this.onTestConnection();
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
    // Image Processing Section
    this.ui.createEl("h3", { text: "Image Processing" });
    {
      // 下拉菜单特殊处理
      new Setting(this.ui)
        .setName("Output Format")
        .setDesc("Format to convert images to")
        .addDropdown((dropdown) =>
          dropdown
            .addOption("webp", "WebP (Recommended)")
            .addOption("avif", "AVIF (Smaller, slower)")
            .addOption("jpeg", "JPEG")
            .addOption("png", "PNG")
            .setValue(this.manager.get().imageFormat)
            .onChange(async (value) => {
              this.manager.update("imageFormat", value as ImageFormat);
              await this.manager.save();
            })
        );

      // 滑动条特殊处理
      new Setting(this.ui)
        .setName("Image Quality")
        .setDesc("Quality for lossy compression (1-100)")
        .addSlider((slider) =>
          slider
            .setLimits(1, 100, 1)
            .setValue(this.manager.get().imageQuality)
            .setDynamicTooltip()
            .onChange(async (value) => {
              this.manager.update("imageQuality", value);
              await this.manager.save();
            })
        );

      this.addNumberInputEL(
        "Max Width",
        "Maximum image width in pixels (0 = no limit)",
        "maxWidth"
      );

      this.addNumberInputEL(
        "Max Height",
        "Maximum image height in pixels (0 = no limit)",
        "maxHeight"
      );

      this.addToggleInputEL(
        "Preserve Original Name",
        "Keep the original filename (with timestamp suffix)",
        "preserveOriginalName"
      );
    }

    // Upload Options Section
    this.ui.createEl("h3", { text: "Upload Options" });
    {
      this.addTextInputEL(
        "Upload Path",
        "Path pattern: {year}, {month}, {day}",
        "uploadPathPattern",
      );

      this.addToggleInputEL(
        "Delete Local After Upload",
        "⚠️ Delete local image file after successful upload",
        "deleteLocalAfterUpload"
      );

      this.addNumberInputEL(
          "Retry Attempts", 
          "Number of retry attempts", 
          "retryAttempts"
      );

      this.addNumberInputEL(
          "Timeout (seconds)", 
          "Upload timeout in seconds", 
          "timeoutSeconds"
      );
    }

  }

  private addToggleInputEL(
    name: string,
    desc: string,
    key: keyof PluginSettings,
    callback?:() => void
  ) {
    new Setting(this.ui)
      .setName(name)
      .setDesc(desc)
      .addToggle((toggle) =>
        toggle
          .setValue(this.manager.get()[key] as boolean)
          .onChange(async (value) => {
            this.manager.update(key, value);
            await this.manager.save();
            if(callback){
              callback();
            }
          })
      );
  }

  private addTextInputEL(
    name: string,
    desc: string,
    key: keyof PluginSettings,
    isPassword: boolean = false,
    callback?:() => void
  ) {
    new Setting(this.ui)
      .setName(name)
      .setDesc(desc)
      .addText((text) => {
        text
          .setValue(String(this.manager.get()[key] || ""))
          .onChange(async (value) => {
            this.manager.update(key, value.trim());
            await this.manager.save();
            if(callback){
              callback();
            }
          });
        
        if (isPassword) text.inputEl.type = "password";
      });
  }

  /**
   * 通用 Number Input 创建器
   * 包含 parseInt 逻辑和非空校验
   */
  private addNumberInputEL(
    name: string,
    desc: string,
    key: keyof PluginSettings,
    callback?:() => void
  ) {
    const manager = SettingsManager.getInstance();
    new Setting(this.ui)
      .setName(name)
      .setDesc(desc)
      .addText((text) =>
        text
          .setValue(String(manager.get()[key]))
          .onChange(async (value) => {
            const num = parseInt(value);
            // 简单的校验逻辑
            if (!isNaN(num) && num >= 0) {
              manager.update(key, num);
              await manager.save();
              if(callback){
                callback();
              }
            }
          })
      );
  }
}