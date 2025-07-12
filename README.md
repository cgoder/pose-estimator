# 🏃‍♂️ 健身姿态分析系统 - Fitness Pose Analyzer

基于 TensorFlow.js 的智能健身姿态分析系统，提供实时姿态检测、动作识别、重复次数计算和姿态质量评估功能。

## ✨ 核心特性

### 🎯 智能姿态分析
- **实时姿态估计**: 基于 TensorFlow.js 的高性能人体姿态检测
- **多模型支持**: 支持 MoveNet、PoseNet、BlazePose 等主流模型
- **动作识别**: 自动识别深蹲、俯卧撑、跑步等健身动作
- **重复次数计算**: 智能统计运动重复次数
- **姿态质量评估**: 实时评估动作标准度并提供改进建议

### 🎛️ One Euro Filter 滤波优化
- **抖动消除**: 集成 One Euro Filter 算法，显著减少姿态抖动
- **TypeScript 重构**: 完全重写为 TypeScript，提供更好的类型安全
- **实时参数调节**: 支持频率、截止频率、Beta 等参数的实时调整
- **预设配置**: 提供多种滤波器预设（平滑、响应、平衡等）
- **热更新支持**: 支持配置的导入导出和热更新

### 🏗️ 模块化架构
- **核心模块**: EventBus 事件总线、StateManager 状态管理
- **组件系统**: 可复用的姿态估计、滤波器管理组件
- **数据源抽象**: 支持摄像头、视频文件、图像文件等多种输入源
- **渲染引擎**: 高性能的 Canvas/WebGL 渲染系统
- **Web Workers**: 多线程处理，避免 UI 阻塞

### 🚀 性能与优化
- **WebGL 加速**: 利用 GPU 进行模型推理加速
- **内存管理**: 智能内存清理，防止内存泄漏
- **性能监控**: 实时显示 FPS、内存使用等性能指标
- **帧率优化**: 自适应帧率控制，平衡性能与流畅度

## 🚀 快速开始

### 环境要求
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **现代浏览器**: Chrome 90+, Firefox 88+, Safari 14+

### 安装依赖
```bash
# 克隆项目
git clone <repository-url>
cd pose-estimator

# 安装依赖
npm install
```

### 开发模式
```bash
# 启动开发服务器
npm run dev

# 或使用 HTTPS (推荐，支持摄像头访问)
npm run dev:https
```

### 构建部署
```bash
# 开发构建
npm run build

# 生产构建
npm run build:prod

# 运行测试
npm test
```

## 📁 项目结构

```
pose-estimator/
├── src/                     # 源代码 (TypeScript)
│   ├── core/               # 核心模块
│   │   ├── EventBus.ts     # 事件总线
│   │   ├── StateManager.ts # 状态管理
│   │   └── dataSources/    # 数据源抽象
│   ├── components/         # 业务组件
│   │   ├── PoseEstimator.ts        # 姿态估计器
│   │   ├── OneEuroFilterManager.ts # 滤波器管理
│   │   └── UIManager.ts            # UI管理器
│   ├── utils/              # 工具类
│   │   ├── OneEuroFilter.ts        # OneEuroFilter (TypeScript)
│   │   ├── PerformanceMonitor.ts   # 性能监控
│   │   └── constants.ts            # 配置常量
│   ├── analysis/           # 分析引擎
│   ├── inference/          # 推理引擎
│   ├── rendering/          # 渲染引擎
│   ├── workers/            # Web Workers
│   └── types/              # TypeScript 类型定义
├── tests/                  # 测试文件
│   ├── core/              # 核心模块测试
│   ├── components/        # 组件测试
│   └── utils/             # 工具类测试
├── docs/                  # 文档
│   ├── Development-Guide.md        # 开发指南
│   ├── API-Documentation.md       # API文档
│   ├── Project-Restructure-Report.md # 重构报告
│   └── OneEuroFilter-Migration-Report.md # 迁移报告
├── dev/                   # 开发工具
│   ├── tools/             # 开发工具
│   └── test-pages/        # 测试页面
├── dist/                  # 构建输出
├── main.html             # 主入口页面
└── 配置文件...
```

