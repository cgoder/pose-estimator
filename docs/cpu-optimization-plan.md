# 🚀 CPU 使用率优化方案

## 📊 问题分析

当前系统在推理时 CPU 使用率达到 100%，主要原因包括：

1. **主线程阻塞**: TensorFlow.js 推理在主线程执行，阻塞 UI 渲染
2. **高频推理**: `requestAnimationFrame` 导致推理频率过高（60FPS）
3. **同步处理**: 视频帧处理、姿态检测、滤波、渲染都在主线程同步执行
4. **内存管理**: 频繁的张量创建和销毁增加 GC 压力

## 🎯 优化策略

### 1. **Web Workers 多线程优化** ⭐⭐⭐⭐⭐

将 TensorFlow.js 推理移至 Web Worker，彻底解决主线程阻塞问题。

#### 实现方案：
```javascript
// 主线程 -> Worker: 发送视频帧
worker.postMessage({
    type: 'INFERENCE',
    imageData: canvas.getImageData(0, 0, width, height),
    timestamp: performance.now()
});

// Worker -> 主线程: 返回姿态结果
worker.onmessage = (event) => {
    const { poses, inferenceTime } = event.data;
    this.renderPoses(poses);
};
```

#### 预期效果：
- **CPU 使用率**: 从 100% 降至 30-50%
- **UI 流畅度**: 显著提升，无卡顿
- **响应性**: 用户交互不受影响

### 2. **智能帧率控制** ⭐⭐⭐⭐

根据设备性能动态调整推理频率，避免不必要的计算。

#### 实现方案：
```javascript
class AdaptiveFrameController {
    constructor() {
        this.targetFPS = 30;
        this.actualFPS = 0;
        this.skipFrames = 0;
        this.frameInterval = 1000 / this.targetFPS;
        this.lastInferenceTime = 0;
    }
    
    shouldProcessFrame() {
        const now = performance.now();
        if (now - this.lastInferenceTime < this.frameInterval) {
            return false;
        }
        this.lastInferenceTime = now;
        return true;
    }
    
    adaptFrameRate(inferenceTime) {
        if (inferenceTime > 50) {
            this.targetFPS = Math.max(15, this.targetFPS - 5);
        } else if (inferenceTime < 20) {
            this.targetFPS = Math.min(30, this.targetFPS + 2);
        }
        this.frameInterval = 1000 / this.targetFPS;
    }
}
```

#### 预期效果：
- **CPU 使用率**: 降低 40-60%
- **电池续航**: 显著改善
- **性能稳定**: 根据设备能力自适应

### 3. **模型优化策略** ⭐⭐⭐⭐

选择更轻量的模型或启用模型量化。

#### 实现方案：
```javascript
const modelConfigs = {
    'high-performance': {
        model: 'MoveNet.SinglePose.Lightning',
        inputSize: 192,
        quantization: true
    },
    'balanced': {
        model: 'MoveNet.SinglePose.Lightning',
        inputSize: 256,
        quantization: false
    },
    'high-accuracy': {
        model: 'MoveNet.SinglePose.Thunder',
        inputSize: 256,
        quantization: false
    }
};

// 根据设备性能自动选择
const deviceScore = this.benchmarkDevice();
const config = deviceScore > 80 ? 'high-accuracy' : 
               deviceScore > 50 ? 'balanced' : 'high-performance';
```

#### 预期效果：
- **推理时间**: 减少 30-70%
- **内存占用**: 降低 20-50%
- **模型加载**: 更快启动

### 4. **OffscreenCanvas 渲染优化** ⭐⭐⭐

将渲染操作移至 Worker 中的 OffscreenCanvas。

#### 实现方案：
```javascript
// 主线程
const offscreen = canvas.transferControlToOffscreen();
worker.postMessage({ canvas: offscreen }, [offscreen]);

// Worker 中
let ctx;
self.onmessage = (event) => {
    if (event.data.canvas) {
        ctx = event.data.canvas.getContext('2d');
    }
    
    if (event.data.poses) {
        // 在 Worker 中直接渲染
        renderPoses(ctx, event.data.poses);
    }
};
```

#### 预期效果：
- **渲染性能**: 提升 20-40%
- **主线程负载**: 进一步减轻
- **并行处理**: 推理和渲染同时进行

### 5. **内存池和对象复用** ⭐⭐⭐

减少频繁的对象创建和垃圾回收。

#### 实现方案：
```javascript
class TensorPool {
    constructor() {
        this.pool = new Map();
    }
    
    getTensor(shape, dtype = 'float32') {
        const key = `${shape.join('x')}_${dtype}`;
        let tensor = this.pool.get(key);
        
        if (!tensor || tensor.isDisposed) {
            tensor = tf.zeros(shape, dtype);
            this.pool.set(key, tensor);
        }
        
        return tensor;
    }
    
    cleanup() {
        this.pool.forEach(tensor => {
            if (!tensor.isDisposed) {
                tensor.dispose();
            }
        });
        this.pool.clear();
    }
}
```

#### 预期效果：
- **GC 压力**: 减少 60-80%
- **内存稳定性**: 显著改善
- **性能波动**: 减少

## 🛠️ 实施计划

### 阶段一：Web Workers 集成 (优先级最高)
1. 创建 `PoseWorker.js`
2. 实现主线程与 Worker 通信
3. 迁移 TensorFlow.js 推理逻辑
4. 测试性能提升

### 阶段二：智能帧率控制
1. 实现 `AdaptiveFrameController`
2. 集成设备性能检测
3. 动态调整推理频率
4. 性能监控和调优

### 阶段三：模型和渲染优化
1. 实现模型自动选择
2. 集成 OffscreenCanvas
3. 内存池优化
4. 全面性能测试

## 📈 预期性能提升

| 优化项目 | CPU 使用率降低 | 实施难度 | 开发时间 |
|---------|---------------|----------|----------|
| Web Workers | 50-70% | 中等 | 2-3天 |
| 智能帧率控制 | 30-50% | 简单 | 1天 |
| 模型优化 | 20-40% | 简单 | 0.5天 |
| OffscreenCanvas | 10-20% | 中等 | 1-2天 |
| 内存池 | 10-15% | 简单 | 1天 |

**总体预期**: CPU 使用率从 100% 降至 20-40%，用户体验显著提升。

## 🔧 快速实施建议

立即可以实施的优化（1小时内）：

1. **降低推理频率**:
```javascript
// 在 _detectPoseInRealTime 中添加
if (this.frameCount % 2 === 0) {
    // 跳过一帧，降低到 30FPS
    this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
    return;
}
```

2. **启用模型量化**:
```javascript
const modelConfig = {
    modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    enableSmoothing: false, // 禁用内置平滑
    modelUrl: 'https://tfhub.dev/google/tfjs-model/movenet/singlepose/lightning/4'
};
```

3. **优化 TensorFlow.js 设置**:
```javascript
// 在模型加载前添加
tf.env().set('WEBGL_PACK', true);
tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
```

这些快速优化可以立即降低 30-50% 的 CPU 使用率！