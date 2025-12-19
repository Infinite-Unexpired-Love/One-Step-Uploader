# One Step Uploader

English | [简体中文](README_zh.md)

One Step Uploader is an Obsidian plugin that automatically uploads pasted or dragged images to **Cloudflare R2**, with optional image compression and modern format conversion (WebP / AVIF).

The plugin is designed to be **fully configurable, transparent, and safe**, with complete user control over upload behavior and local file handling.

---

## ✨ Features

- **Paste & drag image upload**  
    Automatically uploads images when pasting or dragging into Obsidian
    
- **Optional image compression**  
    Supports WebP, AVIF, JPEG, and PNG with configurable quality and size limits
    
- **Local-first workflow with fallback**  
    Images are always saved locally first  
    If upload fails or is disabled, the plugin falls back to local files
    
- **Upload toggle**  
    Upload behavior can be enabled or disabled at any time in settings
    
- **Custom upload path**  
    Organize files by date or custom path patterns
    

---

## 🔐 Security & Privacy

This plugin is designed with **privacy and security as first-class concerns**. This plugin does not collect, transmit, or store any personal data.

### Credential handling

- Cloudflare R2 credentials (Access Key & Secret) are stored **locally in Obsidian settings**
    
- Credentials are **never uploaded, logged, or shared**
    
- No telemetry, analytics, or tracking of any kind
    

### Network behavior

- Network requests are sent **only** to the user-configured Cloudflare R2 endpoint
    
- No third-party services are contacted
    
- Upload functionality can be completely disabled in settings
    

### Local file safety

- Images are saved locally before upload
    
- Deleting local files after successful upload is **optional and disabled by default**
    
- If an upload fails, the local file is always preserved
    

---

## ⚙️ Configuration

All settings are optional. The plugin works in **local-only mode** when upload is disabled.

### Cloudflare R2 Settings

- **Endpoint URL**
    
- **Bucket name**
    
- **Access Key ID**
    
- **Secret Access Key**
    
- **Region** (default: `auto`)
    
- **Public base URL** (for generated links)
    

### Upload Control

- **Enable upload** (on/off)
    
- **Delete local file after successful upload** (optional)
    
- **Upload path pattern** (`{year}`, `{month}`, `{day}` supported)
    

### Image Processing

- **Target format**: WebP / AVIF / JPEG / PNG
    
- **Image quality** (1–100)
    
- **Max width / height**
    
- **Preserve original filename** (optional)
    

---

## 🧭 Typical Workflow

1. Configure Cloudflare R2 credentials (optional)
    
2. Paste or drag an image into a note
    
3. The image is immediately embedded locally
    
4. If upload is enabled:
    
    - The image is uploaded to R2 in the background
        
    - The link is replaced after upload succeeds
        
5. If upload fails or is disabled:
    
    - The local image remains unchanged
        

---

## 🧩 Supported Image Formats

`Input:  PNG / JPEG / WebP / AVIF Output: PNG / JPEG / WebP / AVIF`

Default settings are optimized for **quality, performance, and compatibility**, and can be adjusted at any time.

---

## 🛠 Installation

### From Obsidian Community Plugins (Recommended)

1. Open Obsidian Settings
    
2. Go to Community Plugins
    
3. Search for **One Step Uploader**
    
4. Install and enable
    

### Manual Installation

1. Download `main.js` and `manifest.json` from the latest GitHub Release
    
2. Create folder:
    
    `.obsidian/plugins/one-step-uploader/`
    
3. Place files inside and reload Obsidian
    

---

## 📦 Development

`pnpm install pnpm dev`

Build output:

`build/ ├── main.js ├── manifest.json`

---

## 📜 License

MIT License

---

## 🙏 Acknowledgements

- Obsidian community
    
- Cloudflare R2