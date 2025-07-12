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
export declare class PerformanceMonitor {
    private frameCount;
    private lastFrameTime;
    private fpsHistory;
    private inferenceTimeHistory;
    private frameDrops;
    private startTime;
    private readonly maxHistorySize;
    constructor();
    /**
     * 开始性能测量
     */
    startFrame(): number;
    /**
     * 结束帧测量并更新指标
     */
    endFrame(startTime: number, inferenceTime: number): PerformanceMetrics;
    /**
     * 获取详细的性能指标
     */
    getDetailedMetrics(): DetailedMetrics;
    /**
     * 重置性能指标
     */
    reset(): void;
    /**
     * 获取内存使用情况
     */
    private getMemoryUsage;
    /**
     * 获取GPU内存使用情况 (如果可用)
     */
    private getGPUMemoryUsage;
    /**
     * 生成性能报告
     */
    generateReport(): string;
}
export declare const performanceMonitor: PerformanceMonitor;
//# sourceMappingURL=PerformanceMonitor.d.ts.map