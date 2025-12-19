import { Logger } from "./logger";
const logger = Logger.getInstance();

export interface Replacement {
  oldLink: string;
  newLink: string;
  position: { line: number; ch: number };
}

export class StringUtils {
  /**
   * Find link position in editor (Supports both ![]() and []())
   */
  static findLinkPosition(content: string, linkPath: string): Replacement | null {
    try {
      const lines = content.split("\n");

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // 核心修改：使用支持普通链接的 Pattern
        const linkPattern = this.createLinkPattern(linkPath);
        const match = line.match(linkPattern);

        if (match) {
          const ch = line.indexOf(match[0]);
          return {
            oldLink: match[0],
            newLink: "", 
            position: { line: i, ch },
          };
        }
      }

      logger.debug("Link position not found", { linkPath });
      return null;
    } catch (error) {
      logger.error("Failed to find link position", error);
      return null;
    }
  }

  /**
   * Replace link at specific position
   * (This method remains functionally same but is now logically applicable to both types)
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

      logger.debug("Link replaced at position", {
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
   * Create regex pattern for markdown links (Images or Regular links)
   */
  static createLinkPattern(linkPath: string): RegExp {
    // 转义路径中的特殊正则字符
    const escapedPath = linkPath.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

    /**
     * 正则解析：
     * !?          -> 匹配 0 个或 1 个 "!" (以此支持图片和普通链接)
     * \[[^\]]*\]  -> 匹配方括号及其中内容 [text]
     * \(          -> 匹配左圆括号
     * [^)]* -> 匹配路径前可能存在的任何字符（如编码后的字符）
     * ${escapedPath} -> 匹配目标路径
     * [^)]* -> 匹配路径后可能存在的任何字符
     * \)          -> 匹配右圆括号
     */
    return new RegExp(`!?\\[[^\\]]*\\]\\([^)]*${escapedPath}[^)]*\\)`, "g");
  }

  /**
   * Extract path from markdown link (Compatible with ![]() and []())
   */
  static extractPath(markdownLink: string): string | null {
    // 匹配可选的 ! 开头的链接格式
    const match = markdownLink.match(/!?\[.*?\]\(([^)]+)\)/);
    return match ? match[1] : null;
  }

  /**
   * Check if line contains any markdown link
   */
  static isMarkdownLink(line: string): boolean {
    return /!?\[.*?\]\(.+?\)/.test(line);
  }

  /**
   * Get all links (both image and regular)
   */
  static getAllLinks(content: string): string[] {
    const linkPattern = /!?\[.*?\]\(([^)]+)\)/g;
    const links: string[] = [];

    let match;
    while ((match = linkPattern.exec(content)) !== null) {
      links.push(match[1]);
    }

    return links;
  }

  /**
   * Format markdown link
   */
  static formatLink(url: string, text: string = "", isImage: boolean = false): string {
    const prefix = isImage ? "!" : "";
    return `${prefix}[${text}](${url})`;
  }

  /**
   * Check if URL is already external
   */
  static isExternalUrl(url: string): boolean {
    return url.startsWith("http://") || url.startsWith("https://");
  }
  
}