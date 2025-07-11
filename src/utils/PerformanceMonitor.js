/**
 * 性能监控工具类
 * 提供详细的性能指标收集、分析和报告功能
 */

import { PERFORMANCE_CONFIG, DEBUG_CONFIG } from '../config/constants.js';
import { logger } from './Logger.js';

/**
 * 性能指标类型枚举
 */
export const METRIC_TYPES = {
    FRAME_RENDER: 'frame_render',
    FRAME_GET: 'frame_get',
    CANVAS_RESIZE: 'canvas_resize',
    SOURCE_SWITCH: 'source_switch',
    MEMORY_USAGE: 'memory_usage'
};

/**
 * 性能监控器类
 */
export class PerformanceMonitor {
    constructor(name = 'PerformanceMonitor') {
        this.name = name;
        this.metrics = new Map();
        this.timers = new Map();
        this.enabled = DEBUG_CONFIG.ENABLE_PERFORMANCE_LOGGING;
        
        // 初始化各种指标
        this.initializeMetrics();
        
        // 定期报告性能指标
        this.startPeriodicReporting();
    }

    /**
     * 初始化性能指标
     * @private
     */
    initializeMetrics() {
        Object.values(METRIC_TYPES).forEach(type => {
            this.metrics.set(type, {
                count: 0,
                totalTime: 0,
                minTime: Infinity,
                maxTime: 0,
                averageTime: 0,
                samples: [],
                lastUpdate: performance.now()
            });
        });
        
        // FPS 相关指标
        this.fpsMetrics = {
            frameCount: 0,
            lastFpsUpdate: performance.now(),
            currentFps: 0,
            fpsHistory: [],
            targetFps: 60
        };
        
        // 内存使用指标
        this.memoryMetrics = {
            lastCheck: performance.now(),
            samples: [],
            maxSamples: 100
        };
    }

    /**
     * 开始计时
     * @param {string} operation - 操作名称
     * @param {string} type - 指标类型
     * @returns {string} 计时器ID
     */
    startTimer(operation, type = METRIC_TYPES.FRAME_RENDER) {
        if (!this.enabled) return null;
        
        const timerId = `${operation}_${Date.now()}_${Math.random()}`;
        this.timers.set(timerId, {
            operation,
            type,
            startTime: performance.now()
        });
        
        return timerId;
    }

    /**
     * 结束计时并记录指标
     * @param {string} timerId - 计时器ID
     * @param {Object} additionalData - 额外数据
     */
    endTimer(timerId, additionalData = {}) {
        if (!this.enabled || !timerId || !this.timers.has(timerId)) return;
        
        const timer = this.timers.get(timerId);
        const endTime = performance.now();
        const duration = endTime - timer.startTime;
        
        this.recordMetric(timer.type, duration, {
            operation: timer.operation,
            ...additionalData
        });
        
        this.timers.delete(timerId);
        
        // 记录到日志
        logger.performance(timer.operation, duration, additionalData);
    }

    /**
     * 直接记录指标
     * @param {string} type - 指标类型
     * @param {number} duration - 持续时间
     * @param {Object} data - 额外数据
     */
    recordMetric(type, duration, data = {}) {
        if (!this.enabled) return;
        
        const metric = this.metrics.get(type);
        if (!metric) return;
        
        metric.count++;
        metric.totalTime += duration;
        metric.minTime = Math.min(metric.minTime, duration);
        metric.maxTime = Math.max(metric.maxTime, duration);
        metric.averageTime = metric.totalTime / metric.count;
        metric.lastUpdate = performance.now();
        
        // 保存样本数据（最多保存最近100个）
        metric.samples.push({
            duration,
            timestamp: performance.now(),
            data
        });
        
        if (metric.samples.length > 100) {
            metric.samples.shift();
        }
    }

    /**
     * 更新FPS指标
     */
    updateFps() {
        if (!this.enabled) return;
        
        this.fpsMetrics.frameCount++;
        const now = performance.now();
        const elapsed = now - this.fpsMetrics.lastFpsUpdate;
        
        if (elapsed >= PERFORMANCE_CONFIG.METRICS_UPDATE_INTERVAL) {
            this.fpsMetrics.currentFps = (this.fpsMetrics.frameCount * 1000) / elapsed;
            this.fpsMetrics.frameCount = 0;
            this.fpsMetrics.lastFpsUpdate = now;
            
            // 保存FPS历史
            this.fpsMetrics.fpsHistory.push({
                fps: this.fpsMetrics.currentFps,
                timestamp: now
            });
            
            if (this.fpsMetrics.fpsHistory.length > 60) { // 保存最近60秒的数据
                this.fpsMetrics.fpsHistory.shift();
            }
            
            // 记录FPS
            logger.fps(this.fpsMetrics.currentFps, {
                target: this.fpsMetrics.targetFps,
                efficiency: (this.fpsMetrics.currentFps / this.fpsMetrics.targetFps * 100).toFixed(1) + '%'
            });
        }
    }

