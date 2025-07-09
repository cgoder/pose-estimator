# PWA 部署故障排除指南

本文档帮助您解决 PWA 姿态估计器在 Cloudflare Pages 部署过程中可能遇到的常见问题。

## 🔄 重定向问题

### 问题："重定向你太多次" 错误

**症状**：访问网站时浏览器显示 "ERR_TOO_MANY_REDIRECTS" 或 "重定向你太多次"

**原因**：`_redirects` 文件配置不当，导致无限重定向循环

**解决方案**：

1. **检查 `_redirects` 文件**
   ```
   # ❌ 错误配置 - 会导致无限重定向
   /*    /main.html   200
   
   # ✅ 正确配置 - 只重定向特定路径
   /     /main.html   200
   /index.html    /main.html   301
   /index         /main.html   301
   ```

2. **避免使用通配符 `/*`**
   - 通配符会匹配所有路径，包括目标路径本身
   - 导致 `/main.html` 重定向到 `/main.html` 的无限循环

3. **使用具体的路径匹配**
   - 只为需要重定向的特定路径设置规则
   - 让其他文件（如 CSS、JS、图片）正常加载

### 问题：根路径无法访问

**症状**：访问 `https://your-site.pages.dev/` 显示 404 错误

**解决方案**：
```
# 在 _redirects 文件中添加
/     /main.html   200
```

## 🚫 Service Worker 问题

### 问题：Service Worker 注册失败

**症状**：控制台显示 "Failed to register service worker"

**解决方案**：

1. **检查文件路径**
   ```javascript
   // 确保路径正确
   navigator.serviceWorker.register('/sw.js')
   ```

2. **检查 HTTPS**
   - Service Worker 只能在 HTTPS 或 localhost 环境下工作
   - 确保 Cloudflare Pages 已启用 HTTPS

3. **检查文件存在性**
   - 确保 `sw.js` 文件存在于根目录
   - 检查文件名拼写是否正确

### 问题：缓存不更新

**症状**：修改代码后用户看到的仍是旧版本

**解决方案**：

1. **更新缓存版本**
   ```javascript
   // 在 sw.js 中更新版本号
   const CACHE_NAME = 'pose-estimator-v1.0.1'; // 增加版本号
   ```

2. **清除 Cloudflare 缓存**
   - 在 Cloudflare Dashboard 中点击 "Purge Cache"
   - 或使用 "Purge Everything"

3. **强制刷新浏览器**
   - 按 `Ctrl+F5` (Windows) 或 `Cmd+Shift+R` (Mac)

## 📱 PWA 安装问题

### 问题：无法显示安装提示

**症状**：浏览器不显示 "安装应用" 选项

**解决方案**：

1. **检查 manifest.json**
   ```json
   {
     "name": "姿态估计器",
     "short_name": "PoseEstimator",
     "start_url": "/main.html",
     "display": "standalone",
     "icons": [
       {
         "src": "icon-192.svg",
         "sizes": "192x192",
         "type": "image/svg+xml"
       }
     ]
   }
   ```

2. **检查图标文件**
   - 确保图标文件存在且可访问
   - 检查文件路径和 MIME 类型

3. **检查 HTTPS**
   - PWA 安装需要 HTTPS 环境

### 问题：图标不显示

**症状**：PWA 安装后图标显示为默认图标

**解决方案**：

1. **检查图标格式**
   - 推荐使用 PNG 格式而非 SVG
   - 确保图标尺寸正确 (192x192, 512x512)

2. **更新 manifest.json**
   ```json
   "icons": [
     {
       "src": "icon-192.png",
       "sizes": "192x192",
       "type": "image/png",
       "purpose": "any maskable"
     }
   ]
   ```

## 🎥 摄像头访问问题

### 问题：无法访问摄像头

**症状**：页面显示 "摄像头访问被拒绝" 或黑屏

**解决方案**：

1. **检查权限**
   - 确保用户已授权摄像头访问
   - 在浏览器地址栏点击摄像头图标检查权限

2. **检查 HTTPS**
   - 现代浏览器要求 HTTPS 才能访问摄像头
   - 确保网站使用 HTTPS 协议

3. **检查设备兼容性**
   - 确保设备有可用的摄像头
   - 检查其他应用是否正在使用摄像头

## 🌐 网络和加载问题

### 问题：TensorFlow.js 加载失败

**症状**：控制台显示 "Failed to load TensorFlow.js"

**解决方案**：

1. **检查 CDN 链接**
   ```html
   <!-- 确保使用最新稳定版本 -->
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-core"></script>
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-converter"></script>
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-webgl"></script>
   <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/pose-detection"></script>
   ```

2. **检查网络连接**
   - 确保网络连接正常
   - 尝试访问 CDN 链接验证可用性

3. **使用备用 CDN**
   ```html
   <!-- 备用方案：使用 unpkg CDN -->
   <script src="https://unpkg.com/@tensorflow/tfjs-core"></script>
   ```

### 问题：页面加载缓慢

**症状**：首次访问页面加载时间过长

**解决方案**：

1. **启用 Cloudflare 优化**
   - 在 Cloudflare Dashboard 中启用 "Auto Minify"
   - 启用 "Brotli" 压缩
   - 启用 "Rocket Loader"

2. **优化资源加载**
   ```html
   <!-- 预加载关键资源 -->
   <link rel="preload" href="main.js" as="script">
   <link rel="preload" href="oneEuroFilter.js" as="script">
   ```

## 🔧 调试工具

### Chrome DevTools 调试

1. **Application 标签**
   - 检查 Service Worker 状态
   - 查看 Manifest 配置
   - 检查缓存存储

2. **Network 标签**
   - 查看资源加载状态
   - 检查 HTTP 状态码
   - 分析加载时间

3. **Console 标签**
   - 查看错误信息
   - 检查 Service Worker 日志

### Lighthouse 审计

1. **运行 PWA 审计**
   - 在 DevTools 中打开 Lighthouse
   - 选择 "Progressive Web App" 类别
   - 运行审计并查看建议

2. **性能优化**
   - 查看 Performance 评分
   - 按照建议优化加载速度

## 📞 获取帮助

如果以上解决方案都无法解决您的问题：

1. **检查浏览器控制台**
   - 查看详细的错误信息
   - 记录错误堆栈跟踪

2. **查看 Cloudflare 日志**
   - 在 Cloudflare Dashboard 中查看访问日志
   - 检查是否有服务器错误

3. **测试不同环境**
   - 在不同浏览器中测试
   - 在不同设备上测试
   - 使用隐私模式测试

4. **联系支持**
   - Cloudflare 社区论坛
   - GitHub Issues（如果是开源项目）

## 🎯 预防措施

1. **定期测试**
   - 在部署前在本地测试所有功能
   - 使用不同浏览器进行兼容性测试

2. **监控性能**
   - 设置 Cloudflare Analytics
   - 监控错误率和性能指标

3. **版本控制**
   - 使用 Git 管理代码版本
   - 为每次部署打标签

4. **备份配置**
   - 保存工作的配置文件
   - 记录成功的部署步骤