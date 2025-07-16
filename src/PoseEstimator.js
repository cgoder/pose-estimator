/**
 * 姿态估计器主类
 * 整合所有模块，提供统一的API接口
 */

import { ModelManager } from './components/ModelManager.js';
import { OneEuroFilter } from './filters/OneEuroFilter.js';
import { KalmanFilter } from './filters/KalmanFilter.js';
import { UIManager } from './ui/UIManager.js';
import { Renderer } from './rendering/Renderer.js';
import { CacheManager } from './utils/CacheManager.js';
import { PerformanceMonitor } from './utils/PerformanceMonitor.js';
import { Logger } from './utils/Logger.js';
import { EventBus } from './utils/EventBus.js';
import { ConfigManager } from './core/ConfigManager.js';
import { StorageManager } from './core/StorageManager.js';
import { DeviceManager } from './core/DeviceManager.js';
import { ErrorRecovery } from './core/ErrorRecovery.js';
import { BiomechanicsAnalyzer } from './analyzers/BiomechanicsAnalyzer.js';
import { TrajectoryAnalyzer } from './analyzers/TrajectoryAnalyzer.js';
import { DataExporter } from './data/DataExporter.js';
import { DataCollector } from './data/DataCollector.js';

export class PoseEstimator {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 模型选项
            modelType: options.modelType || 'movenet',
            modelSize: options.modelSize || 'lightning',
            
            // 渲染选项
            canvas: options.canvas || null,
            showKeypoints: options.showKeypoints !== false,
            showSkeleton: options.showSkeleton !== false,
            showTrajectories: options.showTrajectories || false,
            
            // 滤波选项
            enableFiltering: options.enableFiltering !== false,
            filterType: options.filterType || 'oneEuro', // oneEuro, kalman
            
            // 分析选项
            enableBiomechanics: options.enableBiomechanics || false,
            enableTrajectoryAnalysis: options.enableTrajectoryAnalysis || false,
            
            // 数据选项
            enableDataCollection: options.enableDataCollection !== false,
            enableDataExport: options.enableDataExport !== false,
            
            // 性能选项
            enablePerformanceMonitoring: options.enablePerformanceMonitoring !== false,
            targetFPS: options.targetFPS || 30,
            
            // UI选项
            enableUI: options.enableUI !== false,
            
            // 调试选项
            debug: options.debug || false,
            
