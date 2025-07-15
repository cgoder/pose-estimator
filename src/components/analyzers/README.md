# 运动分析器模块 (Exercise Analyzers)

## 概述

这个模块包含了重构后的运动分析系统，采用模块化设计，将原来的单一大文件拆分为多个独立的分析器模块。每个分析器专注于特定的运动类型，提高了代码的可维护性、可扩展性和性能。

## 架构设计

### 核心组件

```
analyzers/
├── index.js                    # 模块入口文件
├── ExerciseAnalysisEngine.js    # 主分析引擎
├── BaseExerciseAnalyzer.js      # 基础分析器类
├── SquatAnalyzer.js            # 深蹲分析器
├── PushUpAnalyzer.js           # 俯卧撑分析器
├── PlankAnalyzer.js            # 平板支撑分析器
├── JumpingJackAnalyzer.js      # 开合跳分析器
├── LungeAnalyzer.js            # 弓步蹲分析器
├── RunningAnalyzer.js          # 跑步分析器
├── WalkingAnalyzer.js          # 步行分析器
└── README.md                   # 文档说明
```

### 设计模式

1. **策略模式 (Strategy Pattern)**: 每个运动分析器实现相同的接口，可以动态切换
2. **工厂模式 (Factory Pattern)**: 提供工厂函数创建分析器实例
3. **模板方法模式 (Template Method)**: 基础分析器定义通用方法，具体分析器实现特定逻辑

## 使用方法

### 基本使用

```javascript
import ExerciseAnalysisEngine from './analyzers';

// 创建分析引擎
const engine = new ExerciseAnalysisEngine();

// 分析姿态关键点
const result = engine.analyze(keypoints, { timestamp: Date.now() });
console.log(result);
```

### 使用特定分析器

```javascript
import { SquatAnalyzer, EXERCISE_TYPES } from './analyzers';

// 创建深蹲分析器
const squatAnalyzer = new SquatAnalyzer();

// 检测是否为深蹲动作
const confidence = squatAnalyzer.detectExercise(keypoints);

// 分析深蹲
if (confidence > 0.6) {
    const result = squatAnalyzer.analyze(keypoints);
    console.log(result);
}
```

### 动态创建分析器

```javascript
import { createAnalyzer, EXERCISE_TYPES } from './analyzers';

// 动态创建分析器
const analyzer = createAnalyzer(EXERCISE_TYPES.SQUAT);
const result = analyzer.analyze(keypoints);
```

### 手动设置分析器

```javascript
import ExerciseAnalysisEngine, { EXERCISE_TYPES } from './analyzers';

const engine = new ExerciseAnalysisEngine();

// 手动设置为深蹲分析器
engine.setAnalyzer(EXERCISE_TYPES.SQUAT);

// 分析
const result = engine.analyze(keypoints);
```

## 分析器详细说明

### ExerciseAnalysisEngine (主分析引擎)

**功能**:
- 自动检测运动类型
- 动态切换分析器
- 管理分析历史
- 提供统一的分析接口

**主要方法**:
- `analyze(keypoints, context)`: 分析姿态关键点
- `setAnalyzer(type)`: 手动设置分析器
- `getCurrentAnalyzerInfo()`: 获取当前分析器信息
- `reset()`: 重置引擎状态
- `setConfig(config)`: 设置配置参数

### BaseExerciseAnalyzer (基础分析器)

**功能**:
- 定义分析器通用接口
- 提供常用的计算方法
- 实现通用的验证逻辑

**通用方法**:
- `calculateDistance(point1, point2)`: 计算两点距离
- `calculateAngle(point1, point2, point3)`: 计算角度
- `validateKeypoints(keypoints)`: 验证关键点
- `calculateMovingAverage(values, windowSize)`: 计算移动平均

### 具体分析器

每个具体分析器都继承自 `BaseExerciseAnalyzer`，实现以下方法：

- `detectExercise(keypoints, frameHistory)`: 检测运动类型，返回置信度
- `analyze(keypoints, frameHistory, context)`: 分析运动，返回详细结果
- `reset()`: 重置分析器状态

#### SquatAnalyzer (深蹲分析器)
- 检测膝盖弯曲、髋部下降
- 计算深蹲深度、膝盖角度
- 评估动作质量（深度、对齐、稳定性）

