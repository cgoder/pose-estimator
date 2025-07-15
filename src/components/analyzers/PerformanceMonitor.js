/**
 * 实时性能监控模块
 * 监控分析引擎的性能指标，包括FPS、延迟、内存使用等
 */

class PerformanceMonitor {
    constructor() {
        this.name = 'PerformanceMonitor';
        
        // 性能指标
        this.metrics = {
            fps: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                history: []
            },
            latency: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                history: []
            },
            memory: {
                used: 0,
                peak: 0,
                history: []
            },
            analysis: {
                totalTime: 0,
                averageTime: 0,
                count: 0,
                history: []
            },
            inference: {
                totalTime: 0,
                averageTime: 0,
                count: 0,
                history: []
            },
            rendering: {
                totalTime: 0,
                averageTime: 0,
                count: 0,
                history: []
            }
        };
        
        // 配置
        this.config = {
            historyLength: 100,
            updateInterval: 1000, // 1秒更新一次统计
            enableMemoryMonitoring: true,
            enableDetailedProfiling: true,
            warningThresholds: {
                lowFps: 15,
                highLatency: 100, // 毫秒
                highMemoryUsage: 500 * 1024 * 1024 // 500MB
            }
        };
        
        // 时间戳记录
        this.timestamps = {
            lastFrame: 0,
            lastUpdate: 0,
            analysisStart: 0,
            inferenceStart: 0,
            renderingStart: 0
        };
        
        // 性能警告
        this.warnings = [];
        this.maxWarnings = 50;
        
        // 自动更新定时器
        this.updateTimer = null;
        this.isMonitoring = false;
        
        // 性能分析器
        this.profiler = {
            sessions: new Map(),
            activeSession: null
        };
        
        this.startMonitoring();
    }

    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.isMonitoring) return;
        
        this.isMonitoring = true;
        this.timestamps.lastUpdate = performance.now();
        
        // 定期更新统计信息
        this.updateTimer = setInterval(() => {
            this.updateStatistics();
        }, this.config.updateInterval);
        
        console.log('性能监控已启动');
    }

    /**
     * 停止监控
     */
    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        console.log('性能监控已停止');
    }

    /**
     * 记录帧开始
     */
    frameStart() {
        const now = performance.now();
        
        // 计算FPS
        if (this.timestamps.lastFrame > 0) {
            const frameDuration = now - this.timestamps.lastFrame;
            const fps = 1000 / frameDuration;
            this.updateFPS(fps);
        }
        
        this.timestamps.lastFrame = now;
    }

    /**
     * 记录分析开始
     */
    analysisStart() {
        this.timestamps.analysisStart = performance.now();
    }

    /**
     * 记录分析结束
     */
    analysisEnd() {
        if (this.timestamps.analysisStart > 0) {
            const duration = performance.now() - this.timestamps.analysisStart;
            this.updateAnalysisTime(duration);
            this.timestamps.analysisStart = 0;
        }
    }

    /**
     * 记录推理开始
     */
    inferenceStart() {
        this.timestamps.inferenceStart = performance.now();
    }

    /**
     * 记录推理结束
     */
    inferenceEnd() {
        if (this.timestamps.inferenceStart > 0) {
            const duration = performance.now() - this.timestamps.inferenceStart;
            this.updateInferenceTime(duration);
            this.timestamps.inferenceStart = 0;
        }
    }

    /**
     * 记录渲染开始
     */
    renderingStart() {
        this.timestamps.renderingStart = performance.now();
    }

    /**
     * 记录渲染结束
     */
    renderingEnd() {
        if (this.timestamps.renderingStart > 0) {
            const duration = performance.now() - this.timestamps.renderingStart;
            this.updateRenderingTime(duration);
            this.timestamps.renderingStart = 0;
        }
    }

    /**
     * 开始性能分析会话
     */
    startProfiling(sessionName) {
        if (!this.config.enableDetailedProfiling) return null;
        
        const sessionId = `${sessionName}_${Date.now()}`;
        const session = {
            id: sessionId,
            name: sessionName,
            startTime: performance.now(),
            endTime: null,
            duration: null,
            markers: [],
            memoryStart: this.getMemoryUsage()
        };
        
        this.profiler.sessions.set(sessionId, session);
        this.profiler.activeSession = sessionId;
        
        return sessionId;
    }

    /**
     * 添加性能标记
     */
    addMarker(name, data = {}) {
        if (!this.profiler.activeSession) return;
        
        const session = this.profiler.sessions.get(this.profiler.activeSession);
        if (session) {
            session.markers.push({
                name,
                timestamp: performance.now(),
                relativeTime: performance.now() - session.startTime,
                data
            });
        }
    }

    /**
     * 结束性能分析会话
     */
    endProfiling(sessionId = null) {
        const targetSessionId = sessionId || this.profiler.activeSession;
        if (!targetSessionId) return null;
        
        const session = this.profiler.sessions.get(targetSessionId);
        if (session) {
            session.endTime = performance.now();
            session.duration = session.endTime - session.startTime;
            session.memoryEnd = this.getMemoryUsage();
            session.memoryDelta = session.memoryEnd - session.memoryStart;
            
            if (this.profiler.activeSession === targetSessionId) {
                this.profiler.activeSession = null;
            }
            
            return session;
        }
        
        return null;
    }

    /**
     * 更新FPS
     */
    updateFPS(fps) {
        const metric = this.metrics.fps;
        
        metric.current = fps;
        metric.min = Math.min(metric.min, fps);
        metric.max = Math.max(metric.max, fps);
        
        metric.history.push({
            value: fps,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
        
        // 检查FPS警告
        if (fps < this.config.warningThresholds.lowFps) {
            this.addWarning('low_fps', `FPS过低: ${fps.toFixed(1)}`);
        }
    }

    /**
     * 更新分析时间
     */
    updateAnalysisTime(duration) {
        const metric = this.metrics.analysis;
        
        metric.totalTime += duration;
        metric.count++;
        metric.averageTime = metric.totalTime / metric.count;
        
        metric.history.push({
            value: duration,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
        
        // 更新延迟
        this.updateLatency(duration);
    }

    /**
     * 更新推理时间
     */
    updateInferenceTime(duration) {
        const metric = this.metrics.inference;
        
        metric.totalTime += duration;
        metric.count++;
        metric.averageTime = metric.totalTime / metric.count;
        
        metric.history.push({
            value: duration,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
    }

    /**
     * 更新渲染时间
     */
    updateRenderingTime(duration) {
        const metric = this.metrics.rendering;
        
        metric.totalTime += duration;
        metric.count++;
        metric.averageTime = metric.totalTime / metric.count;
        
        metric.history.push({
            value: duration,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
    }

    /**
     * 更新延迟
     */
    updateLatency(latency) {
        const metric = this.metrics.latency;
        
        metric.current = latency;
        metric.min = Math.min(metric.min, latency);
        metric.max = Math.max(metric.max, latency);
        
        metric.history.push({
            value: latency,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
        
        // 检查延迟警告
        if (latency > this.config.warningThresholds.highLatency) {
            this.addWarning('high_latency', `延迟过高: ${latency.toFixed(1)}ms`);
        }
    }

    /**
     * 更新统计信息
     */
    updateStatistics() {
        // 更新内存使用
        if (this.config.enableMemoryMonitoring) {
            this.updateMemoryUsage();
        }
        
        // 计算平均值
        this.calculateAverages();
        
        // 清理过期数据
        this.cleanupOldData();
    }

    /**
     * 更新内存使用
     */
    updateMemoryUsage() {
        const memoryUsage = this.getMemoryUsage();
        const metric = this.metrics.memory;
        
        metric.used = memoryUsage;
        metric.peak = Math.max(metric.peak, memoryUsage);
        
        metric.history.push({
            value: memoryUsage,
            timestamp: performance.now()
        });
        
        this.trimHistory(metric.history);
        
        // 检查内存警告
        if (memoryUsage > this.config.warningThresholds.highMemoryUsage) {
            this.addWarning('high_memory', `内存使用过高: ${(memoryUsage / 1024 / 1024).toFixed(1)}MB`);
        }
    }

    /**
     * 获取内存使用量
     */
    getMemoryUsage() {
        if (performance.memory) {
            return performance.memory.usedJSHeapSize;
        }
        return 0;
    }

    /**
     * 计算平均值
     */
    calculateAverages() {
        // FPS平均值
        if (this.metrics.fps.history.length > 0) {
            const recentFps = this.metrics.fps.history.slice(-30); // 最近30帧
            this.metrics.fps.average = recentFps.reduce((sum, item) => sum + item.value, 0) / recentFps.length;
        }
        
        // 延迟平均值
        if (this.metrics.latency.history.length > 0) {
            const recentLatency = this.metrics.latency.history.slice(-30);
            this.metrics.latency.average = recentLatency.reduce((sum, item) => sum + item.value, 0) / recentLatency.length;
        }
    }

    /**
     * 修剪历史数据
     */
    trimHistory(history) {
        if (history.length > this.config.historyLength) {
            history.splice(0, history.length - this.config.historyLength);
        }
    }

    /**
     * 清理过期数据
     */
    cleanupOldData() {
        const now = performance.now();
        const maxAge = 60000; // 1分钟
        
        // 清理性能分析会话
        for (const [sessionId, session] of this.profiler.sessions) {
            if (session.endTime && (now - session.endTime) > maxAge) {
                this.profiler.sessions.delete(sessionId);
            }
        }
        
        // 清理警告
        this.warnings = this.warnings.filter(warning => 
            (now - warning.timestamp) < maxAge
        );
    }

    /**
     * 添加警告
     */
    addWarning(type, message) {
        const warning = {
            type,
            message,
            timestamp: performance.now(),
            count: 1
        };
        
        // 检查是否已存在相同类型的警告
        const existingWarning = this.warnings.find(w => w.type === type);
        if (existingWarning) {
            existingWarning.count++;
            existingWarning.timestamp = warning.timestamp;
            return;
        }
        
        this.warnings.push(warning);
        
        // 限制警告数量
        if (this.warnings.length > this.maxWarnings) {
            this.warnings.shift();
        }
        
        console.warn(`性能警告 [${type}]: ${message}`);
    }

    /**
     * 获取性能报告
     */
    getPerformanceReport() {
        return {
            timestamp: Date.now(),
            metrics: {
                fps: {
                    current: this.metrics.fps.current,
                    average: this.metrics.fps.average,
                    min: this.metrics.fps.min === Infinity ? 0 : this.metrics.fps.min,
                    max: this.metrics.fps.max
                },
                latency: {
                    current: this.metrics.latency.current,
                    average: this.metrics.latency.average,
                    min: this.metrics.latency.min === Infinity ? 0 : this.metrics.latency.min,
                    max: this.metrics.latency.max
                },
                memory: {
                    used: this.metrics.memory.used,
                    peak: this.metrics.memory.peak,
                    usedMB: (this.metrics.memory.used / 1024 / 1024).toFixed(1),
                    peakMB: (this.metrics.memory.peak / 1024 / 1024).toFixed(1)
                },
                analysis: {
                    averageTime: this.metrics.analysis.averageTime,
                    totalCount: this.metrics.analysis.count
                },
                inference: {
                    averageTime: this.metrics.inference.averageTime,
                    totalCount: this.metrics.inference.count
                },
                rendering: {
                    averageTime: this.metrics.rendering.averageTime,
                    totalCount: this.metrics.rendering.count
                }
            },
            warnings: this.warnings.slice(-10), // 最近10个警告
            isMonitoring: this.isMonitoring,
            config: this.config
        };
    }

    /**
     * 获取详细的性能数据
     */
    getDetailedMetrics() {
        return {
            fps: this.metrics.fps.history.slice(-50),
            latency: this.metrics.latency.history.slice(-50),
            memory: this.metrics.memory.history.slice(-50),
            analysis: this.metrics.analysis.history.slice(-50),
            inference: this.metrics.inference.history.slice(-50),
            rendering: this.metrics.rendering.history.slice(-50)
        };
    }

    /**
     * 获取性能分析会话
     */
    getProfilingSessions(limit = 10) {
        const sessions = Array.from(this.profiler.sessions.values())
            .sort((a, b) => b.startTime - a.startTime)
            .slice(0, limit);
        
        return sessions;
    }

    /**
     * 重置所有指标
     */
    reset() {
        // 重置指标
        Object.keys(this.metrics).forEach(key => {
            const metric = this.metrics[key];
            if (metric.history) {
                metric.history = [];
            }
            if (metric.current !== undefined) {
                metric.current = 0;
            }
            if (metric.average !== undefined) {
                metric.average = 0;
            }
            if (metric.min !== undefined) {
                metric.min = Infinity;
            }
            if (metric.max !== undefined) {
                metric.max = 0;
            }
            if (metric.totalTime !== undefined) {
                metric.totalTime = 0;
            }
            if (metric.count !== undefined) {
                metric.count = 0;
            }
        });
        
        // 重置时间戳
        Object.keys(this.timestamps).forEach(key => {
            this.timestamps[key] = 0;
        });
        
        // 清理警告和会话
        this.warnings = [];
        this.profiler.sessions.clear();
        this.profiler.activeSession = null;
        
        console.log('性能监控指标已重置');
    }

    /**
     * 设置配置
     */
    setConfig(newConfig) {
        this.config = { ...this.config, ...newConfig };
        
        // 如果监控状态改变，重新启动
        if (this.isMonitoring) {
            this.stopMonitoring();
            this.startMonitoring();
        }
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            isMonitoring: this.isMonitoring,
            totalWarnings: this.warnings.length,
            activeSessions: this.profiler.sessions.size,
            metricsCount: {
                fps: this.metrics.fps.history.length,
                latency: this.metrics.latency.history.length,
                memory: this.metrics.memory.history.length,
                analysis: this.metrics.analysis.history.length,
                inference: this.metrics.inference.history.length,
                rendering: this.metrics.rendering.history.length
            }
        };
    }

    /**
     * 销毁监控器
     */
    destroy() {
        this.stopMonitoring();
        this.reset();
        console.log('性能监控器已销毁');
    }
}

export default PerformanceMonitor;