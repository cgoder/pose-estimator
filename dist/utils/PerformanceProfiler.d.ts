/**
 * 性能分析器
 * 提供详细的性能监控和分析功能
 */
export interface PerformanceMetrics {
    timestamp: number;
    category: string;
    operation: string;
    duration: number;
    metadata?: Record<string, any>;
}
export interface PerformanceReport {
    totalSamples: number;
    averageDuration: number;
    minDuration: number;
    maxDuration: number;
    p50: number;
    p90: number;
    p95: number;
    p99: number;
    operations: Map<string, PerformanceMetrics[]>;
}
export declare class PerformanceProfiler {
    private metrics;
    private activeTimers;
    private maxSamples;
    private categories;
    constructor(maxSamples?: number);
    /**
     * 开始计时
     */
    startTimer(category: string, operation: string, _metadata?: Record<string, any>): string;
    /**
     * 结束计时并记录
     */
    endTimer(timerId: string, metadata?: Record<string, any>): number;
    /**
     * 直接记录性能指标
     */
    recordMetric(category: string, operation: string, duration: number, metadata?: Record<string, any>): void;
    /**
     * 装饰器：自动计时方法执行
     */
    measure(category: string, operation?: string): (_target: any, propertyKey: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
    /**
     * 生成性能报告
     */
    generateReport(category?: string): PerformanceReport;
    /**
     * 计算百分位数
     */
    private percentile;
    /**
     * 获取实时性能统计
     */
    getRealTimeStats(windowMs?: number): Record<string, any>;
    /**
     * 检测性能异常
     */
    detectAnomalies(category: string, thresholds: {
        maxDuration?: number;
        maxAvgDuration?: number;
        minThroughput?: number;
    }): Array<{
        type: string;
        message: string;
        data: any;
    }>;
    /**
     * 导出性能数据
     */
    exportData(format?: 'json' | 'csv'): string;
    /**
     * 清除历史数据
     */
    clear(): void;
    /**
     * 获取内存使用情况
     */
    getMemoryUsage(): Record<string, number>;
}
export declare const globalProfiler: PerformanceProfiler;
//# sourceMappingURL=PerformanceProfiler.d.ts.map