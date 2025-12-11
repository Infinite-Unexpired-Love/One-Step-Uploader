/**
 * Markdown link rewriter module
 */

import { Editor } from "obsidian";
import { Logger } from "./utils/logger";

const logger = Logger.getInstance();

export interface LinkReplacement {
  oldLink: string;
  newLink: string;
  position: { line: number; ch: number };
}

export class MarkdownLinkRewriter {
  /**
   * Replace image link in editor
   */
  replaceImageLink(editor: Editor, oldPath: string, newUrl: string): boolean {
    try {
      const content = editor.getValue();
      const imagePattern = this.createImagePattern(oldPath);

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

  /**
   * Find image link position in editor
   */
  findImageLinkPosition(editor: Editor, imagePath: string): LinkReplacement | null {
    try {
      const content = editor.getValue();
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const imagePattern = this.createImagePattern(imagePath);
        const match = line.match(imagePattern);

        if (match) {
          const ch = line.indexOf(match[0]);
          return {
            oldLink: match[0],
            newLink: "", // Will be filled later
            position: { line: i, ch },
          };
        }
      }

      logger.debug("Image link position not found", { imagePath });
      return null;
    } catch (error) {
      logger.error("Failed to find image link position", error);
      return null;
    }
  }

  /**
   * Replace link at specific position
   */
  replaceLinkAtPosition(editor: Editor, replacement: LinkReplacement): boolean {
    try {
      const { line, ch } = replacement.position;
      const lineContent = editor.getLine(line);

      const before = lineContent.substring(0, ch);
      const after = lineContent.substring(ch + replacement.oldLink.length);
      const newLine = before + replacement.newLink + after;

      editor.setLine(line, newLine);

      logger.info("Link replaced at position", {
        line,
        ch,
        newLink: replacement.newLink,
      });

      return true;
    } catch (error) {
      logger.error("Failed to replace link at position", error);
      return false;
    }
  }

  /**
   * Create regex pattern for image markdown
   */
  private createImagePattern(imagePath: string): RegExp {
    // Escape special regex characters in path
    const escapedPath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Match: ![alt text](path) or ![](path)
    // Also handle encoded paths
    return new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escapedPath}[^)]*\\)`, "g");
  }

  /**
   * Extract image path from markdown link
   */
  extractImagePath(markdownLink: string): string | null {
    const match = markdownLink.match(/!\[.*?\]\(([^)]+)\)/);
    return match ? match[1] : null;
  }

  /**
   * Check if line contains image markdown
   */
  isImageMarkdown(line: string): boolean {
    return /!\[.*?\]\(.+?\)/.test(line);
  }

  /**
   * Get all image links in editor
   */
  getAllImageLinks(editor: Editor): string[] {
    const content = editor.getValue();
    const imagePattern = /!\[.*?\]\(([^)]+)\)/g;
    const links: string[] = [];

    let match;
    while ((match = imagePattern.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Format markdown image link
   */
  formatImageLink(url: string, alt: string = ""): string {
    return `![${alt}](${url})`;
  }

  /**
   * Check if URL is already external
   */
  isExternalUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }
}