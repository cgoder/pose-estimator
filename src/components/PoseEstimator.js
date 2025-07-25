import { CONFIG, POSE_CONNECTIONS, KEYPOINT_NAMES } from '../utils/constants.js';
import { ErrorHandler, EnvironmentChecker } from '../utils/errorHandling.js';
import { performanceMonitor, PerformanceOptimizer } from '../utils/performance.js';
import { adaptiveFrameController } from '../utils/adaptiveFrameController.js';
import { hybridCacheManager } from './HybridCacheManager.js';
import { OneEuroFilterManager } from './OneEuroFilterManager.js';
import { offscreenRenderManager } from '../utils/offscreenRenderManager.js';

/**
 * 姿态估计器主类
 * 负责摄像头管理、模型加载、姿态检测和渲染
 */
export class PoseEstimator {
    constructor(canvas, options = {}) {
        // 验证环境
        EnvironmentChecker.checkCanvas(canvas);
        
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.video = null;
        this.detector = null;
        this.isRunning = false;
        this.animationId = null;
        
        // 摄像头相关状态
        this.currentFacingMode = CONFIG.CAMERA.DEFAULT_FACING_MODE;
        this.isSwitchingCamera = false;
        
        // 配置选项
        this.options = {
            modelType: options.modelType || CONFIG.MODEL.DEFAULT_TYPE,
            showSkeleton: options.showSkeleton !== false,
            showKeypoints: options.showKeypoints !== false,
            enableOffscreenRender: options.enableOffscreenRender !== false, // 默认启用
            // showPerformanceInfo: options.showPerformanceInfo !== false,
            ...options
        };
        
        // 初始化滤波器管理器
        this.filterManager = new OneEuroFilterManager(options.filterParams);
        
        // 初始化自适应帧率控制器
        adaptiveFrameController.initialize().catch(error => {
            console.warn('⚠️ 自适应帧率控制器初始化失败:', error);
        });
        
        // 初始化 OffscreenCanvas 渲染管理器
        this.useOffscreenRender = false;
        if (this.options.enableOffscreenRender) {
            this._initOffscreenRender().catch(error => {
                console.warn('⚠️ OffscreenCanvas 初始化失败，将使用主线程渲染:', error);
            });
        }
        
        // 性能统计
        this.stats = {
            frameCount: 0,
            lastStatsUpdate: 0,
            errorCount: 0,
            lastErrorTime: 0
        };
        
        console.log('🤖 PoseEstimator已初始化:', this.options);
    }
    
    /**
     * 初始化 OffscreenCanvas 渲染
     * @returns {Promise<void>}
     */
    async _initOffscreenRender() {
        try {
            console.log('🎨 初始化 OffscreenCanvas 渲染...');
            
            // 检查是否支持 OffscreenCanvas
            if (!offscreenRenderManager.isSupported) {
                console.warn('⚠️ 浏览器不支持 OffscreenCanvas');
                return;
            }
            
            // 初始化 OffscreenCanvas 渲染管理器
            const success = await offscreenRenderManager.init(this.canvas);
            
            if (success) {
                this.useOffscreenRender = true;
                console.log('✅ OffscreenCanvas 渲染初始化成功');
            } else {
                console.warn('⚠️ OffscreenCanvas 渲染初始化失败');
            }
            
        } catch (error) {
            console.error('❌ OffscreenCanvas 渲染初始化错误:', error);
            this.useOffscreenRender = false;
        }
    }
    
