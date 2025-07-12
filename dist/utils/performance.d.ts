declare global {
    interface Window {
        tf?: any;
        gc?: () => void;
    }
    interface Performance {
        memory?: {
            usedJSHeapSize: number;
            totalJSHeapSize: number;
            jsHeapSizeLimit: number;
        };
    }
}
interface PerformanceMetrics {
    frameRate: number;
    averageFrameTime: number;
    inferenceTime: number;
    memoryUsage: number | MemoryUsage;
    cacheHitRate: number | string;
    totalFrames: number;
    droppedFrames: number;
    tensorflowMemory?: TensorFlowMemory;
}
interface MemoryUsage {
    used: number;
    total: number;
    limit: number;
}
interface TensorFlowMemory {
    numTensors: number;
    numDataBuffers: number;
    numBytes: number;
}
export interface PerformanceReport extends PerformanceMetrics {
    frameDropRate: string;
    timestamp: string;
}
interface OptimizationSuggestion {
    type: 'info' | 'warning' | 'error';
    message: string;
}
/**
 * 性能监控工具类
 */
export declare class PerformanceMonitor {
    private metrics;
    private frameBuffer;
    private lastFrameTime;
    private fpsUpdateTime;
    private isMonitoring;
    constructor();
    /**
     * 开始性能监控
     */
    start(): void;
    /**
     * 停止性能监控
     */
    stop(): void;
    /**
     * 记录帧开始时间
     * @returns {number} 帧开始时间戳
     */
    frameStart(): number;
    /**
     * 记录帧结束时间并计算推理时间
     * @param {number} startTime - 帧开始时间戳
     */
    frameEnd(startTime: number): void;
    /**
     * 更新FPS计算
     */
    updateFPS(): void;
    /**
     * 更新内存使用情况
     */
    updateMemoryUsage(): void;
    /**
     * 更新缓存命中率
     * @param {number} hits - 缓存命中次数
     * @param {number} total - 总请求次数
     */
    updateCacheHitRate(hits: number, total: number): void;
    /**
     * 获取性能报告
     * @returns {Object} 性能指标对象
     */
    getReport(): PerformanceReport;
    /**
     * 重置性能指标
     */
    reset(): void;
    /**
     * 输出性能日志
     */
    logPerformance(): void;
}
/**
 * 性能优化建议工具
 */
export declare class PerformanceOptimizer {
    /**
     * 分析性能并提供优化建议
     * @param {Object} metrics - 性能指标
     * @returns {Array} 优化建议列表
     */
    static analyzeAndSuggest(metrics: PerformanceReport): OptimizationSuggestion[];
    /**
     * 自动优化TensorFlow.js性能
     */
    static optimizeTensorFlow(): Promise<void>;
    /**
     * 清理TensorFlow.js内存
     */
    static cleanupTensorFlowMemory(): void;
}
/**
 * 性能监控单例实例
 */
export declare const performanceMonitor: PerformanceMonitor;
export {};
//# sourceMappingURL=performance.d.ts.map