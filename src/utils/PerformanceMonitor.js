/**
 * 性能监控器模块
 * 负责监控应用的性能指标，包括FPS、内存使用、渲染时间等
 */

import { Logger } from './Logger.js';

export class PerformanceMonitor {
    constructor(options = {}) {
        this.logger = new Logger('PerformanceMonitor');
        
        // 配置选项
        this.config = {
            // 监控间隔
            updateInterval: options.updateInterval || 1000, // 1秒
            
            // 历史数据保留
            maxHistorySize: options.maxHistorySize || 300, // 5分钟的数据
            
            // 性能阈值
            thresholds: {
                fps: {
                    warning: options.fpsWarning || 30,
                    critical: options.fpsCritical || 15
                },
                memory: {
                    warning: options.memoryWarning || 80, // 80%
                    critical: options.memoryCritical || 90 // 90%
                },
                renderTime: {
                    warning: options.renderTimeWarning || 33, // 33ms (30fps)
                    critical: options.renderTimeCritical || 66 // 66ms (15fps)
                },
                cpuUsage: {
                    warning: options.cpuWarning || 70, // 70%
                    critical: options.cpuCritical || 85 // 85%
                }
            },
            
            // 启用的监控项
            enableFPS: options.enableFPS !== false,
            enableMemory: options.enableMemory !== false,
            enableRenderTime: options.enableRenderTime !== false,
            enableCPU: options.enableCPU !== false,
            enableGPU: options.enableGPU !== false,
            enableNetwork: options.enableNetwork !== false,
            
            // 警告设置
            enableWarnings: options.enableWarnings !== false,
            warningCallback: options.warningCallback || null,
            
            ...options
        };
        
        // 性能指标
        this.metrics = {
            fps: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                history: []
            },
            memory: {
                used: 0,
                total: 0,
                percentage: 0,
                history: []
            },
            renderTime: {
                current: 0,
                average: 0,
                min: Infinity,
                max: 0,
                history: []
            },
            cpuUsage: {
                current: 0,
                average: 0,
                history: []
            },
            gpuUsage: {
                current: 0,
                average: 0,
                history: []
            },
            network: {
                downloadSpeed: 0,
                uploadSpeed: 0,
                latency: 0,
                history: []
            }
        };
        
        // FPS计算相关
        this.frameCount = 0;
        this.lastFrameTime = 0;
        this.frameStartTime = performance.now();
        this.frameTimes = [];
        
        // 渲染时间统计
        this.renderTimes = [];
        this.operationTimes = new Map();
        
        // 内存监控
        this.memoryObserver = null;
        
        // 更新定时器
        this.updateTimer = null;
        
        // 警告状态
        this.warningStates = {
            fps: false,
            memory: false,
            renderTime: false,
            cpuUsage: false
        };
        
        // 事件监听器
        this.eventListeners = new Map();
        
