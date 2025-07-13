# 🤖 姿态估计器 - Pose Estimator 🎯

基于 TensorFlow.js 的人体姿态估计应用，支持 MoveNet 和 PoseNet 模型，集成 One Euro Filter 滤波器优化，提供流畅的姿态跟踪体验。

## ✨ 核心特性

### 🎯 AI 姿态检测
- **实时姿态估计**: 基于 TensorFlow.js 的高性能人体姿态检测
- **多模型支持**: 支持 MoveNet 和 PoseNet MobileNet 模型
- **智能混合缓存**: 根据浏览器能力自动选择最佳缓存策略（File System Access API、Cache API、IndexedDB）
- **关键点检测**: 包括头部、躯干、四肢的完整姿态信息

### 🎛️ One Euro Filter 滤波优化
- **抖动消除**: 集成 One Euro Filter 算法，显著减少姿态抖动
- **实时参数调节**: 支持频率、截止频率、Beta 等参数的实时调整
- **预设配置**: 提供多种滤波器预设（平滑、响应、平衡等）
- **智能启用**: 可根据需要启用/禁用滤波功能

### 🚀 性能与优化
- **WebGL 加速**: 利用 GPU 进行模型推理加速
- **内存管理**: 智能内存清理，防止内存泄漏
- **性能监控**: 实时显示 FPS、内存使用等性能指标
- **帧率优化**: 自适应帧率控制，平衡性能与流畅度

### 🎨 可视化与交互
- **骨架渲染**: 可切换显示人体骨架连接线
- **关键点显示**: 可切换显示关键点标记
- **置信度过滤**: 根据检测置信度过滤低质量关键点
- **实时状态**: 显示检测状态、模型信息等

### 🛡️ 稳定性与错误处理
- **完善错误处理**: 友好的错误提示和恢复机制
- **环境检测**: 自动检测浏览器兼容性和必要功能
- **重试机制**: 网络请求和模型加载的智能重试
- **调试支持**: 详细的日志记录和调试信息

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
│   │   ├── HybridCacheManager.js # 混合缓存管理器（智能缓存策略）
│   │   ├── CacheAPIModelManager.js # Cache API 缓存管理
│   │   ├── FileSystemCacheManager.js # 文件系统缓存管理
│   │   ├── IndexedDBCacheManager.js # IndexedDB 缓存管理
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