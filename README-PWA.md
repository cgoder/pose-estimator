# 姿态估计器 PWA 应用

基于 TensorFlow.js 和 One Euro Filter 的实时姿态估计 Progressive Web App (PWA)。

## 🚀 功能特性

- **离线使用**: 支持离线缓存，无网络时也能使用
- **桌面安装**: 可安装到桌面，像原生应用一样使用
- **实时姿态检测**: 使用 TensorFlow.js 进行实时人体姿态估计
- **One Euro Filter**: 平滑关键点数据，减少抖动
- **性能监控**: 实时显示 FPS 和处理时间
- **参数调节**: 可调节滤波器参数以优化效果

## 📱 PWA 特性

### 安装到桌面
1. 在支持的浏览器中打开应用
2. 点击右上角的"安装应用"按钮
3. 或使用浏览器的"添加到主屏幕"功能

### 离线使用
- 首次访问后，应用会自动缓存所需资源
- 断网后仍可正常使用（需要本地摄像头）
- 自动检测并提示应用更新

## 🛠️ 本地开发

### 方法一：使用 Python 服务器（推荐）

```bash
# 进入项目目录
cd c:\Users\tienchiu\code\sample\1euro

# 启动服务器
python server.py

# 在浏览器中访问
# http://localhost:8080
```

### 方法二：使用 Node.js 服务器

```bash
# 安装 http-server
npm install -g http-server

# 启动服务器
http-server -p 8080 -c-1

# 在浏览器中访问
# http://localhost:8080
```

### 方法三：使用 Live Server (VS Code)

1. 安装 Live Server 扩展
2. 右键 `main.html` 选择 "Open with Live Server"

## 🌐 部署到生产环境

### GitHub Pages

1. 将代码推送到 GitHub 仓库
2. 在仓库设置中启用 GitHub Pages
3. 选择源分支（通常是 main 或 gh-pages）
4. 访问 `https://username.github.io/repository-name`

### Netlify

1. 将代码推送到 Git 仓库
2. 在 Netlify 中连接仓库
3. 设置构建命令（无需构建）
4. 设置发布目录为根目录
5. 部署完成后获得 HTTPS 链接

### Vercel

1. 安装 Vercel CLI: `npm i -g vercel`
2. 在项目目录运行: `vercel`
3. 按提示完成部署

## 📋 文件结构

```
1euro/
├── main.html          # 主页面
├── main.js            # 主要逻辑
├── oneEuroFilter.js   # One Euro Filter 实现
├── manifest.json      # PWA 清单文件
├── sw.js              # Service Worker
├── icon-192.svg       # 192x192 图标
├── icon-512.svg       # 512x512 图标
├── server.py          # 本地测试服务器
└── README-PWA.md      # 本文档
```

## 🔧 PWA 配置说明

### manifest.json
- 定义应用名称、图标、主题色等
- 配置显示模式为 `standalone`
- 设置启动 URL 和作用域

### Service Worker (sw.js)
- 缓存应用资源以支持离线使用
- 拦截网络请求，优先使用缓存
- 处理应用更新逻辑

### 图标文件
- `icon-192.svg`: 192x192 像素图标
- `icon-512.svg`: 512x512 像素图标
- 使用 SVG 格式，支持任意缩放

## 🌟 浏览器支持

### 完全支持 PWA 的浏览器
- Chrome 67+
- Firefox 79+
- Safari 14.1+
- Edge 79+

### 部分支持的浏览器
- Safari (iOS): 支持添加到主屏幕，但不支持 Service Worker 的所有功能
- 其他现代浏览器: 基本功能可用

## 🚨 注意事项

1. **HTTPS 要求**: PWA 需要 HTTPS 环境（localhost 除外）
2. **摄像头权限**: 需要用户授权访问摄像头
3. **浏览器兼容性**: 确保目标浏览器支持所需的 Web API
4. **性能优化**: 在移动设备上可能需要降低处理频率

## 🔍 调试技巧

### Chrome DevTools
1. 打开 F12 开发者工具
2. 切换到 "Application" 标签
3. 查看 "Service Workers" 和 "Manifest" 部分
4. 使用 "Lighthouse" 进行 PWA 审计

### 常见问题
- **Service Worker 未注册**: 检查控制台错误信息
- **图标不显示**: 确保图标文件路径正确
- **无法安装**: 检查 manifest.json 配置
- **离线不工作**: 检查 Service Worker 缓存逻辑

## 📈 性能优化建议

1. **图像优化**: 使用 WebP 格式的图标（如需要）
2. **代码分割**: 按需加载 TensorFlow.js 模型
3. **缓存策略**: 优化 Service Worker 缓存策略
4. **压缩资源**: 启用 gzip 压缩

## 🤝 贡献

欢迎提交 Issue 和 Pull Request 来改进这个项目！

## 📄 许可证

MIT License