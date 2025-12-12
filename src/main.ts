/**
 * Main plugin entry point
 * Cross-platform compatible (Desktop + Mobile)
 */

import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import {
  PasteAndGoSettingTab,
  SettingsManager
} from "./settings";
import { R2Adapter } from "./adapter";
import { MediaRepository } from "./repository";
import { ImageProcessor, ImageProcessorOptions } from "./imageProcessor";
import { MarkdownLinkRewriter } from "./markdownLinkRewriter";
import {
  generateUniqueFileName,
  isImageFile,
  formatBytes,
  Logger,
  ImageUtils,
} from "./utils";

const logger = Logger.getInstance();

export default class PasteAndGoPlugin extends Plugin {
  private settingsManager: SettingsManager;
  private r2Adapter: R2Adapter;
  private mediaRepository: MediaRepository;
  private processor: ImageProcessor;
  private linkRewriter: MarkdownLinkRewriter;

  async onload() {
    logger.info("Loading Paste And Go Plugin");

    // Initialize settings manager
    this.settingsManager=SettingsManager.initialize(this);

    // Load settings
    await this.settingsManager.load();

    // Initialize modules
    this.r2Adapter = new R2Adapter(this.settingsManager.getR2Settings());
    const mediaRepoConfig={
      uploadPathPattern: this.settingsManager.getUploadSettings().uploadPathPattern,
      publicBaseUrl: this.settingsManager.getUploadSettings().publicBaseUrl,
    }
    this.mediaRepository = new MediaRepository(this.r2Adapter,mediaRepoConfig);
    this.processor = new ImageProcessor();
    this.linkRewriter = new MarkdownLinkRewriter();

    // Add settings tab
    this.addSettingTab(new PasteAndGoSettingTab(this.app, this.testConnection.bind(this)));

    // Register paste event handler
    this.registerEvent(
      this.app.workspace.on("editor-paste", this.handlePaste.bind(this))
    );

    // Register drop event handler
    this.registerEvent(
      this.app.workspace.on("editor-drop", this.handleDrop.bind(this))
    );

    // Check format support on startup
    await this.checkFormatSupport();

    logger.info("Paste And Go Plugin loaded successfully");
  }

  onunload() {
    logger.info("Unloading Paste And Go Plugin");
  }

  /**
   * Check if selected format is supported
   */
  private async checkFormatSupport() {
    const format = this.settingsManager.get().imageFormat;
    const supported = await ImageUtils.isSupportedFormat(format);
    
    if (!supported) {
      logger.warn(`Format ${format} may not be fully supported on this platform`);
      
      // Show warning (only once on startup)
      new Notice(
        `⚠️ ${format} format may not be supported. Consider using JPEG or PNG.`,
        8000
      );
    }
  }

  /**
   * Handle paste events
   */
  private async handlePaste(evt: ClipboardEvent, editor: Editor, view: MarkdownView) {
    const files = evt.clipboardData?.files;
    if (!files || files.length === 0) return;

    // Check if any file is an image
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    // Prevent default paste behavior for images
    evt.preventDefault();

    logger.info(`Processing ${imageFiles.length} pasted image(s)`);

    // Process each image
    for (const file of imageFiles) {
      await this.processAndUploadImage(file, editor, view);
    }
  }

  /**
   * Handle drop events
   */
  private async handleDrop(evt: DragEvent, editor: Editor, view: MarkdownView) {
    const files = evt.dataTransfer?.files;
    if (!files || files.length === 0) return;

    // Check if any file is an image
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    // Prevent default drop behavior for images
    evt.preventDefault();

    logger.info(`Processing ${imageFiles.length} dropped image(s)`);

    // Process each image
    for (const file of imageFiles) {
      await this.processAndUploadImage(file, editor, view);
    }
  }

  /**
   * Process and upload image
   */
  private async processAndUploadImage(
    file: File,
    editor: Editor,
    view: MarkdownView
  ): Promise<void> {
    let localImagePath: string | null = null;

    try {
      logger.info("Processing image", {
        fileName: file.name,
        fileSize: formatBytes(file.size),
        fileType: file.type,
      });

      // Step 1: Validate image
      const isValid = await ImageUtils.validateImage(file);
      if (!isValid) {
        new Notice("❌ Invalid image file");
        return;
      }

      // Step 2: Process image (compress and convert)
      const processOptions: ImageProcessorOptions = this.settingsManager.getImageProcessingSettings();

      const processed = await this.processor.processImage(file, processOptions);

      // Step 3: Convert Blob to ArrayBuffer for saving
      const arrayBuffer = await processed.blob.arrayBuffer();

      // Step 4: Generate filename
      const fileName = generateUniqueFileName(
        file.name,
        processed.format,
        this.settingsManager.get().preserveOriginalName
      );

      // Step 5: Save locally first (fallback)
      localImagePath = await this.saveImageLocally(
        arrayBuffer,
        fileName,
        view.file
      );

      // Step 6: Insert local markdown link immediately
      const localMarkdown = this.linkRewriter.formatImageLink(localImagePath);
      editor.replaceSelection(localMarkdown + "\n");

      // Step 7: Upload to R2 (if enabled)
      if (this.settingsManager.get().enableUpload && this.r2Adapter.isConfigured()) {
        await this.uploadAndReplace(
          arrayBuffer,
          fileName,
          processed.format,
          localImagePath,
          editor
        );
      } else {
        if (!this.settingsManager.get().enableUpload) {
          logger.info("Upload disabled, using local image only");
        } else {
          new Notice("⚠️ R2 not configured. Image saved locally only.");
          logger.warn("R2 uploader not configured");
        }
      }
    } catch (error) {
      logger.error("Failed to process image", error);
      new Notice(`❌ Failed to process image: ${error.message}`);

      // If local image wasn't saved, ensure we don't leave user with nothing
      if (!localImagePath) {
        new Notice("⚠️ Could not save image. Please try again.");
      }
    }
  }

