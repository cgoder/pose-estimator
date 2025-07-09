# 部署到 Cloudflare Pages 指南

本指南将帮助您将姿态估计器 PWA 应用部署到 Cloudflare Pages。

## 🌟 为什么选择 Cloudflare Pages

- **免费**: 提供慷慨的免费额度
- **全球 CDN**: 超快的加载速度
- **自动 HTTPS**: 自动配置 SSL 证书
- **Git 集成**: 支持自动部署
- **无服务器**: 无需管理服务器
- **PWA 友好**: 完美支持 PWA 功能

## 📋 部署前准备

### 1. 创建 Git 仓库

如果还没有 Git 仓库，请先创建：

```bash
# 在项目目录中初始化 Git
cd c:\Users\tienchiu\code\sample\1euro
git init

# 添加所有文件
git add .

# 提交代码
git commit -m "Initial commit: PWA pose estimator"

# 添加远程仓库（GitHub/GitLab/Bitbucket）
git remote add origin https://github.com/yourusername/pose-estimator-pwa.git

# 推送到远程仓库
git push -u origin main
```

### 2. 优化项目结构

确保项目根目录包含以下文件：
- `main.html` (入口文件)
- `manifest.json`
- `sw.js`
- 图标文件
- 其他资源文件

## 🚀 Cloudflare Pages 部署步骤

### 方法一：通过 Git 仓库部署（推荐）

1. **登录 Cloudflare**
   - 访问 [Cloudflare Dashboard](https://dash.cloudflare.com/)
   - 登录或注册账户

2. **创建 Pages 项目**
   - 点击左侧菜单的 "Pages"
   - 点击 "Create a project"
   - 选择 "Connect to Git"

3. **连接 Git 仓库**
   - 选择 Git 提供商（GitHub/GitLab/Bitbucket）
   - 授权 Cloudflare 访问您的仓库
   - 选择包含 PWA 项目的仓库

4. **配置构建设置**
   ```
   项目名称: pose-estimator-pwa
   生产分支: main
   构建命令: (留空)
   构建输出目录: /
   根目录: /
   ```

5. **环境变量**（可选）
   - 通常不需要设置环境变量
   - 如果需要，可以在 "Environment variables" 中添加

6. **部署**
   - 点击 "Save and Deploy"
   - Cloudflare 将自动构建和部署您的应用

### 方法二：直接上传文件

1. **创建 Pages 项目**
   - 在 Cloudflare Dashboard 中点击 "Pages"
   - 选择 "Upload assets"

2. **上传文件**
   - 将所有项目文件打包成 ZIP
   - 上传 ZIP 文件
   - 设置项目名称

3. **配置域名**
   - 系统会自动分配一个 `.pages.dev` 域名
   - 也可以绑定自定义域名

## ⚙️ 高级配置

### 1. 创建 `_headers` 文件

在项目根目录创建 `_headers` 文件来优化 PWA 性能：

```
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()

/sw.js
  Cache-Control: no-cache

/manifest.json
  Content-Type: application/manifest+json
  Cache-Control: public, max-age=31536000

/*.js
  Cache-Control: public, max-age=31536000
  Content-Type: application/javascript

/*.svg
  Cache-Control: public, max-age=31536000
  Content-Type: image/svg+xml

/*.html
  Cache-Control: no-cache
```

### 2. 创建 `_redirects` 文件

处理 SPA 路由（如果需要）：

```
# 将所有请求重定向到 main.html
/*    /main.html   200

# 或者设置根路径重定向
/     /main.html   200
```

### 3. 创建 `wrangler.toml` 文件（可选）

用于更高级的配置：

```toml
name = "pose-estimator-pwa"
compatibility_date = "2024-01-01"

[env.production]
route = "your-domain.com/*"

[[env.production.kv_namespaces]]
binding = "CACHE"
id = "your-kv-namespace-id"
```

## 🔧 部署后优化

### 1. 配置自定义域名

1. 在 Cloudflare Pages 项目中点击 "Custom domains"
2. 添加您的域名
3. 按照提示配置 DNS 记录
4. 等待 SSL 证书自动配置

### 2. 启用 Cloudflare 优化功能

在 Cloudflare Dashboard 的 "Speed" 部分：
- 启用 "Auto Minify" (HTML, CSS, JS)
- 启用 "Brotli" 压缩
- 启用 "Rocket Loader" (可选)

### 3. 配置缓存规则

在 "Caching" 部分设置：
- Browser Cache TTL: 4 hours
- Cloudflare Cache TTL: Respect Existing Headers
- Always Online: On

## 📊 监控和分析

### 1. Cloudflare Analytics
- 查看访问量、带宽使用情况
- 监控性能指标
- 分析用户地理分布

### 2. Web Vitals
- 在 "Speed" 标签中查看 Core Web Vitals
- 监控页面加载性能

## 🚨 常见问题和解决方案

### 1. Service Worker 不工作
**问题**: PWA 功能无法正常使用
**解决**: 确保 `sw.js` 文件路径正确，检查控制台错误

### 2. 图标不显示
**问题**: PWA 图标无法加载
**解决**: 检查 `manifest.json` 中的图标路径，确保文件存在

### 3. 缓存问题
**问题**: 更新后用户看到的仍是旧版本
**解决**: 
- 更新 Service Worker 中的 `CACHE_NAME`
- 在 Cloudflare 中清除缓存

### 4. HTTPS 重定向
**问题**: 混合内容错误
**解决**: 在 Cloudflare SSL/TLS 设置中启用 "Always Use HTTPS"

## 🔄 自动部署工作流

### GitHub Actions 示例

创建 `.github/workflows/deploy.yml`：

```yaml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [ main ]
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Cloudflare Pages
      uses: cloudflare/pages-action@v1
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        projectName: pose-estimator-pwa
        directory: ./
        gitHubToken: ${{ secrets.GITHUB_TOKEN }}
```

## 📈 性能优化建议

1. **启用 HTTP/3**: 在 Cloudflare Network 设置中启用
2. **使用 WebP 图像**: 如果需要更多图像资源
3. **启用 Early Hints**: 提高页面加载速度
4. **配置 Workers**: 用于更复杂的边缘计算需求

## 🎯 部署检查清单

- [ ] Git 仓库已创建并推送代码
- [ ] Cloudflare Pages 项目已创建
- [ ] 构建设置正确配置
- [ ] 自定义域名已配置（如需要）
- [ ] SSL 证书已激活
- [ ] PWA 功能测试正常
- [ ] Service Worker 正常工作
- [ ] 图标和 manifest 正确加载
- [ ] 性能优化已启用
- [ ] 监控和分析已设置

部署完成后，您的 PWA 应用将通过全球 CDN 提供服务，具备出色的性能和可靠性！