    /**
     * 检查内存使用情况
     */
    checkMemoryUsage() {
        if (!this.enabled || !performance.memory) return;
        
        const now = performance.now();
        if (now - this.memoryMetrics.lastCheck < 5000) return; // 每5秒检查一次
        
        const memInfo = {
            used: performance.memory.usedJSHeapSize,
            total: performance.memory.totalJSHeapSize,
            limit: performance.memory.jsHeapSizeLimit,
            timestamp: now
        };
        
        this.memoryMetrics.samples.push(memInfo);
        if (this.memoryMetrics.samples.length > this.memoryMetrics.maxSamples) {
            this.memoryMetrics.samples.shift();
        }
        
        this.memoryMetrics.lastCheck = now;
        
        // 如果内存使用率过高，发出警告
        const usagePercent = (memInfo.used / memInfo.limit) * 100;
        if (usagePercent > 80) {
            logger.warn('内存使用率过高', {
                used: this.formatBytes(memInfo.used),
                total: this.formatBytes(memInfo.total),
                limit: this.formatBytes(memInfo.limit),
                percentage: usagePercent.toFixed(1) + '%'
            });
        }
    }

    /**
     * 格式化字节数
     * @param {number} bytes - 字节数
     * @returns {string} 格式化后的字符串
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * 获取性能报告
     * @returns {Object} 性能报告
     */
    getPerformanceReport() {
        const report = {
            timestamp: new Date().toISOString(),
            fps: {
                current: this.fpsMetrics.currentFps,
                average: this.getAverageFps(),
                target: this.fpsMetrics.targetFps,
                efficiency: (this.fpsMetrics.currentFps / this.fpsMetrics.targetFps * 100).toFixed(1) + '%'
            },
            metrics: {},
            memory: this.getMemoryReport()
        };
        
        // 收集各种指标
        this.metrics.forEach((metric, type) => {
            if (metric.count > 0) {
                report.metrics[type] = {
                    count: metric.count,
                    averageTime: metric.averageTime.toFixed(2) + 'ms',
                    minTime: metric.minTime.toFixed(2) + 'ms',
                    maxTime: metric.maxTime.toFixed(2) + 'ms',
                    totalTime: metric.totalTime.toFixed(2) + 'ms'
                };
            }
        });
        
        return report;
    }

    /**
     * 获取平均FPS
     * @returns {number} 平均FPS
     */
    getAverageFps() {
        if (this.fpsMetrics.fpsHistory.length === 0) return 0;
        
        const sum = this.fpsMetrics.fpsHistory.reduce((acc, item) => acc + item.fps, 0);
        return sum / this.fpsMetrics.fpsHistory.length;
    }

    /**
     * 获取内存报告
     * @returns {Object} 内存报告
     */
    getMemoryReport() {
        if (!performance.memory || this.memoryMetrics.samples.length === 0) {
            return { available: false };
        }
        
        const latest = this.memoryMetrics.samples[this.memoryMetrics.samples.length - 1];
        const oldest = this.memoryMetrics.samples[0];
        
        return {
            current: {
                used: this.formatBytes(latest.used),
                total: this.formatBytes(latest.total),
                percentage: ((latest.used / latest.limit) * 100).toFixed(1) + '%'
            },
            trend: {
                change: this.formatBytes(latest.used - oldest.used),
                direction: latest.used > oldest.used ? 'increasing' : 'decreasing'
            }
        };
    }

    /**
     * 开始定期报告
     * @private
     */
    startPeriodicReporting() {
        if (!this.enabled) return;
        
        setInterval(() => {
            this.checkMemoryUsage();
            
            // 每30秒输出一次性能报告
            const report = this.getPerformanceReport();
            logger.debug('性能报告', report);
        }, 30000);
    }

    /**
     * 重置所有指标
     */
    reset() {
        this.initializeMetrics();
        logger.info('性能监控指标已重置');
    }

    /**
     * 启用/禁用性能监控
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        this.enabled = enabled;
        logger.info(`性能监控已${enabled ? '启用' : '禁用'}`);
    }
}

// 默认性能监控器实例
export const performanceMonitor = new PerformanceMonitor('InputSourceManager');

export default PerformanceMonitor;