#### PushUpAnalyzer (俯卧撑分析器)
- 检测水平身体姿态、手臂支撑
- 计算肘部角度、身体直线度
- 评估动作质量（深度、姿态、稳定性）

#### PlankAnalyzer (平板支撑分析器)
- 检测平板支撑姿态
- 计算身体角度、稳定性
- 评估动作质量（直线度、稳定性）

#### JumpingJackAnalyzer (开合跳分析器)
- 检测手臂摆动、腿部开合
- 计算跳跃高度、动作幅度
- 评估动作质量（对称性、节奏）

#### LungeAnalyzer (弓步蹲分析器)
- 检测弓步蹲姿态
- 计算腿部角度、平衡性
- 评估动作质量（深度、平衡、姿态）

#### RunningAnalyzer (跑步分析器)
- 检测跑步步态
- 计算步频、步幅、垂直振幅
- 评估跑姿质量（效率、对称性）

#### WalkingAnalyzer (步行分析器)
- 检测步行步态
- 计算步频、步幅、稳定性
- 评估步行质量（自然性、稳定性）

## 配置选项

### 引擎配置

```javascript
engine.setConfig({
    confidenceThreshold: 0.6,    // 置信度阈值
    switchCooldown: 1000,        // 切换冷却时间（毫秒）
    maxHistoryLength: 30         // 最大历史帧数
});
```

## 性能优化

### 内存管理
- 限制帧历史长度，避免内存泄漏
- 及时清理分析历史记录
- 使用对象池复用计算结果

### 计算优化
- 使用移动平均平滑数据
- 缓存重复计算结果
- 延迟计算非关键指标

### 切换优化
- 设置切换冷却时间，避免频繁切换
- 使用置信度阈值过滤噪声
- 渐进式置信度衰减

## 扩展指南

### 添加新的分析器

1. 创建新的分析器文件，继承 `BaseExerciseAnalyzer`
2. 实现必要的方法：`detectExercise`、`analyze`、`reset`
3. 在 `ExerciseAnalysisEngine.js` 中注册新分析器
4. 在 `index.js` 中导出新分析器
5. 更新 `EXERCISE_TYPES` 常量

### 示例：创建新分析器

```javascript
import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

class NewExerciseAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'NewExercise';
        // 初始化特定状态
    }
    
    detectExercise(keypoints, frameHistory = []) {
        // 实现检测逻辑
        return confidence;
    }
    
    analyze(keypoints, frameHistory = [], context = {}) {
        // 实现分析逻辑
        return result;
    }
    
    reset() {
        super.reset();
        // 重置特定状态
    }
}

export default NewExerciseAnalyzer;
```

## 最佳实践

1. **模块化设计**: 每个分析器专注于单一运动类型
2. **接口一致性**: 所有分析器实现相同的接口
3. **错误处理**: 妥善处理异常情况和边界条件
4. **性能监控**: 使用 `tf.profile` 监控 TensorFlow.js 性能
5. **内存管理**: 及时释放不需要的资源
6. **测试覆盖**: 为每个分析器编写单元测试

## 故障排除

### 常见问题

1. **分析器切换频繁**: 调整置信度阈值或增加切换冷却时间
2. **检测精度低**: 检查关键点质量，调整检测算法参数
3. **性能问题**: 减少历史帧数，优化计算逻辑
4. **内存泄漏**: 检查是否正确调用 `reset()` 方法

### 调试技巧

1. 使用 `getStats()` 方法查看引擎状态
2. 检查 `getAnalysisHistory()` 了解分析历史
3. 监控 `getCurrentAnalyzerInfo()` 确认当前分析器
4. 使用浏览器开发者工具监控内存使用

## 版本历史

- **v2.0.0**: 模块化重构，拆分为独立分析器
- **v1.0.0**: 原始单文件版本

---

通过这种模块化设计，我们实现了：
- ✅ **高内聚低耦合**: 每个模块职责明确
- ✅ **易于扩展**: 添加新分析器简单直接
- ✅ **便于维护**: 修改单个分析器不影响其他模块
- ✅ **性能优化**: 按需加载和计算
- ✅ **代码复用**: 通用逻辑抽象到基类
- ✅ **测试友好**: 每个模块可独立测试