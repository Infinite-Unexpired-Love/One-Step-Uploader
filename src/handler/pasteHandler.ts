import { Editor, MarkdownView, Notice} from "obsidian";
import { SettingsManager } from "../settings";
import { ImageConvertProcessor } from "../processor";
import { LinkReplaceProcessor } from "../processor/linkReplaceProcessor";
import { LocalRepository,RemoteRepository } from "../repository";
import { generateUniqueFileName, isImageFile, Logger, ImageUtils } from "../utils";
import { StringUtils } from "src/utils/stringUtils";

const logger = Logger.getInstance();

export class PasteHandler {
  constructor(
    private localRepo: LocalRepository,
    private remoteRepo: RemoteRepository
  ) {}

  /**
   * 处理粘贴/拖拽事件的主入口
   */
  async handle(files: FileList | null, editor: Editor, view: MarkdownView) {
    if (!files || files.length === 0) return;
    const imageFiles = Array.from(files).filter(isImageFile);
    if (imageFiles.length === 0) return;

    logger.info(`PasteHandler processing ${imageFiles.length} images`);

    for (const file of imageFiles) {
      await this.processImageWorkflow(file, editor, view);
    }
  }

  /**
   * 单张图片的处理流程
   */
  private async processImageWorkflow(file: File, editor: Editor, view: MarkdownView) {
    const settingsManager = SettingsManager.getInstance();
    let localPath: string | null = null;

    try {
      // 1. 预处理
      if (!(await ImageUtils.validateImage(file))) {
        new Notice("❌ Invalid image");
        return;
      }
      
      const options = settingsManager.getImageProcessingSettings();
      const processed = await ImageConvertProcessor.process(file, options);
      const arrayBuffer = await processed.blob.arrayBuffer();
      const fileName = generateUniqueFileName(file.name, processed.format, settingsManager.get().preserveOriginalName);

      // 2. 存入本地仓库 (Local Repository)
      localPath = await this.localRepo.save(arrayBuffer, fileName, view.file);

      // 3. 立即响应 UI
      const localLink = StringUtils.formatImageLink(localPath);
      editor.replaceSelection(localLink + "\n");

      // 4. 远程上传流程 (Remote Repository)
      if (settingsManager.get().enableUpload) {
        new Notice("⏳ Uploading...");
        
        // 转换为 Buffer 供 Adapter 使用
        const buffer = Buffer.from(arrayBuffer);
        const result = await this.remoteRepo.save(buffer, fileName, processed.format);

        if (result.success && result.url) {
          // 5. 更新链接
          const replaced = LinkReplaceProcessor.process(editor, localPath, result.url);

          if (replaced) {
            new Notice("✅ Uploaded!");
            logger.info("Link replaced", { remoteUrl: result.url });

            // 6. 清理本地 (业务策略)
            if (settingsManager.get().deleteLocalAfterUpload) {
              await this.localRepo.delete(localPath);
            }
          }
        } else {
          new Notice(`⚠️ Upload failed: ${result.error || "Unknown"}. Kept local.`);
        }
      }
    } catch (e) {
      logger.error("Workflow failed", e);
      new Notice("❌ Error processing image");
    }
  }
}