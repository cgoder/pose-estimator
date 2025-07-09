# 🤖 姿态估计 - Pose Estimator

基于 TensorFlow.js 的姿态估计应用，提供流畅、准确的人体姿态检测和可视化。

## ✨ 特性

- 🎯 *姿态检测**: 使用 MoveNet 和 PoseNet 模型进行高精度姿态估计
- 🔧 **One Euro Filter**: 智能滤波算法，减少抖动，提供更流畅的检测结果
- 📱 **响应式设计**: 支持桌面和移动设备，自适应不同屏幕尺寸
- ⚡ **性能优化**: 智能缓存、内存管理和性能监控
- 🎨 **现代UI**: 美观的用户界面，支持实时控制和状态显示
- 🔒 **安全可靠**: 完善的错误处理和资源管理
- 📊 **性能监控**: 实时FPS、内存使用和推理时间显示
- 🎮 **交互控制**: 支持键盘快捷键和实时参数调整

## 🚀 快速开始

### 环境要求

- Node.js >= 16.0.0
- 现代浏览器（支持 WebGL 和 getUserMedia）
- HTTPS 环境（摄像头访问需要）

### 安装依赖

```bash
# 安装依赖
npm install
```

### 开发模式

```bash
# 启动开发服务器
npm run dev

# 或者使用 HTTPS（推荐）
npm run serve
```

访问 `http://localhost:8080` 或 `https://localhost:8080`

### 生产构建

```bash
# 构建项目
npm run build

# 部署到 GitHub Pages
npm run deploy
```

## 📁 项目结构

```
pose-estimation-one-euro-filter/
├── src/                          # 源代码目录
│   ├── components/               # 组件模块
│   │   ├── ModelCacheManager.js  # 模型缓存管理
│   │   ├── OneEuroFilterManager.js # One Euro 滤波器管理
│   │   ├── PoseEstimator.js      # 姿态估计器核心
│   │   └── UIManager.js          # UI 管理器
│   ├── utils/                    # 工具模块
│   │   ├── constants.js          # 配置常量
│   │   ├── errorHandling.js      # 错误处理
│   │   └── performance.js        # 性能监控
│   ├── styles/                   # 样式文件
│   │   └── main.css             # 主样式文件
│   └── main.js                  # 主入口文件
├── main.html                    # HTML 入口文件
├── manifest.json               # PWA 配置
├── sw.js                      # Service Worker
├── package.json               # 项目配置
├── tsconfig.json             # TypeScript 配置
└── README.md                 # 项目文档
```

## 🎮 使用说明

### 基本操作

1. **启动应用**: 打开页面后自动请求摄像头权限
2. **控制面板**: 按 `Ctrl+H` 切换控制面板显示
3. **模型切换**: 在控制面板中选择 MoveNet 或 PoseNet 模型
4. **显示选项**: 切换骨架、关键点和性能信息的显示
5. **滤波器**: 启用/禁用 One Euro Filter 平滑效果

### 键盘快捷键

- `Ctrl+H`: 切换控制面板
- `Ctrl+R`: 重启检测器
- `Space`: 暂停/继续检测
- `ESC`: 隐藏所有面板

## 🔧 技术栈

- **前端框架**: 原生 JavaScript (ES6+)
- **AI 框架**: TensorFlow.js
- **姿态检测**: @tensorflow-models/pose-detection
- **滤波算法**: One Euro Filter
- **构建工具**: TypeScript, ESLint, Prettier
- **测试框架**: Jest
- **部署**: GitHub Pages, Netlify, Vercel

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 支持状态 |
|--------|----------|----------|
| Chrome | >= 88 | ✅ 完全支持 |
| Firefox | >= 85 | ✅ 完全支持 |
| Safari | >= 14 | ✅ 完全支持 |
| Edge | >= 88 | ✅ 完全支持 |
| Mobile Safari | >= 14 | ✅ 完全支持 |
| Chrome Mobile | >= 88 | ✅ 完全支持 |

## 🐛 问题排查

### 常见问题

1. **摄像头无法访问**
   - 确保使用 HTTPS 协议
   - 检查浏览器摄像头权限设置
   - 确认摄像头未被其他应用占用

2. **模型加载失败**
   - 检查网络连接
   - 清空浏览器缓存
   - 尝试切换到其他模型

3. **性能问题**
   - 关闭不必要的显示选项
   - 降低摄像头分辨率
   - 使用性能更好的设备

### 调试模式

```javascript
// 在浏览器控制台中访问应用实例
window.poseApp.getAppStatus(); // 获取应用状态
window.poseApp.restart();      // 重启应用
```

## 📄 许可证

本项目采用 MIT 许可证。

## 🙏 致谢

- [TensorFlow.js](https://www.tensorflow.org/js) - 机器学习框架
- [One Euro Filter](http://cristal.univ-lille.fr/~casiez/1euro/) - 滤波算法
- [Pose Detection Models](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) - 姿态检测模型