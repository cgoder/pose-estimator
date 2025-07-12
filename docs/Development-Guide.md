# 健身姿态分析项目开发指南

## 📋 目录
- [项目概述](#项目概述)
- [环境要求](#环境要求)
- [快速开始](#快速开始)
- [开发流程](#开发流程)
- [代码规范](#代码规范)
- [测试指南](#测试指南)
- [构建部署](#构建部署)
- [故障排除](#故障排除)

## 🎯 项目概述

健身姿态分析项目是一个基于 TensorFlow.js 的 Web 应用，用于实时分析用户的健身姿态，提供动作识别、重复次数计算、姿态质量评估等功能。

### 核心技术栈
- **前端框架**: TypeScript + 原生 Web APIs
- **AI 框架**: TensorFlow.js + Pose Detection Models
- **构建工具**: TypeScript Compiler + npm scripts
- **测试框架**: Jest + ts-jest
- **代码质量**: ESLint + Prettier

### 项目架构
```
src/
├── core/           # 核心模块 (事件总线、状态管理)
├── components/     # 业务组件 (姿态估计、滤波器管理)
├── utils/          # 工具类 (OneEuroFilter、性能监控)
├── types/          # TypeScript 类型定义
├── analysis/       # 分析引擎
├── inference/      # 推理引擎
├── rendering/      # 渲染引擎
├── ui/            # UI 控制器
└── workers/       # Web Workers
```

## 🛠️ 环境要求

### 必需环境
- **Node.js**: >= 18.0.0
- **npm**: >= 8.0.0
- **现代浏览器**: Chrome 90+, Firefox 88+, Safari 14+

### 推荐开发工具
- **IDE**: VS Code + TypeScript 扩展
- **浏览器**: Chrome (最佳调试体验)
- **Git**: 版本控制

### 浏览器兼容性
- ✅ Chrome 90+ (推荐)
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Edge 90+
- ❌ IE (不支持)

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd pose-estimator
```

### 2. 安装依赖
```bash
npm install
```

### 3. 开发模式启动
```bash
# 启动开发服务器
npm run dev

# 或使用 HTTPS (推荐，支持摄像头访问)
npm run dev:https
```

### 4. 构建项目
```bash
# 开发构建
npm run build

# 生产构建
npm run build:prod
```

### 5. 运行测试
```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage
```

## 🔄 开发流程

### 分支管理
```
main          # 主分支，生产环境代码
├── develop   # 开发分支，集成最新功能
├── feature/* # 功能分支
├── bugfix/*  # 修复分支
└── hotfix/*  # 紧急修复分支
```

### 开发步骤
1. **创建功能分支**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **开发和测试**
   ```bash
   # 启动开发服务器
   npm run dev
   
   # 运行测试
   npm test
   
   # 代码检查
   npm run lint
   npm run format
   ```

3. **提交代码**
   ```bash
   git add .
   git commit -m "feat: 添加新功能描述"
   ```

4. **推送和合并**
   ```bash
   git push origin feature/your-feature-name
   # 创建 Pull Request
   ```

### 提交信息规范
使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范：

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

**类型 (type):**
- `feat`: 新功能
- `fix`: 修复 bug
- `docs`: 文档更新
- `style`: 代码格式化
- `refactor`: 重构
- `test`: 测试相关
- `chore`: 构建工具、依赖更新

**示例:**
```
feat(pose-estimation): 添加 MoveNet 模型支持
fix(filter): 修复 OneEuroFilter 参数验证问题
docs(api): 更新 API 文档
```

## 📝 代码规范

### TypeScript 规范
1. **严格类型检查**
   ```typescript
   // ✅ 好的做法
   interface PoseData {
     keypoints: Keypoint[];
     score: number;
   }
   
   function processPose(pose: PoseData): void {
     // 实现
   }
   
   // ❌ 避免使用 any
   function processPose(pose: any): void {
     // 不推荐
   }
   ```

2. **命名规范**
   ```typescript
   // 类名：PascalCase
   class PoseEstimator {}
   
   // 函数/变量：camelCase
   const estimatePose = () => {};
   
   // 常量：UPPER_SNAKE_CASE
   const MAX_KEYPOINTS = 17;
   
   // 接口：PascalCase，以 I 开头（可选）
   interface IPoseConfig {}
   ```

3. **文件组织**
   ```typescript
   // 导入顺序
   // 1. Node.js 内置模块
   // 2. 第三方库
   // 3. 项目内部模块
   
   import { EventEmitter } from 'events';
   import * as tf from '@tensorflow/tfjs';
   import { PoseEstimator } from './PoseEstimator';
   ```

### 代码质量工具
```bash
# ESLint 检查
npm run lint

# Prettier 格式化
npm run format

# TypeScript 类型检查
npm run type-check
```

## 🧪 测试指南

### 测试结构
```
tests/
├── core/           # 核心模块测试
├── components/     # 组件测试
├── utils/          # 工具类测试
└── setup.ts        # 测试配置
```

### 编写测试
```typescript
// 示例：OneEuroFilter.test.ts
import { OneEuroFilter } from '../src/utils/OneEuroFilter';

describe('OneEuroFilter', () => {
  test('应该正确初始化滤波器', () => {
    const filter = new OneEuroFilter(30, 1.0, 0.5, 1.0);
    expect(filter).toBeDefined();
  });
  
  test('应该正确过滤数据', () => {
    const filter = new OneEuroFilter(30, 1.0, 0.5, 1.0);
    const result = filter.filter(10.0, 0);
    expect(typeof result).toBe('number');
  });
});
```

### 测试命令
```bash
# 运行所有测试
npm test

# 监听模式
npm run test:watch

# 覆盖率报告
npm run test:coverage

# 特定文件测试
npm test OneEuroFilter.test.ts
```

### 测试覆盖率目标
- **语句覆盖率**: > 90%
- **分支覆盖率**: > 85%
- **函数覆盖率**: > 90%
- **行覆盖率**: > 90%

## 🏗️ 构建部署

### 本地构建
```bash
# 开发构建
npm run build

# 生产构建（优化）
npm run build:prod

# 清理构建文件
npm run clean
```

### 部署流程

#### 1. 静态部署 (推荐)
```bash
# 构建生产版本
npm run build:prod

# 部署到静态托管服务
# - Vercel
# - Netlify
# - GitHub Pages
# - Cloudflare Pages
```

#### 2. 服务器部署
```bash
# 使用内置 Python 服务器
python server.py

# 使用 Node.js 服务器
npm run serve
```

#### 3. HTTPS 配置
```bash
# 生成自签名证书（开发用）
npm run https:setup

# 启动 HTTPS 服务器
npm run dev:https
```

### 环境变量
```bash
# .env 文件示例
NODE_ENV=production
TENSORFLOW_BACKEND=webgl
POSE_MODEL=movenet
DEBUG_MODE=false
```

## 🔧 故障排除

### 常见问题

#### 1. 摄像头访问被拒绝
**问题**: 浏览器不允许访问摄像头
**解决方案**:
```bash
# 使用 HTTPS 服务器
npm run dev:https

# 或启用 HTTP 调试模式
node dev/tools/enable-http-debug.js
```

#### 2. TensorFlow.js 加载失败
**问题**: 模型加载超时或失败
**解决方案**:
- 检查网络连接
- 尝试不同的 CDN 源
- 使用本地模型文件

#### 3. 性能问题
**问题**: 帧率低或卡顿
**解决方案**:
```typescript
// 降低输入分辨率
const config = {
  inputResolution: { width: 320, height: 240 },
  outputStride: 16
};

// 使用 Web Workers
const worker = new Worker('./pose-worker.js');
```

#### 4. 内存泄漏
**问题**: 长时间运行后内存占用过高
**解决方案**:
```typescript
// 及时释放张量
tf.tidy(() => {
  // TensorFlow.js 操作
});

// 手动释放
tensor.dispose();
```

### 调试工具
```bash
# 启用调试模式
npm run dev:debug

# 性能分析
npm run profile

# 内存分析
npm run memory-check
```

### 日志级别
```typescript
// 设置日志级别
import { Logger } from './src/utils/Logger';

Logger.setLevel('debug'); // debug, info, warn, error
```

## 📚 API 文档

### 核心模块
- [EventBus](./api/EventBus.md) - 事件总线
- [StateManager](./api/StateManager.md) - 状态管理
- [PoseEstimator](./api/PoseEstimator.md) - 姿态估计

### 工具类
- [OneEuroFilter](./api/OneEuroFilter.md) - 滤波器
- [PerformanceMonitor](./api/PerformanceMonitor.md) - 性能监控

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 推送到分支
5. 创建 Pull Request

### 代码审查清单
- [ ] 代码符合规范
- [ ] 测试覆盖率达标
- [ ] 文档已更新
- [ ] 性能无回归
- [ ] 兼容性测试通过

## 📞 支持

- **文档**: [项目文档](./docs/)
- **问题反馈**: [GitHub Issues](https://github.com/your-repo/issues)
- **讨论**: [GitHub Discussions](https://github.com/your-repo/discussions)

---

**最后更新**: 2024年12月
**版本**: 1.0.0