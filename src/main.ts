/**
 * Main plugin entry point
 * Cross-platform compatible (Desktop + Mobile)
 */

import { Plugin } from "obsidian";
import {
  PasteAndGoSettingTab,
  SettingsManager
} from "./settings";
import { R2Adapter } from "./adapter";
import { RemoteRepository,LocalRepository } from "./repository";
import { Logger } from "./utils";
import { PasteHandler } from "./handler/pasteHandler";

const logger = Logger.getInstance();

export default class PasteAndGoPlugin extends Plugin {
  private settingsManager: SettingsManager;
  private r2Adapter: R2Adapter;
  private localRepository: LocalRepository;
  private remoteRepository: RemoteRepository;
  private pasteHandler: PasteHandler;

  async onload() {
    logger.info("Loading Paste And Go Plugin");

    // Initialize settings manager
    this.settingsManager=SettingsManager.initialize(this);

    // Load settings
    await this.settingsManager.load();

    // Initialize modules
    this.r2Adapter = new R2Adapter(this.settingsManager.getR2Settings());
    const remoteRepoConfig={
      uploadPathPattern: this.settingsManager.getUploadSettings().uploadPathPattern,
      publicBaseUrl: this.settingsManager.getUploadSettings().publicBaseUrl,
    }
    this.localRepository = new LocalRepository(this.app);
    this.remoteRepository = new RemoteRepository(this.r2Adapter,remoteRepoConfig);
    this.pasteHandler = new PasteHandler(this.localRepository, this.remoteRepository);
    
    // Add settings tab
    this.addSettingTab(new PasteAndGoSettingTab(this.app, this.testConnection.bind(this),this.onR2SettingsChange.bind(this)));
    
    // Register paste event handler
    this.registerEvent(
      this.app.workspace.on("editor-paste", this.pasteHandler.handle.bind(this))
    );

    // Register drop event handler
    this.registerEvent(
      this.app.workspace.on("editor-drop", this.pasteHandler.handle.bind(this))
    );

    logger.info("Paste And Go Plugin loaded successfully");
  }

  onunload() {
    logger.info("Unloading Paste And Go Plugin");
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<void> {
    if (!this.r2Adapter.isConfigured()) {
      throw new Error("R2 is not fully configured. Please check all settings.");
    }

    await this.remoteRepository.testConnection();
  }

  /**
   * Notify R2 adapter of settings changes
   */
  onR2SettingsChange() {
    if (this.r2Adapter) {
      this.r2Adapter.updateSettings(this.settingsManager.getR2Settings());
    }
  }

}