import { Logger } from "./logger";
const logger = Logger.getInstance();

export interface Replacement {
  oldLink: string;
  newLink: string;
  position: { line: number; ch: number };
}

export class StringUtils {
    /**
   * Find image link position in editor
   */
  static findImageLinkPosition(content: string, imagePath: string): Replacement | null {
    try {
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
  static replaceLinkAtPosition(content: string, replacement: Replacement): string {
    try {
      const { line, ch } = replacement.position;
      const lines = content.split("\n");
      const lineContent = lines[line];

      const before = lineContent.substring(0, ch);
      const after = lineContent.substring(ch + replacement.oldLink.length);
      const newLine = before + replacement.newLink + after;

      lines[line] = newLine;

      logger.info("Link replaced at position", {
        line,
        ch,
        newLink: replacement.newLink,
      });

      return lines.join("\n");
    } catch (error) {
      logger.error("Failed to replace link at position, nothing done", error);
      return content;
    }
  }

  /**
   * Create regex pattern for image markdown
   */
   static createImagePattern(imagePath: string): RegExp {
    // Escape special regex characters in path
    const escapedPath = imagePath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    // Match: ![alt text](path) or ![](path)
    // Also handle encoded paths
    return new RegExp(`!\\[[^\\]]*\\]\\([^)]*${escapedPath}[^)]*\\)`, "g");
  }

  /**
   * Extract image path from markdown link
   */
  static extractImagePath(markdownLink: string): string | null {
    const match = markdownLink.match(/!\[.*?\]\(([^)]+)\)/);
    return match ? match[1] : null;
  }

  /**
   * Check if line contains image markdown
   */
  static isImageMarkdown(line: string): boolean {
    return /!\[.*?\]\(.+?\)/.test(line);
  }

  /**
   * Get all image links
   */
  static getAllImageLinks(content: string): string[] {
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
  static formatImageLink(url: string, alt: string = ""): string {
    return `![${alt}](${url})`;
  }

  /**
   * Check if URL is already external
   */
  static isExternalUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }
}