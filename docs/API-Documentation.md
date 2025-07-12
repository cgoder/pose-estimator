# API 文档

## 📋 目录
- [核心模块](#核心模块)
- [组件模块](#组件模块)
- [工具类](#工具类)
- [类型定义](#类型定义)

## 🔧 核心模块

### EventBus
事件总线，提供发布-订阅模式的事件通信机制。

#### 基本用法
```typescript
import { eventBus } from './src/core/EventBus';

// 订阅事件
const unsubscribe = eventBus.on('pose:detected', (pose) => {
  console.log('检测到姿态:', pose);
});

// 发布事件
eventBus.emit('pose:detected', poseData);

// 取消订阅
unsubscribe();
```

#### API 方法
```typescript
interface EventBus {
  // 订阅事件
  on<T>(event: string, callback: (data: T) => void): () => void;
  
  // 订阅一次性事件
  once<T>(event: string, callback: (data: T) => void): () => void;
  
  // 发布事件
  emit<T>(event: string, data?: T): void;
  
  // 取消所有订阅
  off(event: string): void;
  
  // 获取事件列表
  getEvents(): string[];
}
```

#### 内置事件
```typescript
// 姿态检测事件
'pose:detected'     // 检测到新姿态
'pose:lost'         // 姿态丢失
'pose:updated'      // 姿态更新

// 状态变更事件
'state:changed'     // 状态改变
'state:reset'       // 状态重置

// 性能事件
'performance:fps'   // FPS 更新
'performance:memory' // 内存使用更新
```

### StateManager
集中式状态管理器，管理应用的全局状态。

#### 基本用法
```typescript
import { stateManager } from './src/core/StateManager';

// 获取当前状态
const state = stateManager.getState();

// 更新状态
stateManager.setState({
  dataSource: {
    type: 'camera',
    status: 'active'
  }
});

// 订阅状态变更
const unsubscribe = stateManager.subscribe((newState, prevState) => {
  console.log('状态已更新:', newState);
});
```

#### 状态结构
```typescript
interface AppState {
  dataSource: {
    type: 'camera' | 'video' | 'image' | null;
    status: DataSourceStatus;
    config: any;
  };
  model: {
    type: 'posenet' | 'movenet' | 'blazepose' | null;
    isLoaded: boolean;
    loadingProgress: number;
    config: any;
  };
  analysis: {
    isRunning: boolean;
    currentPose: Pose | null;
    repetitionCount: number;
    currentExercise: string | null;
    quality: {
      score: number;
      feedback: string[];
    };
  };
  render: {
    showKeypoints: boolean;
    showSkeleton: boolean;
    showBoundingBox: boolean;
  };
  performance: {
    frameRate: number;
    inferenceTime: number;
    totalTime: number;
    memoryUsage: number;
  };
  ui: {
    showControls: boolean;
    showStats: boolean;
    showPerformance: boolean;
    isLoading: boolean;
    error: Error | null;
  };
}
```

## 🧩 组件模块

### PoseEstimator
姿态估计器，负责加载模型和执行姿态检测。

#### 基本用法
```typescript
import { PoseEstimator } from './src/components/PoseEstimator';

const estimator = new PoseEstimator({
  modelType: 'movenet',
  inputResolution: { width: 640, height: 480 },
  outputStride: 16
});

// 初始化模型
await estimator.initialize();

// 估计姿态
const poses = await estimator.estimatePoses(imageElement);
```

#### 配置选项
```typescript
interface PoseEstimatorConfig {
  modelType: 'posenet' | 'movenet' | 'blazepose';
  inputResolution: { width: number; height: number };
  outputStride?: number;
  multiplier?: number;
  quantBytes?: number;
  maxDetections?: number;
  scoreThreshold?: number;
  nmsRadius?: number;
}
```

### OneEuroFilterManager
OneEuroFilter 管理器，用于平滑姿态关键点数据。

#### 基本用法
```typescript
import { OneEuroFilterManager } from './src/components/OneEuroFilterManager';

const filterManager = new OneEuroFilterManager({
  frequency: 30,
  minCutoff: 1.0,
  beta: 0.5,
  dCutoff: 1.0
});

// 过滤姿态数据
const filteredPoses = filterManager.filter(poses, timestamp);

// 重置滤波器
filterManager.reset();
```

#### 预设配置
```typescript
// 获取推荐参数
const config = OneEuroFilterManager.getRecommendedParameters('balanced');

// 可用预设
'smooth'    // 平滑优先
'balanced'  // 平衡设置
'responsive' // 响应优先
'precise'   // 精确优先
```

## 🛠️ 工具类

### OneEuroFilter
One Euro Filter 实现，用于平滑时间序列数据。

#### 基本用法
```typescript
import { OneEuroFilter } from './src/utils/OneEuroFilter';

const filter = new OneEuroFilter(
  30,   // frequency
  1.0,  // minCutoff
  0.5,  // beta
  1.0   // dCutoff
);

// 过滤数据
const filtered = filter.filter(value, timestamp);
```

#### 参数说明
```typescript
interface FilterConfig {
  frequency: number;    // 采样频率 (Hz)
  minCutoff: number;    // 最小截止频率
  beta: number;         // 速度系数
  dCutoff: number;      // 导数截止频率
}
```

### PerformanceMonitor
性能监控器，用于监控应用性能指标。

#### 基本用法
```typescript
import { PerformanceMonitor } from './src/utils/PerformanceMonitor';

const monitor = new PerformanceMonitor();

// 开始监控
monitor.start();

// 记录帧
monitor.recordFrame();

// 获取统计信息
const stats = monitor.getStats();
console.log(`FPS: ${stats.fps}, 内存: ${stats.memoryUsage}MB`);
```

#### 监控指标
```typescript
interface PerformanceStats {
  fps: number;              // 帧率
  averageFrameTime: number; // 平均帧时间
  memoryUsage: number;      // 内存使用量 (MB)
  inferenceTime: number;    // 推理时间 (ms)
  totalTime: number;        // 总处理时间 (ms)
}
```

### Logger
日志工具，提供分级日志记录功能。

#### 基本用法
```typescript
import { Logger } from './src/utils/Logger';

// 设置日志级别
Logger.setLevel('debug');

// 记录日志
Logger.debug('调试信息');
Logger.info('普通信息');
Logger.warn('警告信息');
Logger.error('错误信息');
```

#### 日志级别
```typescript
type LogLevel = 'debug' | 'info' | 'warn' | 'error';
```

## 📝 类型定义

### 姿态相关类型
```typescript
// 关键点
interface Keypoint {
  x: number;
  y: number;
  score?: number;
  name?: string;
}

// 姿态
interface Pose {
  keypoints: Keypoint[];
  score?: number;
  box?: BoundingBox;
}

// 边界框
interface BoundingBox {
  xMin: number;
  yMin: number;
  xMax: number;
  yMax: number;
  width: number;
  height: number;
}
```

### 数据源类型
```typescript
type DataSourceType = 'camera' | 'video' | 'image' | 'stream';
type DataSourceStatus = 'idle' | 'loading' | 'active' | 'error' | 'stopped';

interface DataSourceConfig {
  type: DataSourceType;
  deviceId?: string;
  constraints?: MediaStreamConstraints;
  videoElement?: HTMLVideoElement;
  imageElement?: HTMLImageElement;
}
```

### 模型类型
```typescript
type ModelType = 'posenet' | 'movenet' | 'blazepose';

interface ModelConfig {
  type: ModelType;
  architecture?: string;
  inputResolution?: { width: number; height: number };
  outputStride?: number;
  multiplier?: number;
  quantBytes?: number;
}
```

### 分析类型
```typescript
interface AnalysisResult {
  exerciseType: string;
  repetitionCount: number;
  quality: QualityScore;
  feedback: string[];
  metrics: ExerciseMetrics;
}

interface QualityScore {
  overall: number;
  form: number;
  range: number;
  timing: number;
}

interface ExerciseMetrics {
  duration: number;
  averageSpeed: number;
  peakAngle: number;
  symmetry: number;
}
```

## 🔗 使用示例

### 完整的姿态检测流程
```typescript
import { PoseEstimator } from './src/components/PoseEstimator';
import { OneEuroFilterManager } from './src/components/OneEuroFilterManager';
import { PerformanceMonitor } from './src/utils/PerformanceMonitor';
import { eventBus } from './src/core/EventBus';

async function setupPoseDetection() {
  // 初始化组件
  const estimator = new PoseEstimator({
    modelType: 'movenet',
    inputResolution: { width: 640, height: 480 }
  });
  
  const filterManager = new OneEuroFilterManager({
    frequency: 30,
    minCutoff: 1.0,
    beta: 0.5,
    dCutoff: 1.0
  });
  
  const monitor = new PerformanceMonitor();
  
  // 加载模型
  await estimator.initialize();
  
  // 开始监控
  monitor.start();
  
  // 处理视频帧
  function processFrame(video: HTMLVideoElement) {
    const timestamp = performance.now();
    
    // 姿态估计
    estimator.estimatePoses(video).then(poses => {
      // 应用滤波
      const filteredPoses = filterManager.filter(poses, timestamp);
      
      // 发布事件
      eventBus.emit('pose:detected', filteredPoses);
      
      // 记录性能
      monitor.recordFrame();
      
      // 继续下一帧
      requestAnimationFrame(() => processFrame(video));
    });
  }
  
  return { estimator, filterManager, monitor, processFrame };
}
```

---

**最后更新**: 2024年12月
**版本**: 1.0.0