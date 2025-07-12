/**
 * 性能监控工具
 * 提供详细的性能指标收集和分析
 */

export interface PerformanceMetrics {
  fps: number;
  inferenceTime: number;
  totalTime: number;
  memoryUsage?: number | undefined;
  gpuMemoryUsage?: number | undefined;
}

export interface DetailedMetrics {
  fps: number;
  inferenceTime: number;
  totalTime: number;
  memoryUsage?: number | undefined;
  gpuMemoryUsage?: number | undefined;
  frameCount: number;
  averageFps: number;
  minFps: number;
  maxFps: number;
  frameDrops: number;
  timestamp: number;
}

export class PerformanceMonitor {
  private frameCount = 0;
  private lastFrameTime = 0;
  private fpsHistory: number[] = [];
  private inferenceTimeHistory: number[] = [];
  private frameDrops = 0;
  private startTime = 0;
  private readonly maxHistorySize = 60; // 保留60帧的历史数据

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * 开始性能测量
   */
  startFrame(): number {
    return performance.now();
  }

  /**
   * 结束帧测量并更新指标
   */
  endFrame(startTime: number, inferenceTime: number): PerformanceMetrics {
    const currentTime = performance.now();
    const totalTime = currentTime - startTime;
    
    // 计算FPS
    const deltaTime = currentTime - this.lastFrameTime;
    const fps = deltaTime > 0 ? 1000 / deltaTime : 0;
    
    // 检测帧丢失 (FPS < 20)
    if (fps < 20 && this.frameCount > 0) {
      this.frameDrops++;
    }
    
    // 更新历史数据
    this.fpsHistory.push(fps);
    this.inferenceTimeHistory.push(inferenceTime);
    
    // 限制历史数据大小
    if (this.fpsHistory.length > this.maxHistorySize) {
      this.fpsHistory.shift();
      this.inferenceTimeHistory.shift();
    }
    
    this.frameCount++;
    this.lastFrameTime = currentTime;
    
    return {
      fps: Math.round(fps),
      inferenceTime: Math.round(inferenceTime * 100) / 100,
      totalTime: Math.round(totalTime * 100) / 100,
      memoryUsage: this.getMemoryUsage(),
      gpuMemoryUsage: this.getGPUMemoryUsage()
    };
  }

  /**
   * 获取详细的性能指标
   */
  getDetailedMetrics(): DetailedMetrics {
    const avgFps = this.fpsHistory.length > 0 
      ? this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length 
      : 0;
    
    const minFps = this.fpsHistory.length > 0 ? Math.min(...this.fpsHistory) : 0;
    const maxFps = this.fpsHistory.length > 0 ? Math.max(...this.fpsHistory) : 0;
    
    const avgInferenceTime = this.inferenceTimeHistory.length > 0
      ? this.inferenceTimeHistory.reduce((a, b) => a + b, 0) / this.inferenceTimeHistory.length
      : 0;

    return {
      fps: this.fpsHistory.length > 0 ? Math.round(this.fpsHistory[this.fpsHistory.length - 1] || 0) : 0,
      inferenceTime: Math.round(avgInferenceTime * 100) / 100,
      totalTime: performance.now() - this.startTime,
      memoryUsage: this.getMemoryUsage(),
      gpuMemoryUsage: this.getGPUMemoryUsage(),
      frameCount: this.frameCount,
      averageFps: Math.round(avgFps),
      minFps: Math.round(minFps),
      maxFps: Math.round(maxFps),
      frameDrops: this.frameDrops,
      timestamp: Date.now()
    };
  }

  /**
   * 重置性能指标
   */
  reset(): void {
    this.frameCount = 0;
    this.lastFrameTime = 0;
    this.fpsHistory = [];
    this.inferenceTimeHistory = [];
    this.frameDrops = 0;
    this.startTime = performance.now();
  }

  /**
   * 获取内存使用情况
   */
  private getMemoryUsage(): number | undefined {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / 1024 / 1024 * 100) / 100; // MB
    }
    return undefined;
  }

  /**
   * 获取GPU内存使用情况 (如果可用)
   */
  private getGPUMemoryUsage(): number | undefined {
    // 这里可以集成WebGL内存监控
    // 目前返回undefined，后续可以扩展
    return undefined;
  }

  /**
   * 生成性能报告
   */
  generateReport(): string {
    const metrics = this.getDetailedMetrics();
    const runTime = (metrics.totalTime / 1000).toFixed(1);
    
    return `
性能报告:
========
运行时间: ${runTime}s
总帧数: ${metrics.frameCount}
平均FPS: ${metrics.averageFps}
最小FPS: ${metrics.minFps}
最大FPS: ${metrics.maxFps}
帧丢失: ${metrics.frameDrops}
平均推理时间: ${metrics.inferenceTime}ms
内存使用: ${metrics.memoryUsage || 'N/A'}MB
    `.trim();
  }
}

// 全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();