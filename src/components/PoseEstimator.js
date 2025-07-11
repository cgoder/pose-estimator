import { CONFIG, POSE_CONNECTIONS, KEYPOINT_NAMES } from '../utils/constants.js';
import { ErrorHandler, EnvironmentChecker } from '../utils/errorHandling.js';
import { performanceMonitor, PerformanceOptimizer } from '../utils/performance.js';
import { TensorFlowProvider, MODEL_TYPES } from '../ai/models/TensorFlowProvider.js';
import { OneEuroFilterManager } from '../ai/filters/OneEuroFilterManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';
import { IPoseEstimator } from '../interfaces/components/IPoseEstimator.js';
// OneEuroFilter 现在通过 OneEuroFilterManager 管理

/**
 * 姿态估计器主类
 * 负责摄像头管理、模型加载、姿态检测和渲染
 */
export class PoseEstimator extends IPoseEstimator {
    constructor(canvas, options = {}, inputSourceManager = null) {
        super();
        
        // 验证环境
        EnvironmentChecker.checkCanvas(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.detector = null;
        this.isRunning = false;
        this.animationId = null;
        
        // 输入源管理器 - 现在是唯一的输入源
        this.inputSourceManager = inputSourceManager;
        if (!this.inputSourceManager) {
            throw new Error('InputSourceManager is required for PoseEstimator');
        }
        
        // 配置选项
        this.options = {
            modelType: options.modelType || CONFIG.MODEL.DEFAULT_TYPE,
            showSkeleton: options.showSkeleton !== false,
            showKeypoints: options.showKeypoints !== false,
            // showPerformanceInfo: options.showPerformanceInfo !== false,
            ...options
        };
        
        // 初始化滤波器管理器
        this.filterManager = new OneEuroFilterManager(options.filterParams);
        
        // 性能统计
        this.stats = {
            frameCount: 0,
            lastStatsUpdate: 0,
            errorCount: 0,
            lastErrorTime: 0
        };
        
        // 绑定事件监听器
        this._bindEventListeners();
        
        console.log('🤖 PoseEstimator已初始化:', this.options);
    }
    

    
    /**
     * 加载姿态检测模型
     * @returns {Promise<void>}
     */
    async _loadModel() {
        try {
            console.log(`🤖 正在加载${this.options.modelType}模型...`);
            
            // 使用单例模式的TensorFlow提供器（避免重复初始化）
            const { TensorFlowProvider } = await import('../ai/models/TensorFlowProvider.js');
            this.tensorFlowProvider = TensorFlowProvider.getInstance({
                backend: this.options.backend,
                modelCacheSize: this.options.modelCacheSize
            });
            
            // 确保TensorFlow环境已初始化
            await this.tensorFlowProvider.initialize();
            
            // 使用TensorFlow提供器获取检测器
            this.detector = await this.tensorFlowProvider.getDetector(this.options.modelType);
            
            console.log(`✅ ${this.options.modelType}模型加载完成`);
            
        } catch (error) {
            throw ErrorHandler.createError('Model', ErrorHandler.handleModelError(error, this.options.modelType), error);
        }
    }
    
    /**
     * 姿态检测循环
     */
    async _detectPoseInRealTime() {
        if (!this.isRunning) return;
        
        try {
            const frameStartTime = performanceMonitor.frameStart();
            
            // 获取当前帧 - 只使用 InputSourceManager
            const currentFrame = this.inputSourceManager?.getCurrentFrame();
            
            // 检查是否有有效的帧源
            if (!currentFrame) {
                console.warn('PoseEstimator: No current frame available from InputSourceManager');
                this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
                return;
            }
            
            // 验证帧类型
            if (!this._isValidFrame(currentFrame)) {
                console.warn('PoseEstimator: Invalid frame type received:', typeof currentFrame);
                this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
                return;
            }
            
            // 清空画布
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 绘制当前帧到画布
            this.ctx.drawImage(currentFrame, 0, 0, this.canvas.width, this.canvas.height);
            
            // 姿态检测 - 使用当前帧作为输入
            const poses = await this.detector.estimatePoses(currentFrame);
            
            if (poses && poses.length > 0) {
                const pose = poses[0];
                
                // 应用One Euro Filter
                const filteredKeypoints = this.filterManager.filterPose(
                    pose.keypoints,
                    performance.now()
                );
                
                // 绘制姿态
                if (this.options.showSkeleton) {
                    this._drawSkeleton(filteredKeypoints);
                }
                
                if (this.options.showKeypoints) {
                    this._drawKeypoints(filteredKeypoints);
                }
            }
            
            // 更新性能统计
            performanceMonitor.frameEnd(frameStartTime);
            this.stats.frameCount++;
            
            // 定期输出性能日志
            const now = performance.now();
            if (now - this.stats.lastStatsUpdate > 5000) {
                performanceMonitor.logPerformance();
                this.stats.lastStatsUpdate = now;
            }
            
            // 继续下一帧
            this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
            
        } catch (error) {
            const now = performance.now();
            
            // 错误频率控制：如果错误过于频繁，停止检测
            if (now - this.stats.lastErrorTime < 1000) {
                this.stats.errorCount++;
            } else {
                this.stats.errorCount = 1;
            }
            this.stats.lastErrorTime = now;
            
            console.error('❌ 姿态检测错误:', error);
            
            // 如果错误过于频繁（1秒内超过5次），停止检测避免无限循环
            if (this.stats.errorCount > 5) {
                console.error('🚨 错误过于频繁，停止姿态检测以避免无限循环');
                this.isRunning = false;
                return;
            }
            
            // 如果是 Tensor 相关错误，尝试清理内存（但只在错误不频繁时）
            if (error.message && error.message.includes('Tensor is disposed') && this.stats.errorCount <= 2) {
                console.warn('🧹 检测到 Tensor 释放错误，清理滤波器...');
                try {
                    this.filterManager.resetFilters();
                    
                    // 强制垃圾回收 TensorFlow.js 内存
                    if (typeof tf !== 'undefined' && tf.engine) {
                        tf.engine().startScope();
                        tf.engine().endScope();
                    }
                } catch (cleanupError) {
                    console.error('清理过程中发生错误:', cleanupError);
                }
            }
            
            // 错误恢复：延迟后继续下一帧（避免立即重试）
            if (this.isRunning) {
                setTimeout(() => {
                    if (this.isRunning) {
                        this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
                    }
                }, Math.min(100 * this.stats.errorCount, 1000)); // 递增延迟，最大1秒
            }
        }
    }
    
    /**
     * 验证帧是否有效
     * @param {*} frame - 要验证的帧
     * @returns {boolean} 帧是否有效
     */
    _isValidFrame(frame) {
        return frame && (
            frame instanceof HTMLCanvasElement ||
            frame instanceof HTMLVideoElement ||
            frame instanceof HTMLImageElement
        );
    }
    
    /**
     * 绘制骨架连接
     * @param {Array} keypoints - 关键点数组
     */
    _drawSkeleton(keypoints) {
        this.ctx.strokeStyle = CONFIG.UI.SKELETON_COLOR;
        this.ctx.lineWidth = CONFIG.UI.SKELETON_LINE_WIDTH;
        
        POSE_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (startPoint && endPoint && 
                startPoint.score > CONFIG.UI.CONFIDENCE_THRESHOLD && 
                endPoint.score > CONFIG.UI.CONFIDENCE_THRESHOLD) {
                
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
    }
    
    /**
     * 绘制关键点
     * @param {Array} keypoints - 关键点数组
     */
    _drawKeypoints(keypoints) {
        keypoints.forEach((keypoint, index) => {
            if (keypoint && keypoint.score > CONFIG.UI.CONFIDENCE_THRESHOLD) {
                // 根据置信度设置颜色
                const confidence = keypoint.score;
                const alpha = Math.min(confidence * 2, 1);
                this.ctx.fillStyle = `rgba(255, 0, 0, ${alpha})`;
                
                this.ctx.beginPath();
                this.ctx.arc(keypoint.x, keypoint.y, CONFIG.UI.KEYPOINT_RADIUS, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // 绘制关键点标签（可选）
                if (this.options.showKeypointLabels) {
                    this.ctx.fillStyle = 'white';
                    this.ctx.font = '10px Arial';
                    this.ctx.fillText(
                        KEYPOINT_NAMES[index] || index,
                        keypoint.x + 5,
                        keypoint.y - 5
                    );
                }
            }
        });
    }

    
    /**
     * 启动姿态估计器
     * @returns {Promise<void>}
     */
    async start() {
        try {
            if (this.isRunning) {
                console.warn('⚠️ 姿态估计器已在运行中');
                return;
            }
            
            // 检查canvas和context
            if (!this.canvas || !this.ctx) {
                throw new Error('Canvas或Context无效');
            }
            
            // 检查输入源管理器
            if (!this.inputSourceManager) {
                throw new Error('InputSourceManager未初始化');
            }
            
            console.log('🚀 启动姿态估计器...');
            
            // 设置canvas尺寸（从输入源获取）
            const sourceDimensions = this.inputSourceManager.getSourceDimensions();
            if (sourceDimensions) {
                this.canvas.width = sourceDimensions.width;
                this.canvas.height = sourceDimensions.height;
                console.log(`📐 Canvas尺寸设置为: ${this.canvas.width}x${this.canvas.height}`);
            }
            
            // 加载模型
            await this._loadModel();
            
            // 启动性能监控
            performanceMonitor.start();
            
            // 开始检测循环
            this.isRunning = true;
            this._detectPoseInRealTime();
            
            // 发布启动成功事件
            eventBus.emit(EVENTS.POSE_STARTED, {
                modelType: this.options.modelType,
                canvasSize: {
                    width: this.canvas.width,
                    height: this.canvas.height
                },
                options: this.options
            });
            
            console.log('✅ 姿态估计器启动成功');
            
        } catch (error) {
            // 清理资源
            await this.cleanup();
            throw ErrorHandler.createError('Startup', `启动失败: ${error.message}`, error);
        }
    }
    
    /**
     * 停止姿态估计器
     * @returns {Promise<void>}
     */
    async stop() {
        console.log('🛑 停止姿态估计器...');
        
        this.isRunning = false;
        
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // 重置错误计数器
        this.stats.errorCount = 0;
        this.stats.lastErrorTime = 0;
        
        performanceMonitor.stop();
        
        // 发布停止事件
        eventBus.emit(EVENTS.POSE_STOPPED, {});
        
        console.log('✅ 姿态估计器已停止');
    }
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        await this.stop();
        
        // 清理模型
        if (this.detector) {
            try {
                if (typeof this.detector.dispose === 'function') {
                    this.detector.dispose();
                }
            } catch (error) {
                console.warn('⚠️ 模型清理失败:', error);
            }
            this.detector = null;
        }
        
        // 清理TensorFlow提供器
        if (this.tensorFlowProvider) {
            try {
                await this.tensorFlowProvider.cleanup();
            } catch (error) {
                console.warn('⚠️ TensorFlow提供器清理失败:', error);
            }
            this.tensorFlowProvider = null;
        }
        
        // 清理TensorFlow内存
        PerformanceOptimizer.cleanupTensorFlowMemory();
        
        console.log('🧹 资源清理完成');
    }
    
    /**
     * 更新滤波器参数
     * @param {Object} params - 新的滤波器参数
     */
    updateFilterParameters(params) {
        this.filterManager.updateParameters(params);
    }
    
    /**
     * 重置滤波器为默认参数
     */
    resetFilterToDefaults() {
        this.filterManager.resetToDefaults();
    }
    
    /**
     * 绑定事件监听器
     */
    _bindEventListeners() {
        // 监听输入源事件
        eventBus.on(EVENTS.INPUT_SOURCE_CHANGED, (data) => {
            console.log('📹 输入源已切换:', data.sourceType);
            // 更新canvas尺寸
            if (this.canvas && data.dimensions) {
                this.canvas.width = data.dimensions.width;
                this.canvas.height = data.dimensions.height;
                console.log(`📐 Canvas尺寸已更新: ${this.canvas.width}x${this.canvas.height}`);
            }
        });
        
        eventBus.on(EVENTS.INPUT_SOURCE_ERROR, (data) => {
            console.error('📹 输入源错误:', data.error);
            eventBus.emit(EVENTS.POSE_ERROR, {
                error: data.error,
                source: 'input_source'
            });
        });
    }
    
    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasInputSource: !!this.inputSourceManager?.isSourceActive(),
            hasDetector: !!this.detector,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            options: this.options,
            performance: performanceMonitor.getReport(),
            tensorflow: this.tensorFlowProvider ? this.tensorFlowProvider.getStats() : null,
            filter: this.filterManager.getStats(),
            inputSource: this.inputSourceManager ? {
                isActive: this.inputSourceManager.isSourceActive(),
                sourceType: this.inputSourceManager.getSourceType(),
                dimensions: this.inputSourceManager.getSourceDimensions()
            } : null
        };
    }
    
