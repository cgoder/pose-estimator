/**
 * 性能分析器
 * 提供详细的性能监控和分析功能
 */
export class PerformanceProfiler {
    constructor(maxSamples = 10000) {
        this.metrics = [];
        this.activeTimers = new Map();
        this.categories = new Set();
        this.maxSamples = maxSamples;
    }
    /**
     * 开始计时
     */
    startTimer(category, operation, _metadata) {
        const timerId = `${category}:${operation}:${Date.now()}:${Math.random()}`;
        this.activeTimers.set(timerId, performance.now());
        this.categories.add(category);
        return timerId;
    }
    /**
     * 结束计时并记录
     */
    endTimer(timerId, metadata) {
        const startTime = this.activeTimers.get(timerId);
        if (!startTime) {
            console.warn(`Timer ${timerId} not found`);
            return 0;
        }
        const duration = performance.now() - startTime;
        this.activeTimers.delete(timerId);
        const parts = timerId.split(':');
        const category = parts[0];
        const operation = parts[1];
        if (category && operation) {
            this.recordMetric(category, operation, duration, metadata);
        }
        return duration;
    }
    /**
     * 直接记录性能指标
     */
    recordMetric(category, operation, duration, metadata) {
        const metric = {
            timestamp: Date.now(),
            category,
            operation,
            duration,
            metadata: metadata || {}
        };
        this.metrics.push(metric);
        this.categories.add(category);
        // 限制样本数量
        if (this.metrics.length > this.maxSamples) {
            this.metrics.shift();
        }
    }
    /**
     * 装饰器：自动计时方法执行
     */
    measure(category, operation) {
        return function (_target, propertyKey, descriptor) {
            const originalMethod = descriptor.value;
            const opName = operation || propertyKey;
            descriptor.value = async function (...args) {
                const profiler = this.profiler || new PerformanceProfiler();
                const timerId = profiler.startTimer(category, opName);
                try {
                    const result = await originalMethod.apply(this, args);
                    profiler.endTimer(timerId, { success: true });
                    return result;
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : String(error);
                    profiler.endTimer(timerId, { success: false, error: errorMessage });
                    throw error;
                }
            };
            return descriptor;
        };
    }
    /**
     * 生成性能报告
     */
    generateReport(category) {
        const filteredMetrics = category
            ? this.metrics.filter(m => m.category === category)
            : this.metrics;
        if (filteredMetrics.length === 0) {
            return {
                totalSamples: 0,
                averageDuration: 0,
                minDuration: 0,
                maxDuration: 0,
                p50: 0,
                p90: 0,
                p95: 0,
                p99: 0,
                operations: new Map()
            };
        }
        const durations = filteredMetrics.map(m => m.duration).sort((a, b) => a - b);
        const operations = new Map();
        // 按操作分组
        for (const metric of filteredMetrics) {
            const key = `${metric.category}:${metric.operation}`;
            if (!operations.has(key)) {
                operations.set(key, []);
            }
            operations.get(key).push(metric);
        }
        return {
            totalSamples: filteredMetrics.length,
            averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
            minDuration: durations[0] || 0,
            maxDuration: durations[durations.length - 1] || 0,
            p50: this.percentile(durations, 0.5),
            p90: this.percentile(durations, 0.9),
            p95: this.percentile(durations, 0.95),
            p99: this.percentile(durations, 0.99),
            operations
        };
    }
    /**
     * 计算百分位数
     */
    percentile(sortedArray, p) {
        if (sortedArray.length === 0)
            return 0;
        const index = Math.ceil(sortedArray.length * p) - 1;
        return sortedArray[Math.max(0, index)] || 0;
    }
    /**
     * 获取实时性能统计
     */
    getRealTimeStats(windowMs = 60000) {
        const now = Date.now();
        const recentMetrics = this.metrics.filter(m => now - m.timestamp <= windowMs);
        const stats = {};
        for (const category of this.categories) {
            const categoryMetrics = recentMetrics.filter(m => m.category === category);
            if (categoryMetrics.length > 0) {
                const durations = categoryMetrics.map(m => m.duration);
                stats[category] = {
                    count: categoryMetrics.length,
                    avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
                    maxDuration: Math.max(...durations),
                    minDuration: Math.min(...durations),
                    throughput: categoryMetrics.length / (windowMs / 1000) // ops/sec
                };
            }
        }
        return stats;
    }
    /**
     * 检测性能异常
     */
    detectAnomalies(category, thresholds) {
        const anomalies = [];
        const stats = this.getRealTimeStats();
        const categoryStats = stats[category];
        if (!categoryStats)
            return anomalies;
        if (thresholds.maxDuration && categoryStats.maxDuration > thresholds.maxDuration) {
            anomalies.push({
                type: 'high_max_duration',
                message: `${category} 最大执行时间超过阈值`,
                data: { actual: categoryStats.maxDuration, threshold: thresholds.maxDuration }
            });
        }
        if (thresholds.maxAvgDuration && categoryStats.avgDuration > thresholds.maxAvgDuration) {
            anomalies.push({
                type: 'high_avg_duration',
                message: `${category} 平均执行时间超过阈值`,
                data: { actual: categoryStats.avgDuration, threshold: thresholds.maxAvgDuration }
            });
        }
        if (thresholds.minThroughput && categoryStats.throughput < thresholds.minThroughput) {
            anomalies.push({
                type: 'low_throughput',
                message: `${category} 吞吐量低于阈值`,
                data: { actual: categoryStats.throughput, threshold: thresholds.minThroughput }
            });
        }
        return anomalies;
    }
    /**
     * 导出性能数据
     */
    exportData(format = 'json') {
        if (format === 'csv') {
            const headers = ['timestamp', 'category', 'operation', 'duration', 'metadata'];
            const rows = this.metrics.map(m => [
                m.timestamp,
                m.category,
                m.operation,
                m.duration,
                JSON.stringify(m.metadata || {})
            ]);
            return [headers, ...rows].map(row => row.join(',')).join('\n');
        }
        return JSON.stringify(this.metrics, null, 2);
    }
    /**
     * 清除历史数据
     */
    clear() {
        this.metrics.length = 0;
        this.activeTimers.clear();
        this.categories.clear();
    }
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if ('memory' in performance) {
            const memory = performance.memory;
            return {
                usedJSHeapSize: memory.usedJSHeapSize,
                totalJSHeapSize: memory.totalJSHeapSize,
                jsHeapSizeLimit: memory.jsHeapSizeLimit,
                metricsCount: this.metrics.length,
                activeTimers: this.activeTimers.size
            };
        }
        return {
            metricsCount: this.metrics.length,
            activeTimers: this.activeTimers.size
        };
    }
}
// 全局性能分析器实例
export const globalProfiler = new PerformanceProfiler();
//# sourceMappingURL=PerformanceProfiler.js.map