    /**
     * 设置摄像头
     * @param {string} facingMode - 摄像头模式 ('user' 或 'environment')
     * @returns {Promise<void>}
     */
    async _setupCamera(facingMode = this.currentFacingMode) {
        try {
            console.log(`📷 正在设置摄像头 (${facingMode === 'user' ? '前置' : '后置'})...`);
            
            // 创建隐藏的video元素
            this.video = document.createElement('video');
            if (!this.video) {
                throw new Error('无法创建video元素');
            }
            
            // 设置video属性
            this.video.id = 'video';
            this.video.autoplay = true;
            this.video.muted = true;
            this.video.playsInline = true;
            
            // 多层隐藏策略
            Object.assign(this.video.style, {
                display: 'none',
                visibility: 'hidden',
                position: 'absolute',
                left: '-9999px',
                width: '1px',
                height: '1px'
            });
            
            // 添加到DOM
            document.body.appendChild(this.video);
            
            // 构建摄像头约束
            const constraints = {
                video: {
                    width: { ideal: CONFIG.CAMERA.WIDTH },
                    height: { ideal: CONFIG.CAMERA.HEIGHT },
                    facingMode: facingMode
                }
            };
            
            // 获取摄像头流
            const stream = await ErrorHandler.retry(
                () => navigator.mediaDevices.getUserMedia(constraints),
                3,
                1000
            );
            
            if (!stream) {
                throw new Error('获取摄像头流失败');
            }
            
            // 设置视频源
            this.video.srcObject = stream;
            
            // 等待视频元数据加载
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('视频元数据加载超时'));
                }, CONFIG.CAMERA.TIMEOUT);
                
                this.video.addEventListener('loadedmetadata', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                this.video.addEventListener('error', (error) => {
                    clearTimeout(timeout);
                    reject(new Error(`视频加载错误: ${error.message}`));
                }, { once: true });
            });
            
            // 开始播放视频
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('视频播放超时'));
                }, CONFIG.CAMERA.TIMEOUT);
                
                this.video.addEventListener('playing', () => {
                    clearTimeout(timeout);
                    resolve();
                }, { once: true });
                
                this.video.play().catch(reject);
            });
            
            // 等待视频就绪
            await new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('视频就绪检查超时'));
                }, CONFIG.CAMERA.TIMEOUT);
                
                const checkReady = () => {
                    if (this.video && this.video.readyState >= 2) {
                        clearTimeout(timeout);
                        resolve();
                    } else {
                        setTimeout(checkReady, 100);
                    }
                };
                
                checkReady();
            });
            
            // 设置canvas尺寸
            this.canvas.width = this.video.videoWidth || CONFIG.CAMERA.WIDTH;
            this.canvas.height = this.video.videoHeight || CONFIG.CAMERA.HEIGHT;
            
            // 更新当前摄像头模式
            this.currentFacingMode = facingMode;
            
            console.log(`📷 摄像头设置完成: ${this.canvas.width}x${this.canvas.height} (${facingMode === 'user' ? '前置' : '后置'})`);
            
        } catch (error) {
            // 清理资源
            if (this.video) {
                if (this.video.srcObject) {
                    const tracks = this.video.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
                if (this.video.parentNode) {
                    this.video.parentNode.removeChild(this.video);
                }
                this.video = null;
            }
            
            throw ErrorHandler.createError('Camera', ErrorHandler.handleCameraError(error), error);
        }
    }
    
    /**
     * 加载姿态检测模型
     * @returns {Promise<void>}
     */
    async _loadModel() {
        try {
            console.log(`🤖 正在加载${this.options.modelType}模型...`);
            
            const modelUrl = this.options.modelType === 'MoveNet' ? 
                CONFIG.MODEL.MOVENET_URL : CONFIG.MODEL.POSENET_URL;
            
            this.detector = await hybridCacheManager.getOrCreateModel(
                this.options.modelType,
                modelUrl,
                async () => {
                    if (this.options.modelType === 'MoveNet') {
                        return await poseDetection.createDetector(
                            poseDetection.SupportedModels.MoveNet,
                            {
                                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
                            }
                        );
                    } else {
                        return await poseDetection.createDetector(
                            poseDetection.SupportedModels.PoseNet,
                            {
                                quantBytes: 2,
                                architecture: 'MobileNetV1',
                                outputStride: 16,
                                inputResolution: { width: 353, height: 257 },
                                multiplier: 0.75
                            }
                        );
                    }
                }
            );
            
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
            // 检查是否应该处理当前帧（自适应帧率控制）
            if (!adaptiveFrameController.shouldProcessFrame()) {
                this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
                return;
            }
            
            const frameStartTime = performanceMonitor.frameStart();
            const inferenceStartTime = performance.now();
            
            // 检查video状态
            if (!this.video || this.video.readyState < 2) {
                this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
                return;
            }
            
            // 姿态检测
            const poses = await this.detector.estimatePoses(this.video);
            
            // 记录推理时间
            const inferenceTime = performance.now() - inferenceStartTime;
            adaptiveFrameController.recordInferenceTime(inferenceTime);
            
            // 处理姿态数据
            let processedPoses = [];
            if (poses && poses.length > 0) {
                const pose = poses[0];
                
                // 应用One Euro Filter
                const filteredKeypoints = this.filterManager.filterPose(
                    pose.keypoints,
                    performance.now()
                );
                
                processedPoses = [{
                    ...pose,
                    keypoints: filteredKeypoints
                }];
            }
            
            // 渲染帧
            await this._renderFrame(processedPoses);
            
            // 更新性能统计
            performanceMonitor.frameEnd(frameStartTime);
            this.stats.frameCount++;
            
            // 定期输出性能日志
            const now = performance.now();
            if (now - this.stats.lastStatsUpdate > 5000) {
                performanceMonitor.logPerformance();
                adaptiveFrameController.logPerformance(); // 添加帧率控制器日志
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
     * 渲染帧（支持 OffscreenCanvas 和主线程渲染）
     * @param {Array} poses - 姿态数组
     */
    async _renderFrame(poses = []) {
        try {
            if (this.useOffscreenRender && offscreenRenderManager.isAvailable()) {
                // 使用 OffscreenCanvas 渲染
                await offscreenRenderManager.renderFrame(this.video, poses, {
                    showSkeleton: this.options.showSkeleton,
                    showKeypoints: this.options.showKeypoints,
                    showKeypointLabels: this.options.showKeypointLabels
                });
            } else {
                // 使用主线程渲染（备用方案）
                this._renderFrameMainThread(poses);
            }
        } catch (error) {
            console.error('❌ 渲染帧失败:', error);
            // 如果 OffscreenCanvas 渲染失败，回退到主线程渲染
            if (this.useOffscreenRender) {
                console.warn('⚠️ OffscreenCanvas 渲染失败，回退到主线程渲染');
                this.useOffscreenRender = false;
                this._renderFrameMainThread(poses);
            }
        }
    }
    
    /**
     * 主线程渲染（备用方案）
     * @param {Array} poses - 姿态数组
     */
    _renderFrameMainThread(poses = []) {
        // 清空画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制视频帧
        this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
        
        // 绘制姿态
        if (poses && poses.length > 0) {
            const pose = poses[0];
            
            if (this.options.showSkeleton && pose.keypoints) {
                this._drawSkeleton(pose.keypoints);
            }
            
            if (this.options.showKeypoints && pose.keypoints) {
                this._drawKeypoints(pose.keypoints);
            }
        }
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
            
            console.log('🚀 启动姿态估计器...');
            
            // 设置摄像头
            await this._setupCamera();
            
            // 加载模型
            await this._loadModel();
            
            // 启动性能监控
            performanceMonitor.start();
            
            // 开始检测循环
            this.isRunning = true;
            this._detectPoseInRealTime();
            
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
        
        console.log('✅ 姿态估计器已停止');
    }
    
    /**
     * 切换摄像头（前置/后置）
     * @returns {Promise<void>}
     */
    async switchCamera() {
        if (this.isSwitchingCamera) {
            console.warn('⚠️ 摄像头切换正在进行中，请稍候...');
            return;
        }
        
        try {
            this.isSwitchingCamera = true;
            
            // 确定新的摄像头模式
            const newFacingMode = this.currentFacingMode === CONFIG.CAMERA.FACING_MODES.FRONT 
                ? CONFIG.CAMERA.FACING_MODES.BACK 
                : CONFIG.CAMERA.FACING_MODES.FRONT;
            
            console.log(`🔄 切换摄像头: ${this.currentFacingMode === 'user' ? '前置' : '后置'} → ${newFacingMode === 'user' ? '前置' : '后置'}`);
            
            // 记录当前运行状态
            const wasRunning = this.isRunning;
            
            // 暂停检测
            if (wasRunning) {
                await this.stop();
            }
            
            // 清理当前摄像头
            if (this.video) {
                if (this.video.srcObject) {
                    const tracks = this.video.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
                if (this.video.parentNode) {
                    this.video.parentNode.removeChild(this.video);
                }
                this.video = null;
            }
            
            // 设置新摄像头
            await this._setupCamera(newFacingMode);
            
            // 如果之前在运行，重新启动检测
            if (wasRunning) {
                this.isRunning = true;
                this._detectPoseInRealTime();
            }
            
            console.log(`✅ 摄像头切换完成: ${newFacingMode === 'user' ? '前置' : '后置'}`);
            
        } catch (error) {
            console.error('❌ 摄像头切换失败:', error);
            throw ErrorHandler.createError('Camera', `摄像头切换失败: ${error.message}`, error);
        } finally {
            this.isSwitchingCamera = false;
        }
    }
    
    /**
     * 获取当前摄像头模式
     * @returns {string} 当前摄像头模式
     */
    getCurrentFacingMode() {
        return this.currentFacingMode;
    }
    
    /**
     * 检查是否支持摄像头切换
     * @returns {Promise<boolean>} 是否支持摄像头切换
     */
    async checkCameraSwitchSupport() {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) {
                return false;
            }
            
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(device => device.kind === 'videoinput');
            
            // 检查是否有多个摄像头设备
            return videoDevices.length > 1;
        } catch (error) {
            console.warn('⚠️ 检查摄像头支持时出错:', error);
            return false;
        }
    }
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        await this.stop();
        
        // 清理 OffscreenCanvas 渲染管理器
        if (this.useOffscreenRender) {
            try {
                await offscreenRenderManager.cleanup();
                this.useOffscreenRender = false;
                console.log('🧹 OffscreenCanvas 渲染管理器已清理');
            } catch (error) {
                console.warn('⚠️ OffscreenCanvas 清理失败:', error);
            }
        }
        
        // 清理摄像头
        if (this.video) {
            if (this.video.srcObject) {
                const tracks = this.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
            
            if (this.video.parentNode) {
                this.video.parentNode.removeChild(this.video);
            }
            
            this.video = null;
        }
        
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
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            hasVideo: !!this.video,
            hasDetector: !!this.detector,
            canvasSize: {
                width: this.canvas.width,
                height: this.canvas.height
            },
            options: this.options,
            performance: performanceMonitor.getReport(),
            cache: hybridCacheManager.getStats(),
            filter: this.filterManager.getStats(),
            offscreenRender: {
                enabled: this.useOffscreenRender,
                supported: offscreenRenderManager.isSupported,
                available: offscreenRenderManager.isAvailable(),
                stats: offscreenRenderManager.getStats()
            }
        };
    }
    
    /**
     * 预加载模型（静态方法）
     * @returns {Promise<void>}
     */
    static async preloadModels() {
        console.log('🔄 开始预加载模型...');
        
        const modelConfigs = [
            {
                type: 'MoveNet',
                url: CONFIG.MODEL.MOVENET_URL,
                createFn: () => poseDetection.createDetector(
                    poseDetection.SupportedModels.MoveNet,
                    {
                        modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING
                    }
                )
            },
            {
                type: 'PoseNet',
                url: CONFIG.MODEL.POSENET_URL,
                createFn: () => poseDetection.createDetector(
                    poseDetection.SupportedModels.PoseNet,
                    {
                        quantBytes: 2,
                        architecture: 'MobileNetV1',
                        outputStride: 16,
                        inputResolution: { width: 353, height: 257 },
                        multiplier: 0.75
                    }
                )
            }
        ];
        
        const preloadPromises = modelConfigs.map(config => 
            hybridCacheManager.preloadModel(config.type, config.url, config.createFn)
        );
        
        try {
            await Promise.allSettled(preloadPromises);
            console.log('✅ 模型预加载完成');
        } catch (error) {
            console.warn('⚠️ 部分模型预加载失败:', error);
        }
    }
}