    // ========== IPoseEstimator 接口方法实现 ==========
    
    /**
     * 开始姿态检测
     * @returns {Promise<void>}
     */
    async startDetection() {
        return await this.start();
    }
    
    /**
     * 停止姿态检测
     * @returns {Promise<void>}
     */
    async stopDetection() {
        return await this.stop();
    }
    
    /**
     * 暂停姿态检测
     */
    pauseDetection() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
    }
    
    /**
     * 恢复姿态检测
     */
    resumeDetection() {
        if (!this.isRunning && this.detector && this.inputSourceManager?.isSourceActive()) {
            this.isRunning = true;
            this._detectPoseInRealTime();
        }
    }
    
    /**
     * 设置模型类型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async setModelType(modelType) {
        if (this.options.modelType === modelType) {
            return; // 已经是相同的模型类型
        }
        
        const wasRunning = this.isRunning;
        if (wasRunning) {
            await this.stop();
        }
        
        this.options.modelType = modelType;
        
        if (this.tensorFlowProvider) {
            this.detector = await this.tensorFlowProvider.getDetector(modelType);
        }
        
        if (wasRunning) {
            await this.start();
        }
    }
    
    /**
     * 获取当前模型类型
     * @returns {string} 模型类型
     */
    getCurrentModelType() {
        return this.options.modelType;
    }
    
    /**
     * 设置检测配置
     * @param {Object} config - 检测配置
     */
    setDetectionConfig(config) {
        this.options = { ...this.options, ...config };
    }
    
    /**
     * 获取检测配置
     * @returns {Object} 检测配置
     */
    getDetectionConfig() {
        return { ...this.options };
    }
    
    /**
     * 处理视频帧
     * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} input - 输入源
     * @returns {Promise<Object>} 检测结果
     */
    async processFrame(input) {
        if (!this.detector) {
            throw new Error('检测器未初始化');
        }
        
        const poses = await this.detector.estimatePoses(input);
        
        if (poses && poses.length > 0) {
            const pose = poses[0];
            const filteredKeypoints = this.filterManager.filterPose(
                pose.keypoints,
                performance.now()
            );
            
            return {
                poses: [{ ...pose, keypoints: filteredKeypoints }],
                timestamp: performance.now()
            };
        }
        
        return { poses: [], timestamp: performance.now() };
    }
    
    /**
     * 获取检测状态
     * @returns {string} 检测状态
     */
    getDetectionStatus() {
        if (!this.detector) return 'not_initialized';
        if (this.isRunning) return 'running';
        return 'stopped';
    }
    
    /**
     * 获取性能指标
     * @returns {Object} 性能指标
     */
    getPerformanceMetrics() {
        return {
            ...performanceMonitor.getReport(),
            frameCount: this.stats.frameCount,
            errorCount: this.stats.errorCount,
            tensorflow: this.tensorFlowProvider ? this.tensorFlowProvider.getStats() : null,
            filter: this.filterManager.getStats()
        };
    }
    
    /**
     * 重置性能指标
     */
    resetPerformanceMetrics() {
        performanceMonitor.reset();
        this.stats.frameCount = 0;
        this.stats.errorCount = 0;
        this.stats.lastErrorTime = 0;
        this.stats.lastStatsUpdate = 0;
    }
    
    /**
     * 设置输出画布
     * @param {HTMLCanvasElement} canvas - 输出画布
     */
    setOutputCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
    }
    
    /**
     * 启用/禁用滤波器
     * @param {boolean} enabled - 是否启用
     */
    setFilterEnabled(enabled) {
        this.filterManager.setEnabled(enabled);
    }
    
    /**
     * 设置滤波器配置
     * @param {Object} config - 滤波器配置
     */
    setFilterConfig(config) {
        this.filterManager.updateParameters(config);
    }
    
    // ========== IBaseModule 接口方法实现 ==========
    
    /**
     * 初始化模块
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('🚀 初始化姿态估计器...');
            
            // 检查输入源管理器
            if (!this.inputSourceManager) {
                throw new Error('InputSourceManager is required for initialization');
            }
            
            // 使用单例模式的TensorFlow提供器（避免重复初始化）
            const { TensorFlowProvider } = await import('../ai/models/TensorFlowProvider.js');
            this.tensorFlowProvider = TensorFlowProvider.getInstance({
                backend: this.options.backend,
                modelCacheSize: this.options.modelCacheSize
            });
            await this.tensorFlowProvider.initialize();
            
            // 发布初始化完成事件
            eventBus.emit(EVENTS.POSE_INITIALIZED, {
                modelType: this.options.modelType,
                options: this.options
            });
            
            console.log('✅ 姿态估计器初始化完成');
            
        } catch (error) {
            throw ErrorHandler.createError('Initialization', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 获取模块状态
     * @returns {string} 模块状态
     */
    getStatus() {
        if (!this.tensorFlowProvider) return 'not_initialized';
        if (this.isRunning) return 'running';
        return 'ready';
    }
    
    /**
     * 获取模块名称
     * @returns {string} 模块名称
     */
    getName() {
        return 'PoseEstimator';
    }
    
    /**
     * 获取模块版本
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 获取模块状态信息
     * @returns {Object} 状态信息
     */
    getState() {
        return {
            isRunning: this.isRunning,
            hasInputSource: !!this.inputSourceManager?.isSourceActive(),
            hasDetector: !!this.detector,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            options: this.options,
            performance: performanceMonitor.getReport(),
            tensorflow: this.tensorFlowProvider ? this.tensorFlowProvider.getStats() : null,
            filter: this.filterManager.getStats(),
            inputSource: this.inputSourceManager ? {
                isActive: this.inputSourceManager.isSourceActive(),
                sourceType: this.inputSourceManager.getSourceType(),
                dimensions: this.inputSourceManager.getSourceDimensions()
            } : null
        };
    }
    
    /**
     * 重置模块
     * @returns {Promise<void>}
     */
    async reset() {
        await this.stop();
        this.resetPerformanceMetrics();
        this.filterManager.resetFilters();
        
        // 重置选项为默认值
        this.options = {
            modelType: CONFIG.MODEL.DEFAULT_TYPE,
            showSkeleton: true,
            showKeypoints: true,
            ...this.options
        };
        
        console.log('🔄 姿态估计器已重置');
    }
    
    /**
     * 销毁模块
     * @returns {Promise<void>}
     */
    async destroy() {
        await this.cleanup();
        
        // 发布销毁事件
        eventBus.emit(EVENTS.POSE_DESTROYED, {});
        
        console.log('💥 姿态估计器已销毁');
    }
    
    /**
     * 预加载模型（静态方法）
     * @returns {Promise<void>}
     */
    static async preloadModels() {
        try {
            console.log('🔄 开始预加载模型...');
            
            // 使用单例模式的TensorFlow提供器（避免重复初始化）
            const { TensorFlowProvider } = await import('../ai/models/TensorFlowProvider.js');
            const tensorFlowProvider = TensorFlowProvider.getInstance();
            await tensorFlowProvider.initialize();
            
            const models = [
                { type: MODEL_TYPES.MOVENET },
                { type: MODEL_TYPES.POSENET }
            ];
            
            await tensorFlowProvider.batchPreloadModels(models);
            console.log('✅ 模型预加载完成');
            
        } catch (error) {
            console.warn('⚠️ 部分模型预加载失败:', error);
        }
    }
}