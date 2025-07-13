# TensorFlow.js 内存管理最佳实践

## 🎯 核心原则

### 1. 张量生命周期管理
```typescript
// ✅ 推荐：使用 tf.tidy() 自动清理
const result = tf.tidy(() => {
  const prediction = model.predict(inputTensor);
  return prediction.dataSync();
});

// ✅ 推荐：手动释放大型张量
const largeTensor = tf.zeros([1000, 1000]);
// ... 使用张量
largeTensor.dispose();

// ❌ 避免：忘记清理张量
const tensor = tf.zeros([100, 100]); // 内存泄漏！
```

### 2. 模型内存管理
```typescript
// ✅ 推荐：模型切换时清理旧模型
async switchModel(newModelType: string) {
  if (this.currentModel) {
    this.currentModel.dispose(); // 释放旧模型
  }
  this.currentModel = await this.loadModel(newModelType);
}

// ✅ 推荐：定期检查内存使用
const memInfo = tf.memory();
console.log(`张量数量: ${memInfo.numTensors}, 内存使用: ${memInfo.numBytes} bytes`);
```

### 3. Worker 内存管理
```typescript
// ✅ 推荐：Worker 中的内存清理
self.onmessage = async (event) => {
  const result = tf.tidy(() => {
    // 推理逻辑
    return model.predict(inputTensor);
  });
  
  // 发送结果后立即清理
  self.postMessage(result);
  if (result instanceof tf.Tensor) {
    result.dispose();
  }
};
```

## 🔧 实施建议

### 立即实施
1. 在 `PoseEstimationApp.ts` 中添加内存监控
2. 在 Worker 中实现张量自动清理
3. 添加模型切换时的内存清理

### 中期优化
1. 实现内存使用阈值警告
2. 添加自动垃圾回收触发
3. 优化帧缓冲区管理

### 长期规划
1. 实现智能内存预分配
2. 添加内存使用分析工具
3. 优化模型缓存策略