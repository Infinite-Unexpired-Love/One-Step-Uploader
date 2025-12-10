/**
 * Main plugin entry point
 * Cross-platform compatible (Desktop + Mobile)
 */

import { Editor, MarkdownView, Notice, Plugin, TFile } from "obsidian";
import {
  R2UploaderSettings,
  DEFAULT_SETTINGS,
  R2UploaderSettingTab,
} from "./settings";
import { R2Connection } from "./r2Connection";
import { MediaRepository } from "./mediaRepository";
import { ImageProcessor, ImageProcessorOptions } from "./imageProcessor";
import { MarkdownLinkRewriter } from "./markdownLinkRewriter";
import { Logger } from "./logger";
import {
  generateUniqueFileName,
  isImageFile,
  formatBytes,
} from "./utils";

const logger = Logger.getInstance();

export default class R2ImageUploaderPlugin extends Plugin {
  settings: R2UploaderSettings;
  private r2Connection: R2Connection;
  private mediaRepository: MediaRepository;
  private processor: ImageProcessor;
  private linkRewriter: MarkdownLinkRewriter;

  async onload() {
    logger.info("Loading R2 Image Uploader Plugin");

    // Load settings
    await this.loadSettings();

    // Initialize modules
    this.r2Connection = R2Connection.create(this.settings);
    this.mediaRepository = new MediaRepository(this.r2Connection);
    this.processor = new ImageProcessor();
    this.linkRewriter = new MarkdownLinkRewriter();

    // Add settings tab
    this.addSettingTab(new R2UploaderSettingTab(this.app, this));

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

    logger.info("R2 Image Uploader Plugin loaded successfully");
  }

  onunload() {
    logger.info("Unloading R2 Image Uploader Plugin");
  }

  /**
   * Check if selected format is supported
   */
  private async checkFormatSupport() {
    const supported = await this.processor.isSupportedFormat(this.settings.imageFormat);
    
    if (!supported) {
      logger.warn(`Format ${this.settings.imageFormat} may not be fully supported on this platform`);
      
      // Show warning (only once on startup)
      new Notice(
        `⚠️ ${this.settings.imageFormat.toUpperCase()} format may not be supported. Consider using JPEG or PNG.`,
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
      const isValid = await this.processor.validateImage(file);
      if (!isValid) {
        new Notice("❌ Invalid image file");
        return;
      }

      // Step 2: Process image (compress and convert)
      const processOptions: ImageProcessorOptions = {
        format: this.settings.imageFormat,
        quality: this.settings.imageQuality,
        maxWidth: this.settings.maxWidth,
        maxHeight: this.settings.maxHeight,
      };

      const processed = await this.processor.processImage(file, processOptions);

      // Step 3: Convert Blob to ArrayBuffer for saving
      const arrayBuffer = await processed.blob.arrayBuffer();

      // Step 4: Generate filename
      const fileName = generateUniqueFileName(
        file.name,
        processed.format,
        this.settings.preserveOriginalName
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
      if (this.settings.enableUpload && this.r2Connection.isConfigured()) {
        await this.uploadAndReplace(
          arrayBuffer,
          fileName,
          processed.format,
          localImagePath,
          editor
        );
      } else {
        if (!this.settings.enableUpload) {
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
      // Determine attachment folder
      const attachmentFolder = this.getAttachmentFolder(currentFile);

      // Ensure folder exists
      await this.ensureFolderExists(attachmentFolder);

      // Full path
      const fullPath = `${attachmentFolder}/${fileName}`;

      // Check if file exists and generate unique name if needed
      let finalPath = fullPath;
      let counter = 1;
      while (await this.app.vault.adapter.exists(finalPath)) {
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const ext = fileName.split(".").pop();
        finalPath = `${attachmentFolder}/${baseName}_${counter}.${ext}`;
        counter++;
      }

      // Convert ArrayBuffer to Uint8Array for writing
      const uint8Array = new Uint8Array(arrayBuffer);

      // Save file
      await this.app.vault.adapter.writeBinary(finalPath, uint8Array);

      logger.info("Image saved locally", { path: finalPath });

      return finalPath;
    } catch (error) {
      logger.error("Failed to save image locally", error);
      throw new Error(`Failed to save image locally: ${error.message}`);
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

      // Generate upload key
      const uploadKey = this.r2Connection.generateUploadKey(fileName);

      // Get content type
      const contentType = this.r2Connection.getContentType(format);

      // Upload with retry
      const result = await this.r2Connection.uploadWithRetry(buffer, uploadKey, contentType);

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
          if (this.settings.deleteLocalAfterUpload) {
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
   * Test R2 connection
   */
  async testR2Connection(): Promise<void> {
    if (!this.r2Connection.isConfigured()) {
      throw new Error("R2 is not fully configured. Please check all settings.");
    }

    await this.r2Connection.testConnection();
  }

  /**
   * Load settings
   */
  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());

    // Update R2 connection settings if already initialized
    if (this.r2Connection) {
      this.r2Connection.updateSettings(this.settings);
    }
  }

  /**
   * Save settings
   */
  async saveSettings() {
    await this.saveData(this.settings);

    // Update R2 connection with new settings
    if (this.r2Connection) {
      this.r2Connection.updateSettings(this.settings);
    }

    // Recheck format support
    await this.checkFormatSupport();

    logger.info("Settings saved");
  }
}