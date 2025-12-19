# One Step Uploader

一款先进的 Obsidian 插件，支持在粘贴或拖拽时自动压缩图像并上传到 Cloudflare R2，支持 WebP 和 AVIF 等现代格式以获得最佳性能。

## 🚀 核心功能

- **自动压缩与上传**：粘贴或拖拽到 Obsidian 中的图像会自动压缩并上传至 Cloudflare R2
- **现代格式支持**：支持 WebP、AVIF、JPEG 和 PNG 等格式，并提供可配置的压缩设置
- **拖拽与粘贴支持**：同时支持粘贴剪贴板图像和拖拽文件
- **可配置质量设置**：可调整图像质量、尺寸和压缩选项
- **本地回退**：保留本地副本，支持上传成功后删除本地文件
- **智能路径管理**：按日期（年/月）自动组织上传文件，支持自定义路径模式

## ✨ 主要优势

与其他图像上传插件相比：

- **卓越的压缩效果**：采用 WebP/AVIF 等先进图像压缩技术，相比传统格式可减少高达 80% 的文件大小
- **性能优化**：利用浏览器原生 Canvas API 实现快速高效的图像处理，无需外部依赖
- **灵活的存储方案**：集成第三方OSS服务商，目前已接入Cloudflare R2以实现经济高效的高性能 CDN 分发
- **零摩擦工作流**：图像立即出现在笔记中并提供本地预览，然后无缝过渡到远程托管
- **高扩展性低耦合**：采用清晰的架构分层设计，模块间高度解耦，便于功能扩展和维护

## 🛠️ 开发者安装

### 前置要求
- Node.js >= 18
- pnpm 包管理器

### 设置说明

1. 克隆仓库：
```bash
git clone https://github.com/Infinite-Unexpired-Love/One-Step-Uploader.git
cd One-Step-Uploader
```

2. 安装依赖：
```bash
pnpm install
```

3. 构建插件：
```bash
pnpm build
```

4. 开发模式：
```bash
pnpm dev
```

5. 将生成的 `main.js`、`manifest.json` 文件复制到您的 Obsidian 库的 `.obsidian/plugins/one-step-uploader/` 目录下

## ⚙️ 配置选项

### R2 存储设置
- **R2 终端点**：您的 Cloudflare R2 终端点 URL
- **访问密钥 ID**：用于验证的 R2 访问密钥
- **私密访问密钥**：R2 私密访问密钥
- **存储桶名称**：文件上传的目标存储桶
- **区域**：R2 区域（默认：auto）

### 上传设置
- **上传路径模式**：自定义上传文件夹结构（支持 {year}、{month}、{day}）
- **公共基础 URL**：访问上传资产的基础 URL
- **启用上传**：开启/关闭自动上传功能
- **上传后删除本地文件**：远程上传成功后删除本地副本

### 图像处理设置
- **目标格式**：在 WebP、AVIF、JPEG 或 PNG 之间选择
- **图像质量**：1-100 范围的质量压缩比例
- **最大宽度/高度**：限制缩放的尺寸
- **保留原始名称**：保持原始文件名的选项

## 📝 使用示例

### 基本使用方法
1. 在插件设置中配置您的 Cloudflare R2 设置
2. 将图像复制到剪贴板或将文件拖拽到 Obsidian 中
3. 图像会在本地立即嵌入，同时在后台上传到 R2
4. 上传完成后，图像链接会自动更新为指向 R2 URL

### 支持的格式
```javascript
// 支持压缩的图像格式
["webp", "avif", "jpeg", "png"]

// 默认压缩设置
{
  imageFormat: "webp",      // 压缩效果出色的现代格式
  imageQuality: 80,         // 质量和大小的良好平衡
  maxWidth: 1920,           // 全高清分辨率
  maxHeight: 1080,          // 全高清分辨率
  preserveOriginalName: false // 生成唯一名称以防冲突
}
```

### 路径模式
```javascript
// 默认上传路径模式
"images/{year}/{month}"     // 创建类似 images/2025/12/ 的路径

// 自定义示例
"{year}/{month}/{day}"      // 2025/12/19/
"assets/uploads/{year}"     // assets/uploads/2025/
"media/{year}-{month}"      // media/2025-12/
```

## 🤝 贡献

我们欢迎社区的贡献！以下是您可以帮助的方法：

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/awesome-feature`)
3. 进行修改
4. 运行测试并确保一切正常 (`pnpm build`)
5. 提交更改 (`git commit -m 'Add awesome feature'`)
6. 推送至分支 (`git push origin feature/awesome-feature`)
7. 开启拉取请求

### 开发指南
- 遵循现有的代码风格和架构模式
- 为新功能添加/更新测试
- 适当记录您的更改

### 架构概述
插件遵循清晰的架构，具有不同的层级：
- **处理器（Handlers）**：管理用户交互（粘贴、拖拽）
- **处理器件（Processors）**：处理图像处理和链接替换
- **存储库（Repositories）**：抽象本地和远程存储操作
- **适配器（Adapters）**：接口连接外部服务（Cloudflare R2）
- **工具类（Utils）**：共享实用程序和辅助函数

该架构具有以下特点：
- **高扩展性**：新增功能或支持新的存储服务只需实现相应的适配器和存储库
- **低耦合**：各模块间通过明确定义的接口进行通信，相互依赖程度低
- **易维护**：模块化的结构使得定位和修复问题变得更加容易
- **可测试性**：各组件独立性高，便于单元测试

## 📄 许可证

本项目采用 MIT 许可证 - 详情请见 LICENSE 文件。

## 🙏 致谢

- 为精彩的 Obsidian 社区构建
- 感谢 Cloudflare 提供 R2 服务