## 🎮 使用说明

### 基本操作
1. **启动应用**: 打开页面后自动请求摄像头权限
2. **选择数据源**: 支持摄像头、视频文件、图像文件
3. **模型选择**: 在控制面板中选择合适的姿态检测模型
4. **分析设置**: 配置运动类型和分析参数
5. **实时反馈**: 查看姿态质量评分和改进建议

### 健身分析功能
- **深蹲分析**: 检测深蹲动作，评估膝盖角度、背部姿态
- **俯卧撑分析**: 统计重复次数，评估动作标准度
- **跑姿分析**: 分析跑步姿态，提供步频、触地时间等指标
- **通用姿态**: 支持自定义动作的姿态分析

### 键盘快捷键
- `Ctrl+H`: 切换控制面板
- `Ctrl+R`: 重启检测器
- `Space`: 暂停/继续检测
- `ESC`: 隐藏所有面板

## 🔧 技术栈

### 核心技术
- **语言**: TypeScript (严格模式)
- **AI框架**: TensorFlow.js 4.15+
- **姿态检测**: @tensorflow-models/pose-detection
- **滤波算法**: One Euro Filter (TypeScript 重构版)
- **测试框架**: Jest + ts-jest

### 开发工具
- **构建**: TypeScript Compiler
- **代码质量**: ESLint + Prettier
- **版本控制**: Git
- **包管理**: npm

### 部署平台
- **静态托管**: Vercel, Netlify, GitHub Pages
- **CDN**: Cloudflare Pages
- **容器**: Docker (可选)

## 📚 文档

- **[开发指南](./docs/Development-Guide.md)** - 完整的开发流程和规范
- **[API 文档](./docs/API-Documentation.md)** - 详细的 API 参考
- **[重构报告](./docs/Project-Restructure-Report.md)** - 项目重构详情
- **[OneEuroFilter 迁移](./docs/OneEuroFilter-Migration-Report.md)** - TypeScript 迁移报告

## 🧪 测试

```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 特定测试
npm test OneEuroFilter.test.ts
```

### 测试覆盖率
- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 90%

## 🌐 浏览器兼容性

| 浏览器 | 版本要求 | 支持状态 | 备注 |
|--------|----------|----------|------|
| Chrome | >= 90 | ✅ 完全支持 | 推荐使用 |
| Firefox | >= 88 | ✅ 完全支持 | |
| Safari | >= 14 | ✅ 完全支持 | |
| Edge | >= 90 | ✅ 完全支持 | |
| Mobile Safari | >= 14 | ✅ 完全支持 | |
| Chrome Mobile | >= 90 | ✅ 完全支持 | |

## 🐛 故障排除

### 常见问题

1. **摄像头无法访问**
   ```bash
   # 启用 HTTPS 服务器
   npm run dev:https
   
   # 或启用 HTTP 调试模式
   node dev/tools/enable-http-debug.js
   ```

2. **模型加载失败**
   - 检查网络连接
   - 清空浏览器缓存
   - 尝试切换到其他模型

3. **性能问题**
   - 降低输入分辨率
   - 使用 Web Workers
   - 启用 WebGL 后端

### 调试工具
```bash
# 启用调试模式
npm run dev:debug

# 性能分析
npm run profile

# 内存分析
npm run memory-check
```

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 创建 Pull Request

### 代码规范
- 使用 TypeScript 严格模式
- 遵循 ESLint 和 Prettier 配置
- 编写单元测试
- 更新相关文档

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [TensorFlow.js](https://www.tensorflow.org/js) - 机器学习框架
- [One Euro Filter](http://cristal.univ-lille.fr/~casiez/1euro/) - 滤波算法
- [Pose Detection Models](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection) - 姿态检测模型

---

**最后更新**: 2024年12月  
**版本**: 2.0.0 (TypeScript 重构版)