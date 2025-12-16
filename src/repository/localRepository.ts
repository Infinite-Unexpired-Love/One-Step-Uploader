import { App, TFile } from "obsidian";
import { Logger } from "../utils";

const logger = Logger.getInstance();

export class LocalRepository {
  constructor(private app: App) {}

  /**
   * 持久化图片到本地 Vault
   */
  async save(
    arrayBuffer: ArrayBuffer,
    fileName: string,
    currentFile: TFile | null
  ): Promise<string> {
    try {
      const attachmentFolder = this.getAttachmentFolder(currentFile);
      await this.ensureFolderExists(attachmentFolder);
      const fullPath = `${attachmentFolder}/${fileName}`;

      // 处理重名逻辑
      let finalPath = fullPath;
      let counter = 1;
      while (await this.app.vault.adapter.exists(finalPath)) {
        const extMatch = fileName.match(/\.([^/.]+)$/);
        const baseName = fileName.replace(/\.[^/.]+$/, "");
        const ext = extMatch ? extMatch[1] : "";
        finalPath = `${attachmentFolder}/${baseName}_${counter}${ext ? `.${ext}` : ""}`;
        counter++;
      }

      await this.app.vault.adapter.writeBinary(finalPath, new Uint8Array(arrayBuffer).buffer);
      logger.info("Saved to local repository", { path: finalPath });
      return finalPath;
    } catch (error) {
      logger.error("Local repository save failed", error);
      throw error;
    }
  }

  /**
   * 删除本地图片
   */
  async delete(path: string): Promise<void> {
    try {
      if (await this.app.vault.adapter.exists(path)) {
        await this.app.vault.adapter.remove(path);
        logger.debug("Deleted from local repository", { path });
      }
    } catch (error) {
      logger.warn("Failed to delete local file", error);
    }
  }

  // --- 内部辅助方法 ---
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

  private async ensureFolderExists(folderPath: string): Promise<void> {
    if (!folderPath || folderPath === ".") return;
    if (!(await this.app.vault.adapter.exists(folderPath))) {
      await this.app.vault.createFolder(folderPath);
    }
  }
}