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
  static process(editor: Editor, localPath: string, remoteUrl: string): boolean {
    const cursor = editor.getCursor();
    const content = editor.getValue();
    
    // 使用新的通用正则
    const regex = StringUtils.createLinkPattern(localPath);
    logger.debug("LinkReplaceProcessor: regex", regex);
    
    if (!regex.test(content)) {
        return false; // 没找到链接
    }

    // 执行替换
    const newContent = content.replace(regex, (match) => {
        // match 是找到的完整字符串，例如 "![img](local.png)" 或 "[[local.pdf]]"
        
        // 智能判断：如果原链接是以 "!" 开头，说明原本就是想当图片显示
        // 如果是 Wiki 链接，我们通常通过文件后缀来判断是否应该是图片
        const isImageContext = match.startsWith("!") || 
                               (match.startsWith("[[") && /\.(png|jpg|jpeg|gif|webp|svg|bmp)$/i.test(localPath));

        // 这里的逻辑可以根据你的需求定制：
        // 1. 如果是图片 -> 生成 ![](url)
        // 2. 如果是文件 -> 生成 [filename](url)
        
        // 获取显示文本 (alt text)
        // 简单提取：如果原本有 alt text 则保留，没有则用文件名
        let altText = localPath; 
        
        // 尝试解析 Markdown 的 alt: ![alt](...)
        const mdMatch = match.match(/!{0,1}\[(.*?)\]/);
        if (mdMatch) altText = mdMatch[1];
        
        // 尝试解析 Wiki 的 alias: [[path|alias]]
        const wikiMatch = match.match(/\|(.*?)]]/);
        if (wikiMatch) altText = wikiMatch[1];

        // 构建新链接
        const prefix = isImageContext ? "!" : "";
        return `${prefix}[${altText}](${remoteUrl})`;
    });

    if (newContent !== content) {
        editor.setValue(newContent);
        editor.setCursor(cursor);
        return true;
    }
    return false;
}
}