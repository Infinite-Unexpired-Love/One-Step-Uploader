/**
 * Markdown link rewriter module
 */
import { Editor } from "obsidian";
import { Logger } from "../utils/logger";
import { StringUtils } from "../utils/stringUtils";

const logger = Logger.getInstance();

export class LinkReplaceProcessor {
  /**
   * Replace image link in editor
   */
  static process(editor: Editor, oldPath: string, newUrl: string): boolean {
    try {
      const content = editor.getValue();
      const imagePattern = StringUtils.createImagePattern(oldPath);

      logger.debug("Searching for image link", { oldPath });

      const match = content.match(imagePattern);
      if (!match) {
        logger.warn("Image link not found in editor", { oldPath });
        return false;
      }

      const newMarkdown = `![](${newUrl})`;
      const newContent = content.replace(imagePattern, newMarkdown);

      // Replace content
      editor.setValue(newContent);

      logger.info("Image link replaced successfully", {
        oldPath,
        newUrl,
      });

      return true;
    } catch (error) {
      logger.error("Failed to replace image link", error);
      return false;
    }
  }
}