            ...options
        };
        
        // 状态管理
        this.state = {
            initialized: false,
            running: false,
            paused: false,
            error: null,
            currentPose: null,
            frameCount: 0,
            startTime: null
        };
        
        // 核心模块
        this.configManager = null;
        this.storageManager = null;
        this.deviceManager = null;
        this.errorRecovery = null;
        
        // 模型和处理模块
        this.modelManager = null;
        this.filter = null;
        
        // 渲染和UI模块
        this.renderer = null;
        this.uiManager = null;
        
        // 分析模块
        this.biomechanicsAnalyzer = null;
        this.trajectoryAnalyzer = null;
        
        // 数据模块
        this.dataCollector = null;
        this.dataExporter = null;
        
        // 工具模块
        this.cacheManager = null;
        this.performanceMonitor = null;
        this.logger = null;
        this.eventBus = null;
        
        // 媒体流
        this.videoElement = null;
        this.stream = null;
        
        // 动画循环
        this.animationId = null;
        
        this.init();
    }
    
    /**
     * 初始化姿态估计器
     */
    async init() {
        try {
            // 初始化核心模块
            await this.initCoreModules();
            
            // 初始化工具模块
            await this.initUtilityModules();
            
            // 初始化模型和处理模块
            await this.initProcessingModules();
            
            // 初始化渲染和UI模块
            await this.initRenderingModules();
            
            // 初始化分析模块
            await this.initAnalysisModules();
            
            // 初始化数据模块
            await this.initDataModules();
            
            // 设置事件监听
            this.setupEventListeners();
            
            // 标记为已初始化
            this.state.initialized = true;
            
            this.logger.info('姿态估计器初始化完成', this.options);
            this.eventBus.emit('initialized', { timestamp: Date.now() });
            
        } catch (error) {
            this.state.error = error;
            this.logger.error('姿态估计器初始化失败:', error);
            
            // 尝试错误恢复
            if (this.errorRecovery) {
                await this.errorRecovery.handleError(error, 'initialization');
            }
            
            throw error;
        }
    }
    
    /**
     * 初始化核心模块
     */
    async initCoreModules() {
        // 配置管理器
        this.configManager = new ConfigManager(this.options);
        
        // 存储管理器
        this.storageManager = new StorageManager();
        
        // 设备管理器
        this.deviceManager = new DeviceManager();
        
        // 错误恢复
        this.errorRecovery = new ErrorRecovery({
            debug: this.options.debug
        });
    }
    
    /**
     * 初始化工具模块
     */
    async initUtilityModules() {
        // 事件总线
        this.eventBus = EventBus.getInstance();
        
        // 日志记录器
        this.logger = new Logger({ 
            prefix: 'PoseEstimator',
            debug: this.options.debug
        });
        
        // 缓存管理器
        this.cacheManager = new CacheManager();
        
        // 性能监控器
        if (this.options.enablePerformanceMonitoring) {
            this.performanceMonitor = new PerformanceMonitor({
                targetFPS: this.options.targetFPS,
                debug: this.options.debug
            });
        }
    }
    
    /**
     * 初始化模型和处理模块
     */
    async initProcessingModules() {
        // 模型管理器
        this.modelManager = new ModelManager({
            modelType: this.options.modelType,
            modelSize: this.options.modelSize,
            debug: this.options.debug
        });
        
        // 滤波器
        if (this.options.enableFiltering) {
            switch (this.options.filterType) {
                case 'oneEuro':
                    this.filter = new OneEuroFilter({
                        debug: this.options.debug
                    });
                    break;
                case 'kalman':
                    this.filter = new KalmanFilter({
                        debug: this.options.debug
                    });
                    break;
                default:
                    this.logger.warn(`未知的滤波器类型: ${this.options.filterType}`);
            }
        }
    }
    
    /**
     * 初始化渲染和UI模块
     */
    async initRenderingModules() {
        // 渲染器
        if (this.options.canvas) {
            this.renderer = new Renderer(this.options.canvas, {
                showKeypoints: this.options.showKeypoints,
                showSkeleton: this.options.showSkeleton,
                showTrajectories: this.options.showTrajectories,
                debug: this.options.debug
            });
        }
        
        // UI管理器
        if (this.options.enableUI) {
            this.uiManager = new UIManager({
                debug: this.options.debug
            });
        }
    }
    
    /**
     * 初始化分析模块
     */
    async initAnalysisModules() {
        // 生物力学分析器
        if (this.options.enableBiomechanics) {
            this.biomechanicsAnalyzer = new BiomechanicsAnalyzer({
                debug: this.options.debug
            });
        }
        
        // 轨迹分析器
        if (this.options.enableTrajectoryAnalysis) {
            this.trajectoryAnalyzer = new TrajectoryAnalyzer({
                debug: this.options.debug
            });
        }
    }
    
    /**
     * 初始化数据模块
     */
    async initDataModules() {
        // 数据收集器
        if (this.options.enableDataCollection) {
            this.dataCollector = new DataCollector({
                debug: this.options.debug
            });
        }
        
        // 数据导出器
        if (this.options.enableDataExport) {
            this.dataExporter = new DataExporter({
                debug: this.options.debug
            });
        }
    }
    
    /**
     * 设置事件监听
     */
    setupEventListeners() {
        // 监听配置变更
        this.eventBus.on('configChanged', (config) => {
            this.handleConfigChange(config);
        });
        
        // 监听错误事件
        this.eventBus.on('error', (error) => {
            this.handleError(error);
        });
        
        // 监听性能警告
        if (this.performanceMonitor) {
            this.eventBus.on('performanceWarning', (warning) => {
                this.handlePerformanceWarning(warning);
            });
        }
        
        // 监听设备变更
        this.eventBus.on('deviceChanged', (device) => {
            this.handleDeviceChange(device);
        });
    }
    
    /**
     * 启动姿态检测
     * @param {HTMLVideoElement|HTMLCanvasElement|HTMLImageElement} input - 输入源
     */
    async start(input = null) {
        try {
            if (!this.state.initialized) {
                throw new Error('姿态估计器未初始化');
            }
            
            if (this.state.running) {
                this.logger.warn('姿态估计器已在运行');
                return;
            }
            
            // 设置输入源
            if (input) {
                this.videoElement = input;
            } else {
                // 启动摄像头
                await this.startCamera();
            }
            
            // 加载模型
            await this.modelManager.loadModel();
            
            // 启动性能监控
            if (this.performanceMonitor) {
                this.performanceMonitor.start();
            }
            
            // 更新状态
            this.state.running = true;
            this.state.paused = false;
            this.state.startTime = Date.now();
            this.state.frameCount = 0;
            
            // 启动检测循环
            this.startDetectionLoop();
            
            this.logger.info('姿态检测已启动');
            this.eventBus.emit('started', { timestamp: Date.now() });
            
        } catch (error) {
            this.state.error = error;
            this.logger.error('启动姿态检测失败:', error);
            
            // 尝试错误恢复
            if (this.errorRecovery) {
                await this.errorRecovery.handleError(error, 'start');
            }
            
            throw error;
        }
    }
    
    /**
     * 停止姿态检测
     */
    async stop() {
        try {
            if (!this.state.running) {
                return;
            }
            
            // 停止检测循环
            this.stopDetectionLoop();
            
            // 停止摄像头
            this.stopCamera();
            
            // 停止性能监控
            if (this.performanceMonitor) {
                this.performanceMonitor.stop();
            }
            
            // 保存数据
            if (this.dataCollector) {
                await this.dataCollector.saveData();
            }
            
            // 更新状态
            this.state.running = false;
            this.state.paused = false;
            
            this.logger.info('姿态检测已停止');
            this.eventBus.emit('stopped', { timestamp: Date.now() });
            
        } catch (error) {
            this.logger.error('停止姿态检测失败:', error);
            throw error;
        }
    }
    
    /**
     * 暂停姿态检测
     */
    pause() {
        if (this.state.running && !this.state.paused) {
            this.state.paused = true;
            this.logger.info('姿态检测已暂停');
            this.eventBus.emit('paused', { timestamp: Date.now() });
        }
    }
    
    /**
     * 恢复姿态检测
     */
    resume() {
        if (this.state.running && this.state.paused) {
            this.state.paused = false;
            this.logger.info('姿态检测已恢复');
            this.eventBus.emit('resumed', { timestamp: Date.now() });
        }
    }
    
    /**
     * 启动摄像头
     */
    async startCamera() {
        try {
            this.stream = await this.deviceManager.getMediaStream({
                video: true,
                audio: false
            });
            
            // 创建视频元素
            if (!this.videoElement) {
                this.videoElement = document.createElement('video');
                this.videoElement.autoplay = true;
                this.videoElement.muted = true;
                this.videoElement.playsInline = true;
            }
            
            this.videoElement.srcObject = this.stream;
            
            // 等待视频加载
            await new Promise((resolve) => {
                this.videoElement.onloadedmetadata = resolve;
            });
            
            this.logger.info('摄像头已启动');
            
        } catch (error) {
            this.logger.error('启动摄像头失败:', error);
            throw error;
        }
    }
    
    /**
     * 停止摄像头
     */
    stopCamera() {
        if (this.stream) {
            this.deviceManager.stopMediaStream(this.stream);
            this.stream = null;
        }
        
        if (this.videoElement && this.videoElement.srcObject) {
            this.videoElement.srcObject = null;
        }
        
        this.logger.info('摄像头已停止');
    }
    
    /**
     * 启动检测循环
     */
    startDetectionLoop() {
        const detectFrame = async () => {
            if (!this.state.running) {
                return;
            }
            
            try {
                if (!this.state.paused) {
                    await this.detectPose();
                }
                
                // 继续下一帧
                this.animationId = requestAnimationFrame(detectFrame);
                
            } catch (error) {
                this.logger.error('检测循环错误:', error);
                
                // 尝试错误恢复
                if (this.errorRecovery) {
                    await this.errorRecovery.handleError(error, 'detection');
                }
                
                // 继续循环（除非是致命错误）
                if (this.state.running) {
                    this.animationId = requestAnimationFrame(detectFrame);
                }
            }
        };
        
        this.animationId = requestAnimationFrame(detectFrame);
    }
    
    /**
     * 停止检测循环
     */
    stopDetectionLoop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * 检测姿态
     */
    async detectPose() {
        const startTime = performance.now();
        
        try {
            // 检测姿态
            const poses = await this.modelManager.estimatePoses(this.videoElement);
            
            if (poses && poses.length > 0) {
                let processedPoses = poses;
                
                // 应用滤波
                if (this.filter) {
                    processedPoses = poses.map(pose => 
                        this.filter.filterKeypoints(pose.keypoints)
                    ).map((keypoints, index) => ({
                        ...poses[index],
                        keypoints
                    }));
                }
                
                // 更新当前姿态
                this.state.currentPose = processedPoses[0];
                
                // 渲染结果
                if (this.renderer) {
                    this.renderer.render(this.videoElement, processedPoses);
                }
                
                // 分析数据
                await this.analyzeData(processedPoses);
                
                // 收集数据
                if (this.dataCollector) {
                    for (const pose of processedPoses) {
                        this.dataCollector.collectPose(pose);
                    }
                }
                
                // 触发事件
                this.eventBus.emit('poseDetected', {
                    poses: processedPoses,
                    timestamp: Date.now(),
                    frameCount: this.state.frameCount
                });
            }
            
            // 更新帧计数
            this.state.frameCount++;
            
            // 更新性能监控
            if (this.performanceMonitor) {
                const processingTime = performance.now() - startTime;
                this.performanceMonitor.recordFrame(processingTime);
            }
            
        } catch (error) {
            this.logger.error('姿态检测失败:', error);
            throw error;
        }
    }
    
    /**
     * 分析数据
     * @param {Array} poses - 姿态数据
     */
    async analyzeData(poses) {
        try {
            // 生物力学分析
            if (this.biomechanicsAnalyzer && poses.length > 0) {
                const analysis = this.biomechanicsAnalyzer.analyze(poses[0]);
                
                if (analysis) {
                    this.eventBus.emit('analysisCompleted', {
                        type: 'biomechanics',
                        data: analysis,
                        timestamp: Date.now()
                    });
                }
            }
            
            // 轨迹分析
            if (this.trajectoryAnalyzer && poses.length > 0) {
                for (const pose of poses) {
                    if (pose.keypoints) {
                        for (let i = 0; i < pose.keypoints.length; i++) {
                            const keypoint = pose.keypoints[i];
                            if (keypoint.score > 0.5) {
                                this.trajectoryAnalyzer.addPoint(i, {
                                    x: keypoint.x,
                                    y: keypoint.y,
                                    z: keypoint.z || 0,
                                    confidence: keypoint.score,
                                    timestamp: Date.now()
                                });
                            }
                        }
                    }
                }
                
                // 获取轨迹分析结果
                const trajectoryAnalysis = this.trajectoryAnalyzer.getCurrentAnalysis();
                if (trajectoryAnalysis) {
                    this.eventBus.emit('analysisCompleted', {
                        type: 'trajectory',
                        data: trajectoryAnalysis,
                        timestamp: Date.now()
                    });
                }
            }
            
        } catch (error) {
            this.logger.error('数据分析失败:', error);
        }
    }
    
    /**
     * 处理配置变更
     * @param {Object} config - 新配置
     */
    async handleConfigChange(config) {
        try {
            // 更新选项
            this.options = { ...this.options, ...config };
            
            // 更新各模块配置
            if (this.renderer && config.rendering) {
                this.renderer.updateOptions(config.rendering);
            }
            
            if (this.filter && config.filtering) {
                this.filter.updateOptions(config.filtering);
            }
            
            if (this.biomechanicsAnalyzer && config.biomechanics) {
                this.biomechanicsAnalyzer.updateOptions(config.biomechanics);
            }
            
            if (this.trajectoryAnalyzer && config.trajectory) {
                this.trajectoryAnalyzer.updateOptions(config.trajectory);
            }
            
            this.logger.info('配置已更新', config);
            
        } catch (error) {
            this.logger.error('配置更新失败:', error);
        }
    }
    
    /**
     * 处理错误
     * @param {Error} error - 错误对象
     */
    async handleError(error) {
        this.state.error = error;
        this.logger.error('系统错误:', error);
        
        // 尝试错误恢复
        if (this.errorRecovery) {
            await this.errorRecovery.handleError(error, 'system');
        }
    }
    
    /**
     * 处理性能警告
     * @param {Object} warning - 警告信息
     */
    handlePerformanceWarning(warning) {
        this.logger.warn('性能警告:', warning);
        
        // 根据警告类型采取措施
        switch (warning.type) {
            case 'lowFPS':
                // 降低处理质量
                if (this.renderer) {
                    this.renderer.updateOptions({ quality: 'low' });
                }
                break;
            case 'highMemory':
                // 清理缓存
                if (this.cacheManager) {
                    this.cacheManager.cleanup();
                }
                break;
            case 'highCPU':
                // 降低检测频率
                // 可以实现帧跳过逻辑
                break;
        }
    }
    
    /**
     * 处理设备变更
     * @param {Object} device - 设备信息
     */
    async handleDeviceChange(device) {
        this.logger.info('设备变更:', device);
        
        // 如果是摄像头变更，重新启动摄像头
        if (device.type === 'camera' && this.state.running) {
            try {
                this.stopCamera();
                await this.startCamera();
            } catch (error) {
                this.logger.error('摄像头切换失败:', error);
            }
        }
    }
    
    /**
     * 导出数据
     * @param {Object} options - 导出选项
     * @returns {Promise<Object>} 导出结果
     */
    async exportData(options = {}) {
        try {
            if (!this.dataExporter || !this.dataCollector) {
                throw new Error('数据导出功能未启用');
            }
            
            const data = this.dataCollector.exportData(options);
            const result = await this.dataExporter.exportData(data, options);
            
            this.logger.info('数据导出完成', {
                format: result.format,
                size: result.size
            });
            
            return result;
            
        } catch (error) {
            this.logger.error('数据导出失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取当前状态
     * @returns {Object} 当前状态
     */
    getState() {
        return {
            ...this.state,
            performance: this.performanceMonitor ? this.performanceMonitor.getMetrics() : null,
            memory: this.dataCollector ? this.dataCollector.getMemoryUsage() : null
        };
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        const stats = {
            frameCount: this.state.frameCount,
            uptime: this.state.startTime ? Date.now() - this.state.startTime : 0,
            averageFPS: 0
        };
        
        if (stats.uptime > 0) {
            stats.averageFPS = (this.state.frameCount / (stats.uptime / 1000)).toFixed(2);
        }
        
        // 添加各模块统计信息
        if (this.performanceMonitor) {
            stats.performance = this.performanceMonitor.getStatistics();
        }
        
        if (this.dataCollector) {
            stats.data = this.dataCollector.getStatistics();
        }
        
        if (this.biomechanicsAnalyzer) {
            stats.biomechanics = this.biomechanicsAnalyzer.getStatistics();
        }
        
        if (this.trajectoryAnalyzer) {
            stats.trajectory = this.trajectoryAnalyzer.getStatistics();
        }
        
        return stats;
    }
    
    /**
     * 获取配置
     * @returns {Object} 当前配置
     */
    getConfig() {
        return this.configManager ? this.configManager.getAll() : this.options;
    }
    
    /**
     * 更新配置
     * @param {Object} config - 新配置
     */
    updateConfig(config) {
        if (this.configManager) {
            this.configManager.setMultiple(config);
        } else {
            this.options = { ...this.options, ...config };
        }
    }
    
    /**
     * 重置系统
     */
    async reset() {
        try {
            // 停止检测
            if (this.state.running) {
                await this.stop();
            }
            
            // 重置各模块
            if (this.filter) {
                this.filter.reset();
            }
            
            if (this.biomechanicsAnalyzer) {
                this.biomechanicsAnalyzer.reset();
            }
            
            if (this.trajectoryAnalyzer) {
                this.trajectoryAnalyzer.reset();
            }
            
            if (this.dataCollector) {
                this.dataCollector.reset();
            }
            
            if (this.performanceMonitor) {
                this.performanceMonitor.reset();
            }
            
            // 重置状态
            this.state = {
                initialized: true,
                running: false,
                paused: false,
                error: null,
                currentPose: null,
                frameCount: 0,
                startTime: null
            };
            
            this.logger.info('系统已重置');
            this.eventBus.emit('reset', { timestamp: Date.now() });
            
        } catch (error) {
            this.logger.error('系统重置失败:', error);
            throw error;
        }
    }
    
    /**
     * 销毁姿态估计器
     */
    async destroy() {
        try {
            // 停止检测
            if (this.state.running) {
                await this.stop();
            }
            
            // 销毁各模块
            if (this.modelManager) {
                this.modelManager.destroy();
            }
            
            if (this.filter) {
                this.filter.destroy();
            }
            
            if (this.renderer) {
                this.renderer.destroy();
            }
            
            if (this.uiManager) {
                this.uiManager.destroy();
            }
            
            if (this.biomechanicsAnalyzer) {
                this.biomechanicsAnalyzer.destroy();
            }
            
            if (this.trajectoryAnalyzer) {
                this.trajectoryAnalyzer.destroy();
            }
            
            if (this.dataCollector) {
                this.dataCollector.destroy();
            }
            
            if (this.dataExporter) {
                this.dataExporter.destroy();
            }
            
            if (this.cacheManager) {
                this.cacheManager.destroy();
            }
            
            if (this.performanceMonitor) {
                this.performanceMonitor.destroy();
            }
            
            if (this.deviceManager) {
                this.deviceManager.destroy();
            }
            
            if (this.errorRecovery) {
                this.errorRecovery.destroy();
            }
            
            // 清理状态
            this.state.initialized = false;
            this.state.running = false;
            
            this.logger.info('姿态估计器已销毁');
            
        } catch (error) {
            this.logger.error('销毁姿态估计器失败:', error);
            throw error;
        }
    }
}