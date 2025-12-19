import { Editor, MarkdownView, Notice, Platform } from "obsidian";
import { SettingsManager } from "../settings";
import { ImageConvertProcessor } from "../processor";
import { LinkReplaceProcessor } from "../processor/linkReplaceProcessor";
import { LocalRepository, RemoteRepository } from "../repository";
import { generateUniqueFileName, isImageFile, Logger, ImageUtils } from "../utils";
import { StringUtils } from "../utils/stringUtils";

const logger = Logger.getInstance();

export class PasteHandler {
  constructor(
    private localRepo: LocalRepository,
    private remoteRepo: RemoteRepository
  ) {}

  /**
   * 处理粘贴/拖拽事件的主入口
   */
  async handle(files: FileList, editor: Editor, view: MarkdownView) {
    logger.debug("PasteHandler.handle called");
    
    // 将 FileList 转为数组以便遍历
    const fileArray = Array.from(files);
    
    if (fileArray.length === 0) return;

    logger.debug(`PasteHandler processing ${fileArray.length} files`);

    for (const file of fileArray) {
      if (isImageFile(file)) {
        await this.processImageWorkflow(file, editor, view);
      } else {
        await this.processGenericFileWorkflow(file, editor, view);
      }
    }
  }

  /**
   * 流程 A: 图片处理 (压缩 -> 本地 -> 上传 -> 替换)
   * 生成链接格式: ![[本地路径]] -> ![](远程URL)
   */
  private async processImageWorkflow(file: File, editor: Editor, view: MarkdownView) {
    const settingsManager = SettingsManager.getInstance();
    let localPath: string | null = null;

    try {
      // 1. 校验与预处理
      if (!(await ImageUtils.validateImage(file))) {
        new Notice("❌ Invalid image");
        return;
      }
      
      const options = settingsManager.getImageProcessingSettings();
      // 图片特有步骤：压缩/格式转换
      const processed = await ImageConvertProcessor.process(file, options);
      const arrayBuffer = await processed.blob.arrayBuffer();
      
      // 生成文件名 (使用转换后的格式，如 png/webp)
      const fileName = generateUniqueFileName(file.name, processed.format, settingsManager.get().preserveOriginalName);

      // 2. 存入本地仓库
      localPath = await this.localRepo.save(arrayBuffer, fileName, view.file);

      // 3. 立即响应 UI (图片使用 "!" 嵌入格式)
      const localLink = StringUtils.formatLink(localPath,"",true); 
      editor.replaceSelection(localLink + "\n");

      // 4. 远程上传
      if (settingsManager.get().enableUpload) {
        new Notice(`⏳ Uploading image: ${fileName}...`);
        
        // 兼容移动端的 Buffer 处理
        const uploadBody = Platform.isMobile ? new Uint8Array(arrayBuffer) : Buffer.from(arrayBuffer);
        
        const result = await this.remoteRepo.save(uploadBody as any, fileName, processed.format);

        if (result.success && result.url) {
          // 5. 替换链接
          this.replaceLinkInEditor(editor, localPath, result.url);
          
          if (settingsManager.get().deleteLocalAfterUpload) {
            await this.localRepo.delete(localPath);
          }
        } else {
          new Notice(`⚠️ Image upload failed: ${result.error || "Unknown"}. Kept local.`);
        }
      }
    } catch (e) {
      logger.error("Image workflow failed", e);
      new Notice("❌ Error processing image");
    }
  }

  /**
   * 流程 B: 普通文件处理 (直接读取 -> 本地 -> 上传 -> 替换)
   * 生成链接格式: [[本地路径]] -> [文件名](远程URL)  <-- 注意没有感叹号
   */
  private async processGenericFileWorkflow(file: File, editor: Editor, view: MarkdownView) {
    const settingsManager = SettingsManager.getInstance();
    let localPath: string | null = null;

    try {
      logger.debug(`Processing generic file: ${file.name}`);

      // 1. 读取文件 (无压缩处理)
      const arrayBuffer = await file.arrayBuffer();

      logger.debug(`file size: ${arrayBuffer.byteLength}`);
      
      // 获取扩展名
      const extension = file.name.split('.').pop() || "bin";
      // 生成文件名
      const fileName = generateUniqueFileName(file.name, extension, settingsManager.get().preserveOriginalName); 

      // 2. 存入本地仓库
      localPath = await this.localRepo.save(arrayBuffer, fileName, view.file);

      // 3. 立即响应UI
      const localLink = StringUtils.formatLink(localPath,file.name); 
      editor.replaceSelection(localLink + "\n");

      // 4. 远程上传
      if (settingsManager.get().enableUpload) {
        new Notice(`⏳ Uploading file: ${file.name}...`);
        
        const uploadBody = Platform.isMobile ? new Uint8Array(arrayBuffer) : Buffer.from(arrayBuffer);

        const result = await this.remoteRepo.save(uploadBody as any, fileName, extension);

        logger.debug("upload result:",result)

        if (result.success && result.url) {
          // 5. 替换链接
          this.replaceLinkInEditor(editor, localPath, result.url);
          
          if (settingsManager.get().deleteLocalAfterUpload) {
            await this.localRepo.delete(localPath);
          }
        } else {
          new Notice(`⚠️ File upload failed: ${result.error || "Unknown"}. Kept local.`);
        }
      }
    } catch (e) {
      logger.error("Generic file workflow failed", e);
      new Notice("❌ Error processing file");
    }
  }

  /**
   * 辅助方法：统一的链接替换后处理
   */
  private replaceLinkInEditor(editor: Editor, localPath: string, remoteUrl: string) {
      const replaced = LinkReplaceProcessor.process(editor, localPath, remoteUrl);
      if (replaced) {
        new Notice("✅ Uploaded!");
        logger.debug("Link replaced", { remoteUrl });
      }else {
        new Notice("⚠️ Uploaded but link replacement failed");
      }
  }
}