        this.init();
    }
    
    /**
     * 初始化性能监控器
     */
    init() {
        // 启动定期更新
        this.startMonitoring();
        
        // 初始化内存监控
        if (this.config.enableMemory) {
            this.initMemoryMonitoring();
        }
        
        // 初始化GPU监控
        if (this.config.enableGPU) {
            this.initGPUMonitoring();
        }
        
        // 初始化网络监控
        if (this.config.enableNetwork) {
            this.initNetworkMonitoring();
        }
        
        this.logger.info('性能监控器已初始化', this.config);
    }
    
    /**
     * 开始监控
     */
    startMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
        }
        
        this.updateTimer = setInterval(() => {
            this.updateMetrics();
        }, this.config.updateInterval);
        
        this.logger.debug('性能监控已开始');
    }
    
    /**
     * 停止监控
     */
    stopMonitoring() {
        if (this.updateTimer) {
            clearInterval(this.updateTimer);
            this.updateTimer = null;
        }
        
        this.logger.debug('性能监控已停止');
    }
    
    /**
     * 记录帧
     * @param {number} renderTime - 渲染时间（毫秒）
     * @param {number} fps - 当前FPS
     */
    recordFrame(renderTime, fps) {
        if (!this.config.enableFPS && !this.config.enableRenderTime) {
            return;
        }
        
        const now = performance.now();
        
        // 记录FPS
        if (this.config.enableFPS) {
            this.frameCount++;
            this.frameTimes.push(now);
            
            // 保持最近1秒的帧时间
            while (this.frameTimes.length > 0 && now - this.frameTimes[0] > 1000) {
                this.frameTimes.shift();
            }
            
            // 计算当前FPS
            const currentFPS = this.frameTimes.length;
            this.updateFPSMetrics(currentFPS);
        }
        
        // 记录渲染时间
        if (this.config.enableRenderTime && renderTime !== undefined) {
            this.renderTimes.push(renderTime);
            
            // 保持最近100帧的渲染时间
            if (this.renderTimes.length > 100) {
                this.renderTimes.shift();
            }
            
            this.updateRenderTimeMetrics(renderTime);
        }
    }
    
    /**
     * 记录操作时间
     * @param {string} operation - 操作名称
     * @param {number} duration - 持续时间（毫秒）
     */
    recordOperation(operation, duration) {
        if (!this.operationTimes.has(operation)) {
            this.operationTimes.set(operation, {
                times: [],
                total: 0,
                count: 0,
                average: 0,
                min: Infinity,
                max: 0
            });
        }
        
        const opData = this.operationTimes.get(operation);
        opData.times.push(duration);
        opData.total += duration;
        opData.count++;
        opData.average = opData.total / opData.count;
        opData.min = Math.min(opData.min, duration);
        opData.max = Math.max(opData.max, duration);
        
        // 保持最近100次操作的时间
        if (opData.times.length > 100) {
            const removed = opData.times.shift();
            opData.total -= removed;
            opData.average = opData.total / opData.times.length;
        }
    }
    
    /**
     * 更新FPS指标
     * @param {number} currentFPS - 当前FPS
     */
    updateFPSMetrics(currentFPS) {
        const fps = this.metrics.fps;
        
        fps.current = currentFPS;
        fps.min = Math.min(fps.min, currentFPS);
        fps.max = Math.max(fps.max, currentFPS);
        
        // 添加到历史记录
        fps.history.push({
            value: currentFPS,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (fps.history.length > this.config.maxHistorySize) {
            fps.history.shift();
        }
        
        // 计算平均值
        if (fps.history.length > 0) {
            fps.average = fps.history.reduce((sum, item) => sum + item.value, 0) / fps.history.length;
        }
        
        // 检查警告阈值
        this.checkFPSWarnings(currentFPS);
    }
    
    /**
     * 更新渲染时间指标
     * @param {number} renderTime - 渲染时间
     */
    updateRenderTimeMetrics(renderTime) {
        const rt = this.metrics.renderTime;
        
        rt.current = renderTime;
        rt.min = Math.min(rt.min, renderTime);
        rt.max = Math.max(rt.max, renderTime);
        
        // 添加到历史记录
        rt.history.push({
            value: renderTime,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (rt.history.length > this.config.maxHistorySize) {
            rt.history.shift();
        }
        
        // 计算平均值
        if (this.renderTimes.length > 0) {
            rt.average = this.renderTimes.reduce((sum, time) => sum + time, 0) / this.renderTimes.length;
        }
        
        // 检查警告阈值
        this.checkRenderTimeWarnings(renderTime);
    }
    
    /**
     * 更新所有指标
     */
    updateMetrics() {
        // 更新内存使用
        if (this.config.enableMemory) {
            this.updateMemoryMetrics();
        }
        
        // 更新CPU使用
        if (this.config.enableCPU) {
            this.updateCPUMetrics();
        }
        
        // 更新GPU使用
        if (this.config.enableGPU) {
            this.updateGPUMetrics();
        }
        
        // 更新网络指标
        if (this.config.enableNetwork) {
            this.updateNetworkMetrics();
        }
        
        // 触发更新事件
        this.emit('metricsUpdated', this.getMetrics());
    }
    
    /**
     * 更新内存指标
     */
    updateMemoryMetrics() {
        if (performance.memory) {
            const memory = this.metrics.memory;
            
            memory.used = performance.memory.usedJSHeapSize;
            memory.total = performance.memory.totalJSHeapSize;
            memory.percentage = (memory.used / memory.total) * 100;
            
            // 添加到历史记录
            memory.history.push({
                used: memory.used,
                total: memory.total,
                percentage: memory.percentage,
                timestamp: Date.now()
            });
            
            // 限制历史记录大小
            if (memory.history.length > this.config.maxHistorySize) {
                memory.history.shift();
            }
            
            // 检查警告阈值
            this.checkMemoryWarnings(memory.percentage);
        }
    }
    
    /**
     * 更新CPU指标
     */
    updateCPUMetrics() {
        // 浏览器环境中CPU使用率的估算
        // 这是一个简化的实现，实际应用中可能需要更复杂的方法
        
        const startTime = performance.now();
        const iterations = 10000;
        
        // 执行一些计算来测量CPU性能
        for (let i = 0; i < iterations; i++) {
            Math.random() * Math.random();
        }
        
        const endTime = performance.now();
        const executionTime = endTime - startTime;
        
        // 基于执行时间估算CPU使用率（这是一个简化的方法）
        const baselineTime = 1; // 基准时间（毫秒）
        const cpuUsage = Math.min(100, (executionTime / baselineTime) * 10);
        
        const cpu = this.metrics.cpuUsage;
        cpu.current = cpuUsage;
        
        // 添加到历史记录
        cpu.history.push({
            value: cpuUsage,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (cpu.history.length > this.config.maxHistorySize) {
            cpu.history.shift();
        }
        
        // 计算平均值
        if (cpu.history.length > 0) {
            cpu.average = cpu.history.reduce((sum, item) => sum + item.value, 0) / cpu.history.length;
        }
        
        // 检查警告阈值
        this.checkCPUWarnings(cpuUsage);
    }
    
    /**
     * 更新GPU指标
     */
    updateGPUMetrics() {
        // GPU监控在浏览器中比较有限
        // 这里提供一个基础框架
        
        const gpu = this.metrics.gpuUsage;
        
        // 如果有WebGL上下文，可以获取一些GPU信息
        if (typeof WebGLRenderingContext !== 'undefined') {
            let canvas = null;
            let gl = null;
            
            try {
                canvas = document.createElement('canvas');
                canvas.width = 1;
                canvas.height = 1;
                gl = canvas.getContext('webgl', { preserveDrawingBuffer: false }) || 
                     canvas.getContext('experimental-webgl', { preserveDrawingBuffer: false });
                
                if (gl) {
                    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
                    if (debugInfo) {
                        // 这里可以获取GPU信息，但使用率仍然难以准确测量
                        // 作为示例，我们使用一个模拟值
                        gpu.current = Math.random() * 50; // 模拟GPU使用率
                    }
                }
            } finally {
                // 清理WebGL上下文
                if (gl) {
                    const loseContext = gl.getExtension('WEBGL_lose_context');
                    if (loseContext) {
                        loseContext.loseContext();
                    }
                }
                if (canvas) {
                    canvas.width = 1;
                    canvas.height = 1;
                    canvas = null;
                }
            }
        }
        
        // 添加到历史记录
        gpu.history.push({
            value: gpu.current,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (gpu.history.length > this.config.maxHistorySize) {
            gpu.history.shift();
        }
        
        // 计算平均值
        if (gpu.history.length > 0) {
            gpu.average = gpu.history.reduce((sum, item) => sum + item.value, 0) / gpu.history.length;
        }
    }
    
    /**
     * 更新网络指标
     */
    updateNetworkMetrics() {
        // 网络监控的基础实现
        const network = this.metrics.network;
        
        // 如果支持Network Information API
        if (navigator.connection) {
            const connection = navigator.connection;
            
            // 获取网络信息
            network.downloadSpeed = connection.downlink || 0; // Mbps
            network.latency = connection.rtt || 0; // ms
        }
        
        // 添加到历史记录
        network.history.push({
            downloadSpeed: network.downloadSpeed,
            uploadSpeed: network.uploadSpeed,
            latency: network.latency,
            timestamp: Date.now()
        });
        
        // 限制历史记录大小
        if (network.history.length > this.config.maxHistorySize) {
            network.history.shift();
        }
    }
    
    /**
     * 检查FPS警告
     * @param {number} fps - 当前FPS
     */
    checkFPSWarnings(fps) {
        const thresholds = this.config.thresholds.fps;
        
        if (fps <= thresholds.critical && !this.warningStates.fps) {
            this.warningStates.fps = true;
            this.emitWarning('fps', 'critical', fps, thresholds.critical);
            
        } else if (fps <= thresholds.warning && fps > thresholds.critical && !this.warningStates.fps) {
            this.warningStates.fps = true;
            this.emitWarning('fps', 'warning', fps, thresholds.warning);
            
        } else if (fps > thresholds.warning && this.warningStates.fps) {
            this.warningStates.fps = false;
            this.emitWarning('fps', 'resolved', fps, thresholds.warning);
        }
    }
    
    /**
     * 检查内存警告
     * @param {number} percentage - 内存使用百分比
     */
    checkMemoryWarnings(percentage) {
        const thresholds = this.config.thresholds.memory;
        
        if (percentage >= thresholds.critical && !this.warningStates.memory) {
            this.warningStates.memory = true;
            this.emitWarning('memory', 'critical', percentage, thresholds.critical);
            
        } else if (percentage >= thresholds.warning && percentage < thresholds.critical && !this.warningStates.memory) {
            this.warningStates.memory = true;
            this.emitWarning('memory', 'warning', percentage, thresholds.warning);
            
        } else if (percentage < thresholds.warning && this.warningStates.memory) {
            this.warningStates.memory = false;
            this.emitWarning('memory', 'resolved', percentage, thresholds.warning);
        }
    }
    
    /**
     * 检查渲染时间警告
     * @param {number} renderTime - 渲染时间
     */
    checkRenderTimeWarnings(renderTime) {
        const thresholds = this.config.thresholds.renderTime;
        
        if (renderTime >= thresholds.critical && !this.warningStates.renderTime) {
            this.warningStates.renderTime = true;
            this.emitWarning('renderTime', 'critical', renderTime, thresholds.critical);
            
        } else if (renderTime >= thresholds.warning && renderTime < thresholds.critical && !this.warningStates.renderTime) {
            this.warningStates.renderTime = true;
            this.emitWarning('renderTime', 'warning', renderTime, thresholds.warning);
            
        } else if (renderTime < thresholds.warning && this.warningStates.renderTime) {
            this.warningStates.renderTime = false;
            this.emitWarning('renderTime', 'resolved', renderTime, thresholds.warning);
        }
    }
    
    /**
     * 检查CPU警告
     * @param {number} cpuUsage - CPU使用率
     */
    checkCPUWarnings(cpuUsage) {
        const thresholds = this.config.thresholds.cpuUsage;
        
        if (cpuUsage >= thresholds.critical && !this.warningStates.cpuUsage) {
            this.warningStates.cpuUsage = true;
            this.emitWarning('cpuUsage', 'critical', cpuUsage, thresholds.critical);
            
        } else if (cpuUsage >= thresholds.warning && cpuUsage < thresholds.critical && !this.warningStates.cpuUsage) {
            this.warningStates.cpuUsage = true;
            this.emitWarning('cpuUsage', 'warning', cpuUsage, thresholds.warning);
            
        } else if (cpuUsage < thresholds.warning && this.warningStates.cpuUsage) {
            this.warningStates.cpuUsage = false;
            this.emitWarning('cpuUsage', 'resolved', cpuUsage, thresholds.warning);
        }
    }
    
    /**
     * 发出警告
     * @param {string} metric - 指标名称
     * @param {string} level - 警告级别
     * @param {number} value - 当前值
     * @param {number} threshold - 阈值
     */
    emitWarning(metric, level, value, threshold) {
        if (!this.config.enableWarnings) return;
        
        const warning = {
            metric,
            level,
            value,
            threshold,
            timestamp: Date.now(),
            message: this.getWarningMessage(metric, level, value, threshold)
        };
        
        this.logger.warn('性能警告:', warning);
        
        // 调用回调函数
        if (this.config.warningCallback) {
            this.config.warningCallback(warning);
        }
        
        // 触发事件
        this.emit('performanceWarning', warning);
    }
    
    /**
     * 获取警告消息
     * @param {string} metric - 指标名称
     * @param {string} level - 警告级别
     * @param {number} value - 当前值
     * @param {number} threshold - 阈值
     * @returns {string} 警告消息
     */
    getWarningMessage(metric, level, value, threshold) {
        const metricNames = {
            fps: 'FPS',
            memory: '内存使用率',
            renderTime: '渲染时间',
            cpuUsage: 'CPU使用率'
        };
        
        const levelNames = {
            warning: '警告',
            critical: '严重',
            resolved: '已恢复'
        };
        
        const metricName = metricNames[metric] || metric;
        const levelName = levelNames[level] || level;
        
        if (level === 'resolved') {
            return `${metricName}${levelName}正常 (当前: ${value.toFixed(2)})`;
        } else {
            return `${metricName}${levelName} (当前: ${value.toFixed(2)}, 阈值: ${threshold})`;
        }
    }
    
    /**
     * 初始化内存监控
     */
    initMemoryMonitoring() {
        // 如果支持PerformanceObserver
        if (typeof PerformanceObserver !== 'undefined') {
            try {
                this.memoryObserver = new PerformanceObserver((list) => {
                    const entries = list.getEntries();
                    entries.forEach(entry => {
                        if (entry.entryType === 'measure') {
                            // 处理内存相关的性能条目
                            this.logger.debug('内存性能条目:', entry);
                        }
                    });
                });
                
                this.memoryObserver.observe({ entryTypes: ['measure'] });
                
            } catch (error) {
                this.logger.warn('无法初始化内存监控:', error);
            }
        }
    }
    
    /**
     * 初始化GPU监控
     */
    initGPUMonitoring() {
        // GPU监控的初始化
        this.logger.debug('GPU监控已初始化');
    }
    
    /**
     * 初始化网络监控
     */
    initNetworkMonitoring() {
        // 监听网络状态变化
        if (navigator.connection) {
            navigator.connection.addEventListener('change', () => {
                this.updateNetworkMetrics();
            });
        }
        
        this.logger.debug('网络监控已初始化');
    }
    
    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    getMetrics() {
        return {
            ...this.metrics,
            operations: Object.fromEntries(this.operationTimes),
            timestamp: Date.now()
        };
    }
    
    /**
     * 获取性能摘要
     * @returns {Object} 性能摘要
     */
    getSummary() {
        const metrics = this.getMetrics();
        
        return {
            fps: {
                current: metrics.fps.current,
                average: metrics.fps.average,
                status: this.getFPSStatus(metrics.fps.current)
            },
            memory: {
                percentage: metrics.memory.percentage,
                used: this.formatBytes(metrics.memory.used),
                total: this.formatBytes(metrics.memory.total),
                status: this.getMemoryStatus(metrics.memory.percentage)
            },
            renderTime: {
                current: metrics.renderTime.current,
                average: metrics.renderTime.average,
                status: this.getRenderTimeStatus(metrics.renderTime.current)
            },
            overall: this.getOverallStatus()
        };
    }
    
    /**
     * 获取FPS状态
     * @param {number} fps - FPS值
     * @returns {string} 状态
     */
    getFPSStatus(fps) {
        const thresholds = this.config.thresholds.fps;
        
        if (fps <= thresholds.critical) return 'critical';
        if (fps <= thresholds.warning) return 'warning';
        return 'good';
    }
    
    /**
     * 获取内存状态
     * @param {number} percentage - 内存使用百分比
     * @returns {string} 状态
     */
    getMemoryStatus(percentage) {
        const thresholds = this.config.thresholds.memory;
        
        if (percentage >= thresholds.critical) return 'critical';
        if (percentage >= thresholds.warning) return 'warning';
        return 'good';
    }
    
    /**
     * 获取渲染时间状态
     * @param {number} renderTime - 渲染时间
     * @returns {string} 状态
     */
    getRenderTimeStatus(renderTime) {
        const thresholds = this.config.thresholds.renderTime;
        
        if (renderTime >= thresholds.critical) return 'critical';
        if (renderTime >= thresholds.warning) return 'warning';
        return 'good';
    }
    
    /**
     * 获取整体状态
     * @returns {string} 整体状态
     */
    getOverallStatus() {
        const statuses = [
            this.getFPSStatus(this.metrics.fps.current),
            this.getMemoryStatus(this.metrics.memory.percentage),
            this.getRenderTimeStatus(this.metrics.renderTime.current)
        ];
        
        if (statuses.includes('critical')) return 'critical';
        if (statuses.includes('warning')) return 'warning';
        return 'good';
    }
    
    /**
     * 格式化字节数
     * @param {number} bytes - 字节数
     * @returns {string} 格式化的字符串
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * 重置统计信息
     */
    reset() {
        // 重置所有指标
        Object.keys(this.metrics).forEach(key => {
            const metric = this.metrics[key];
            if (metric.history) {
                metric.history = [];
            }
            if (metric.hasOwnProperty('current')) {
                metric.current = 0;
            }
            if (metric.hasOwnProperty('average')) {
                metric.average = 0;
            }
            if (metric.hasOwnProperty('min')) {
                metric.min = Infinity;
            }
            if (metric.hasOwnProperty('max')) {
                metric.max = 0;
            }
        });
        
        // 重置其他统计
        this.frameCount = 0;
        this.frameTimes = [];
        this.renderTimes = [];
        this.operationTimes.clear();
        
        // 重置警告状态
        Object.keys(this.warningStates).forEach(key => {
            this.warningStates[key] = false;
        });
        
        this.logger.info('性能统计已重置');
    }
    
    /**
     * 添加事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 移除事件监听器
     * @param {string} event - 事件名称
     * @param {Function} callback - 回调函数
     */
    off(event, callback) {
        if (this.eventListeners.has(event)) {
            const listeners = this.eventListeners.get(event);
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    
    /**
     * 触发事件
     * @param {string} event - 事件名称
     * @param {*} data - 事件数据
     */
    emit(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    this.logger.error('事件回调执行失败:', error, { event });
                }
            });
        }
    }
    
    /**
     * 导出性能数据
     * @param {string} format - 导出格式 ('json' | 'csv')
     * @returns {string} 导出的数据
     */
    export(format = 'json') {
        const data = {
            metrics: this.getMetrics(),
            summary: this.getSummary(),
            config: this.config,
            exportTime: new Date().toISOString()
        };
        
        if (format === 'csv') {
            return this.convertToCSV(data);
        }
        
        return JSON.stringify(data, null, 2);
    }
    
    /**
     * 转换为CSV格式
     * @param {Object} data - 数据
     * @returns {string} CSV字符串
     */
    convertToCSV(data) {
        // 简化的CSV转换实现
        const lines = ['Metric,Current,Average,Min,Max'];
        
        Object.entries(data.metrics).forEach(([key, metric]) => {
            if (metric.current !== undefined) {
                lines.push(`${key},${metric.current},${metric.average || 0},${metric.min || 0},${metric.max || 0}`);
            }
        });
        
        return lines.join('\n');
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.stopMonitoring();
        
        if (this.memoryObserver) {
            this.memoryObserver.disconnect();
            this.memoryObserver = null;
        }
        
        this.eventListeners.clear();
        this.operationTimes.clear();
        
        this.logger.info('性能监控器资源已清理');
    }
}

export default PerformanceMonitor;