  /**
   * Save image locally in vault
   */
  private async saveImageLocally(
  arrayBuffer: ArrayBuffer,
  fileName: string,
  currentFile: TFile | null
): Promise<string> {
  try {
    const attachmentFolder = this.getAttachmentFolder(currentFile);
    await this.ensureFolderExists(attachmentFolder);
    const fullPath = `${attachmentFolder}/${fileName}`;

    // 处理文件重名
    let finalPath = fullPath;
    let counter = 1;
    while (await this.app.vault.adapter.exists(finalPath)) {
      const extMatch = fileName.match(/\.([^/.]+)$/);
      const baseName = fileName.replace(/\.[^/.]+$/, "");
      const ext = extMatch ? extMatch[1] : ""; // 无扩展名时为空字符串
      finalPath = `${attachmentFolder}/${baseName}_${counter}${ext ? `.${ext}` : ""}`;
      counter++;
    }

    // 转换为 Uint8Array（仅用于内存操作，最终传底层 ArrayBuffer）
    const uint8Array = new Uint8Array(arrayBuffer);

    // 核心修复：传递 uint8Array.buffer 匹配 ArrayBuffer 类型
    await this.app.vault.adapter.writeBinary(finalPath, uint8Array.buffer);

    logger.info("Image saved locally", { path: finalPath });
    return finalPath;
  } catch (error) {
    logger.error("Failed to save image locally", error);
    // 类型守卫避免 error 无 message 属性
    const errorMsg = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to save image locally: ${errorMsg}`);
  }
}

  /**
   * Upload to R2 and replace markdown link
   */
  private async uploadAndReplace(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    format: string,
    localPath: string,
    editor: Editor
  ): Promise<void> {
    try {
      new Notice("⏳ Uploading to R2...");

      // Convert ArrayBuffer to Buffer for upload
      const buffer = Buffer.from(arrayBuffer);

      // Upload with retry using mediaRepository
      const result = await this.mediaRepository.upload(buffer, fileName, format);

      if (result.success && result.url) {
        // Replace local link with R2 URL
        const replaced = this.linkRewriter.replaceImageLink(
          editor,
          localPath,
          result.url
        );

        if (replaced) {
          new Notice("✅ Image uploaded to R2 successfully!");
          logger.info("Markdown link replaced with R2 URL", {
            localPath,
            r2Url: result.url,
          });

          // Optionally delete local file
          if (this.settingsManager.get().deleteLocalAfterUpload) {
            await this.deleteLocalImage(localPath);
          }
        } else {
          logger.warn("Could not replace markdown link, keeping local image");
          new Notice("⚠️ Upload successful but could not update link. Using local image.");
        }
      } else {
        // Upload failed - keep local image
        logger.error("R2 upload failed", { error: result.error });
        new Notice(
          `⚠️ Upload to R2 failed: ${result.error}. Using local image instead.`
        );
      }
    } catch (error) {
      logger.error("Upload process failed", error);
      new Notice(`⚠️ Upload failed: ${error.message}. Using local image instead.`);
    }
  }

  /**
   * Delete local image file
   */
  private async deleteLocalImage(path: string): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(path)) {
        await this.app.vault.adapter.remove(path);
        logger.info("Local image deleted", { path });
      }
    } catch (error) {
      logger.error("Failed to delete local image", error);
      // Non-critical error, don't throw
    }
  }

  /**
   * Get attachment folder for current file
   */
  private getAttachmentFolder(currentFile: TFile | null): string {
    const attachmentFolderPath =
      (this.app.vault as any).getConfig("attachmentFolderPath") || ".";

    if (!currentFile) {
      return attachmentFolderPath === "." ? "attachments" : attachmentFolderPath;
    }

    // Handle relative paths
    if (attachmentFolderPath === "./") {
      return currentFile.parent?.path || "";
    }

    if (attachmentFolderPath.startsWith("./")) {
      const relativePath = attachmentFolderPath.substring(2);
      return currentFile.parent
        ? `${currentFile.parent.path}/${relativePath}`
        : relativePath;
    }

    return attachmentFolderPath;
  }

  /**
   * Ensure folder exists
   */
  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath || folderPath === ".") return;

    const exists = await this.app.vault.adapter.exists(folderPath);
    if (!exists) {
      await this.app.vault.createFolder(folderPath);
      logger.debug("Created folder", { path: folderPath });
    }
  }

  /**
   * Test connection
   */
  async testConnection(): Promise<void> {
    if (!this.r2Adapter.isConfigured()) {
      throw new Error("R2 is not fully configured. Please check all settings.");
    }

    await this.mediaRepository.testConnection();
  }

  /**
   * Load settings
   */
  async loadSettings() {
    await this.settingsManager.load();

    // Update R2 connection settings if already initialized
    if (this.r2Adapter) {
      this.r2Adapter.updateSettings(this.settingsManager.getR2Settings());
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.settingsManager.save();

    // Update R2 connection with new settings
    if (this.r2Adapter) {
      this.r2Adapter.updateSettings(this.settingsManager.getR2Settings());
    }

    // Recheck format support
    await this.checkFormatSupport();

    logger.info("Settings saved");
  }
}