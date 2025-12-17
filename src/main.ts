/**
 * Main plugin entry point
 * Cross-platform compatible (Desktop + Mobile)
 */

import { Plugin, MarkdownView } from "obsidian";
import {
  OneStepUploaderSettingTab,
  SettingsManager
} from "./settings";
import { R2Adapter } from "./adapter";
import { RemoteRepository,LocalRepository } from "./repository";
import { Logger } from "./utils";
import { PasteHandler } from "./handler/pasteHandler";

const logger = Logger.getInstance();

export default class OneStepUploaderPlugin extends Plugin {
  private settingsManager: SettingsManager;
  private r2Adapter: R2Adapter;
  private localRepository: LocalRepository;
  private remoteRepository: RemoteRepository;
  private pasteHandler: PasteHandler;

  async onload() {
    logger.info("Loading One Step Uploader Plugin");

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
    this.addSettingTab(new OneStepUploaderSettingTab(this.app, this,this.testConnection.bind(this),this.onR2SettingsChange.bind(this)));
    
    // Register paste event handler
    this.registerEvent(
      // 注意参数名改为 info，因为它不一定是 view
      this.app.workspace.on("editor-paste", (evt, editor, info) => {
        const files = evt.clipboardData?.files;
        
        // 1. 基础检查：是否有文件
        if (!files || files.length == 0) return;

        // 2. 类型安全检查：确保当前是 MarkdownView
        // 这一步解决了你的类型报错问题
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return; 

        // 3. 执行逻辑
        evt.preventDefault();
        this.pasteHandler.handle(files, editor, activeView);
      })
    );

    // Register drop event handler
    this.registerEvent(
      this.app.workspace.on("editor-drop", (evt, editor, info) => {
        const files = evt.dataTransfer?.files;
        
        if (!files || files.length == 0) return;

        // 类型安全检查
        const activeView = this.app.workspace.getActiveViewOfType(MarkdownView);
        if (!activeView) return;

        evt.preventDefault();
        this.pasteHandler.handle(files, editor, activeView);
      })
    );

    logger.info("One Step Uploader Plugin loaded successfully");
  }

  onunload() {
    logger.info("Unloading One Step Uploader Plugin");
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