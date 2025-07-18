import { CONFIG, POSE_CONNECTIONS, KEYPOINT_NAMES } from '../utils/constants.js';
import { ErrorHandler, EnvironmentChecker } from '../utils/errorHandling.js';
import { performanceMonitor, PerformanceOptimizer } from '../utils/performance.js';
import { adaptiveFrameController } from '../utils/adaptiveFrameController.js';
import { hybridCacheManager } from './HybridCacheManager.js';
import { OneEuroFilterManager } from './OneEuroFilterManager.js';
import { offscreenRenderManager } from '../utils/offscreenRenderManager.js';
import ExerciseAnalysisEngine from './analyzers/ExerciseAnalysisEngine.js';

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
        
        // 初始化运动分析引擎
        this.exerciseEngine = new ExerciseAnalysisEngine({
            confidenceThreshold: options.exerciseConfidenceThreshold || 0.3,
            detectionSensitivity: options.exerciseDetectionSensitivity || 0.8,
            countingEnabled: options.exerciseCountingEnabled !== false,
            qualityAnalysisEnabled: options.exerciseQualityAnalysisEnabled !== false,
            ...options.exerciseOptions
        });
        
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
            
            // 为摄像头设置添加总体超时机制（15秒）
            const cameraTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('摄像头设置总体超时，请检查摄像头权限和设备状态')), 15000);
            });
            
            const cameraSetup = this._performCameraSetup(facingMode);
            
            await Promise.race([cameraSetup, cameraTimeout]);
            
            console.log(`📷 摄像头设置完成: ${this.canvas.width}x${this.canvas.height} (${facingMode === 'user' ? '前置' : '后置'})`);
            
        } catch (error) {
            // 清理摄像头流
            if (this.video && this.video.srcObject) {
                const tracks = this.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.video.srcObject = null;
            }
            
            throw ErrorHandler.createError('Camera', ErrorHandler.handleCameraError(error), error);
        }
    }
    
    /**
     * 执行摄像头设置过程
     * @param {string} facingMode - 摄像头模式
     * @returns {Promise<void>}
     */
    async _performCameraSetup(facingMode) {
        // 使用HTML中已存在的video元素
        this.video = document.getElementById('video');
        if (!this.video) {
            throw new Error('找不到video元素');
        }
        
        // 确保video元素可见
        this.video.style.display = 'block';
        this.video.style.visibility = 'visible';
        this.video.style.position = 'relative';
        
        // 设置video属性
        this.video.autoplay = true;
        this.video.muted = true;
        this.video.playsInline = true;
        
        // 构建摄像头约束
        const constraints = {
            video: {
                width: { ideal: CONFIG.CAMERA.WIDTH },
                height: { ideal: CONFIG.CAMERA.HEIGHT },
                facingMode: facingMode
            }
        };
        
        // 获取摄像头流（权限请求最容易卡住的地方）
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
        if (!this.isRunning) {
            this.animationId = null;
            return;
        }
        
        try {
            // 立即设置下一帧的animationId，确保检测循环持续运行
            this.animationId = requestAnimationFrame(() => this._detectPoseInRealTime());
            
            // 检查是否应该处理当前帧（自适应帧率控制）
            if (!adaptiveFrameController.shouldProcessFrame()) {
                return;
            }
            
            const frameStartTime = performanceMonitor.frameStart();
            const inferenceStartTime = performance.now();
            
            // 检查video状态
            if (!this.video || this.video.readyState < 2) {
                return;
            }
            
            // 姿态检测
            const poses = await this.detector.estimatePoses(this.video);
            
            // 记录推理时间
            const inferenceTime = performance.now() - inferenceStartTime;
            adaptiveFrameController.recordInferenceTime(inferenceTime);
            
            // 处理姿态数据
            let processedPoses = [];
            let exerciseAnalysis = null;
            
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
                
                // 运动分析
                try {
                    exerciseAnalysis = this.exerciseEngine.analyze(processedPoses, performance.now());
                } catch (exerciseError) {
                    console.warn('⚠️ 运动分析错误:', exerciseError);
                    exerciseAnalysis = null;
                }
            } else {
                // 没有检测到姿态时，传递空数组给运动分析引擎
                try {
                    exerciseAnalysis = this.exerciseEngine.analyze([], performance.now());
                } catch (exerciseError) {
                    console.warn('⚠️ 运动分析错误:', exerciseError);
                    exerciseAnalysis = null;
                }
            }
            
            // 渲染帧（包含运动分析结果）
            await this._renderFrame(processedPoses, exerciseAnalysis);
            
            // 更新性能统计
            performanceMonitor.frameEnd(frameStartTime);
            this.stats.frameCount++;
            
            // 定期输出性能日志
            const now = performance.now();
            if (now - this.stats.lastStatsUpdate > 5000) {
                performanceMonitor.logPerformance();
                adaptiveFrameController.logPerformance();
                this.stats.lastStatsUpdate = now;
            }
            
            // 下一帧已在方法开始时设置
            
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
                console.error('🚨 错误过于频繁，停止姿态检测');
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
            
            // 错误恢复：取消当前的animationId并延迟后重新启动
            if (this.animationId) {
                cancelAnimationFrame(this.animationId);
                this.animationId = null;
            }
            
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
     * @param {Object} exerciseAnalysis - 运动分析结果
     */
    async _renderFrame(poses = [], exerciseAnalysis = null) {
        try {
            if (this.useOffscreenRender && offscreenRenderManager.isAvailable()) {
                // 使用 OffscreenCanvas 渲染
                await offscreenRenderManager.renderFrame(this.video, poses, {
                    showSkeleton: this.options.showSkeleton,
                    showKeypoints: this.options.showKeypoints,
                    showKeypointLabels: this.options.showKeypointLabels,
                    exerciseAnalysis: exerciseAnalysis
                });
            } else {
                // 使用主线程渲染（备用方案）
                this._renderFrameMainThread(poses, exerciseAnalysis);
            }
        } catch (error) {
            console.error('❌ 渲染帧失败:', error);
            // 如果 OffscreenCanvas 渲染失败，回退到主线程渲染
            if (this.useOffscreenRender) {
                console.warn('⚠️ OffscreenCanvas 渲染失败，回退到主线程渲染');
                this.useOffscreenRender = false;
                this._renderFrameMainThread(poses, exerciseAnalysis);
            }
        }
    }
    
    /**
     * 主线程渲染（备用方案）
     * @param {Array} poses - 姿态数组
     * @param {Object} exerciseAnalysis - 运动分析结果
     */
    _renderFrameMainThread(poses = [], exerciseAnalysis = null) {
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
        
        // 绘制运动分析信息
        if (exerciseAnalysis && this.options.showExerciseInfo !== false) {
            this._drawExerciseInfo(exerciseAnalysis);
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
            
            // 为启动过程添加超时机制（30秒）
            const startTimeout = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('姿态估计器启动超时')), 30000);
            });
            
            const startProcess = this._performStart();
            
            await Promise.race([startProcess, startTimeout]);
            
            this.isRunning = true;
            console.log('✅ 姿态估计器启动成功');
            
        } catch (error) {
            // 清理资源
            await this.cleanup();
            throw ErrorHandler.createError('Startup', `启动失败: ${error.message}`, error);
        }
    }
    
    /**
     * 执行启动过程
     * @returns {Promise<void>}
     */
    async _performStart() {
        // 设置摄像头
        await this._setupCamera();
        
        // 加载模型
        await this._loadModel();
        
        // 启动性能监控
        performanceMonitor.start();
        
        // 重置动画ID和错误计数
        this.animationId = null;
        this.stats.errorCount = 0;
        this.stats.lastErrorTime = 0;
        
        // 设置运行状态为true
        this.isRunning = true;
        
        // 直接启动检测循环
        try {
            this._detectPoseInRealTime();
        } catch (error) {
            console.error('❌ 启动检测循环失败:', error);
            this.isRunning = false;
            throw error;
        }
    }
    
    /**
     * 带重试机制的检测循环启动
     * @param {number} maxRetries - 最大重试次数
     * @returns {Promise<void>}
     */
    async _startDetectionLoopWithRetry(maxRetries = 3) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 尝试启动检测循环 (第${attempt}次)...`);
                
                // 确保video元素准备就绪
                await this._waitForVideoReady();
                
                // 启动检测循环
                this._detectPoseInRealTime();
                
                // 验证检测循环是否成功启动
                await this._verifyDetectionLoopStarted();
                
                console.log('✅ 检测循环启动成功');
                return;
                
            } catch (error) {
                console.warn(`⚠️ 第${attempt}次启动检测循环失败:`, error.message);
                
                if (attempt === maxRetries) {
                    console.error('❌ 检测循环启动失败，已达到最大重试次数');
                    throw new Error(`检测循环启动失败: ${error.message}`);
                }
                
                // 等待一段时间后重试
                await new Promise(resolve => setTimeout(resolve, 500 * attempt));
            }
        }
    }
    
    /**
     * 等待video元素准备就绪
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise<void>}
     */
    async _waitForVideoReady(timeout = 5000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            
            const checkVideo = () => {
                if (!this.video) {
                    reject(new Error('Video元素不存在'));
                    return;
                }
                
                if (this.video.readyState >= 2) {
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    reject(new Error('等待video准备就绪超时'));
                    return;
                }
                
                setTimeout(checkVideo, 100);
            };
            
            checkVideo();
        });
    }
    
    /**
     * 验证检测循环是否成功启动
     * @param {number} timeout - 超时时间(毫秒)
     * @returns {Promise<void>}
     */
    async _verifyDetectionLoopStarted(timeout = 1000) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let frameCount = 0;
            
            const checkLoop = () => {
                // 检查是否有帧被处理（通过frameCount增加来判断）
                const currentFrameCount = this.stats.frameCount;
                if (currentFrameCount > frameCount) {
                    console.log('✅ 检测循环运行正常，已处理帧数:', currentFrameCount);
                    resolve();
                    return;
                }
                frameCount = currentFrameCount;
                
                // 备用验证：检查animationId是否设置
                if (this.animationId !== null) {
                    console.log('✅ 检测循环animationId已设置');
                    resolve();
                    return;
                }
                
                if (Date.now() - startTime > timeout) {
                    // 降低验证要求，只要isRunning为true就认为启动成功
                    if (this.isRunning) {
                        console.log('⚠️ animationId验证超时，但isRunning为true，认为启动成功');
                        resolve();
                        return;
                    }
                    reject(new Error('检测循环启动验证超时'));
                    return;
                }
                
                setTimeout(checkLoop, 200);
            };
            
            // 延迟开始检查，给检测循环一些启动时间
            setTimeout(checkLoop, 300);
        });
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
            
            // 清理当前摄像头流
            if (this.video && this.video.srcObject) {
                const tracks = this.video.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                this.video.srcObject = null;
            }
            
            // 设置新摄像头
            await this._setupCamera(newFacingMode);
            
            // 如果之前在运行，重新启动检测
            if (wasRunning) {
                this.isRunning = true;
                // 重置动画ID和错误计数，确保检测循环能正常重启
                this.animationId = null;
                this.stats.errorCount = 0;
                this.stats.lastErrorTime = 0;
                
                // 直接重启检测循环
                try {
                    this._detectPoseInRealTime();
                    console.log('🎬 摄像头切换后检测循环已重启');
                } catch (error) {
                    console.error('❌ 摄像头切换后检测循环重启失败:', error);
                    this.isRunning = false;
                    throw error;
                }
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
        
        // 清理摄像头流
        if (this.video && this.video.srcObject) {
            const tracks = this.video.srcObject.getTracks();
            tracks.forEach(track => track.stop());
            this.video.srcObject = null;
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
     * 绘制运动分析信息
     * @param {Object} exerciseAnalysis - 运动分析结果
     */
    _drawExerciseInfo(exerciseAnalysis) {
        if (!exerciseAnalysis) return;
        
        const padding = 20;
        const lineHeight = 25;
        let yOffset = padding;
        
        // 设置文本样式
        this.ctx.font = '16px Arial';
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.strokeStyle = 'white';
        this.ctx.lineWidth = 3;
        
        // 绘制运动类型
        if (exerciseAnalysis.exerciseType && exerciseAnalysis.exerciseType !== 'unknown') {
            const exerciseText = `运动类型: ${this._getExerciseDisplayName(exerciseAnalysis.exerciseType)}`;
            this.ctx.strokeText(exerciseText, padding, yOffset);
            this.ctx.fillStyle = '#00ff00';
            this.ctx.fillText(exerciseText, padding, yOffset);
            yOffset += lineHeight;
        }
        
        // 绘制运动状态
        if (exerciseAnalysis.exerciseState) {
            const stateText = `状态: ${this._getStateDisplayName(exerciseAnalysis.exerciseState)}`;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.strokeText(stateText, padding, yOffset);
            this.ctx.fillStyle = '#ffff00';
            this.ctx.fillText(stateText, padding, yOffset);
            yOffset += lineHeight;
        }
        
        // 绘制重复次数
        if (exerciseAnalysis.repetitionCount !== undefined) {
            const countText = `次数: ${exerciseAnalysis.repetitionCount}`;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.strokeText(countText, padding, yOffset);
            this.ctx.fillStyle = '#ff6600';
            this.ctx.fillText(countText, padding, yOffset);
            yOffset += lineHeight;
        }
        
        // 绘制置信度
        if (exerciseAnalysis.confidence !== undefined) {
            const confidenceText = `置信度: ${(exerciseAnalysis.confidence * 100).toFixed(1)}%`;
            this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            this.ctx.strokeText(confidenceText, padding, yOffset);
            this.ctx.fillStyle = '#00ffff';
            this.ctx.fillText(confidenceText, padding, yOffset);
            yOffset += lineHeight;
        }
        
        // 绘制具体分析结果
        if (exerciseAnalysis.analysis) {
            const analysis = exerciseAnalysis.analysis;
            
            // 绘制深蹲特定信息
            if (exerciseAnalysis.exerciseType === 'squat' && analysis.kneeAngle) {
                const angleText = `膝盖角度: ${analysis.kneeAngle.average.toFixed(1)}°`;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.strokeText(angleText, padding, yOffset);
                this.ctx.fillStyle = '#ff00ff';
                this.ctx.fillText(angleText, padding, yOffset);
                yOffset += lineHeight;
                
                // 绘制质量评估
                if (analysis.quality && analysis.quality.score !== undefined) {
                    const qualityText = `质量评分: ${analysis.quality.score}/100`;
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.strokeText(qualityText, padding, yOffset);
                    
                    // 根据质量评分设置颜色
                    if (analysis.quality.score >= 80) {
                        this.ctx.fillStyle = '#00ff00'; // 绿色 - 优秀
                    } else if (analysis.quality.score >= 60) {
                        this.ctx.fillStyle = '#ffff00'; // 黄色 - 良好
                    } else {
                        this.ctx.fillStyle = '#ff0000'; // 红色 - 需要改进
                    }
                    
                    this.ctx.fillText(qualityText, padding, yOffset);
                    yOffset += lineHeight;
                }
                
                // 绘制建议
                if (analysis.quality && analysis.quality.suggestions && analysis.quality.suggestions.length > 0) {
                    this.ctx.font = '14px Arial';
                    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                    this.ctx.strokeText('建议:', padding, yOffset);
                    this.ctx.fillStyle = '#ffffff';
                    this.ctx.fillText('建议:', padding, yOffset);
                    yOffset += 20;
                    
                    analysis.quality.suggestions.slice(0, 2).forEach(suggestion => {
                        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                        this.ctx.strokeText(`• ${suggestion}`, padding + 10, yOffset);
                        this.ctx.fillStyle = '#ffcccc';
                        this.ctx.fillText(`• ${suggestion}`, padding + 10, yOffset);
                        yOffset += 18;
                    });
                }
            }
        }
        
        // 绘制性能信息（右上角）
        if (exerciseAnalysis.stats) {
            const rightX = this.canvas.width - 200;
            let rightY = padding;
            
            this.ctx.font = '12px Arial';
            
            if (exerciseAnalysis.stats.averageAnalysisTime !== undefined) {
                const perfText = `分析耗时: ${exerciseAnalysis.stats.averageAnalysisTime.toFixed(1)}ms`;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.strokeText(perfText, rightX, rightY);
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(perfText, rightX, rightY);
                rightY += 18;
            }
            
            if (exerciseAnalysis.stats.historyLength !== undefined) {
                const historyText = `历史帧数: ${exerciseAnalysis.stats.historyLength}`;
                this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
                this.ctx.strokeText(historyText, rightX, rightY);
                this.ctx.fillStyle = '#cccccc';
                this.ctx.fillText(historyText, rightX, rightY);
            }
        }
    }
    
    /**
     * 获取运动类型显示名称
     * @param {string} exerciseType - 运动类型
     * @returns {string} 显示名称
     */
    _getExerciseDisplayName(exerciseType) {
        const displayNames = {
            'squat': '深蹲',
            'push_up': '俯卧撑',
            'plank': '平板支撑',
            'jumping_jack': '开合跳',
            'lunge': '弓步蹲',
            'running': '跑步',
            'walking': '走路',
            'unknown': '未知运动'
        };
        return displayNames[exerciseType] || exerciseType;
    }
    
    /**
     * 获取状态显示名称
     * @param {string} state - 状态
     * @returns {string} 显示名称
     */
    _getStateDisplayName(state) {
        const stateNames = {
            'idle': '空闲',
            'starting': '开始',
            'in_progress': '进行中',
            'completed': '完成',
            'resting': '休息',
            'standing': '站立',
            'descending': '下蹲',
            'bottom': '最低点',
            'ascending': '起立',
            'up': '上位',
            'down': '下位'
        };
        return stateNames[state] || state;
    }
    
    /**
     * 获取运动分析状态
     * @returns {Object} 运动分析状态信息
     */
    getExerciseStatus() {
        if (!this.exerciseEngine) {
            return { error: '运动分析引擎未初始化' };
        }
        
        return this.exerciseEngine.getStatus();
    }
    
    /**
     * 重置运动分析
     */
    resetExerciseAnalysis() {
        if (this.exerciseEngine) {
            this.exerciseEngine.reset();
            console.log('🔄 运动分析已重置');
        }
    }
    
    /**
     * 更新运动分析选项
     * @param {Object} options - 新的选项
     */
    updateExerciseOptions(options) {
        if (this.exerciseEngine) {
            // 重新创建运动分析引擎以应用新选项
            const currentStatus = this.exerciseEngine.getStatus();
            this.exerciseEngine = new ExerciseAnalysisEngine({
                ...currentStatus.options,
                ...options
            });
            console.log('🔄 运动分析选项已更新:', options);
        }
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
            exercise: this.getExerciseStatus(),
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
        
        // 使用较短的超时时间（15秒）避免阻塞初始化
        const preloadPromises = modelConfigs.map(config => 
            hybridCacheManager.preloadModel(config.type, config.url, config.createFn, 15000)
        );
        
        try {
            // 使用Promise.allSettled确保所有预加载尝试完成，不管成功或失败
            const results = await Promise.allSettled(preloadPromises);
            
            const successful = results.filter(r => r.status === 'fulfilled').length;
            const failed = results.filter(r => r.status === 'rejected').length;
            
            console.log(`✅ 模型预加载完成: ${successful}个成功, ${failed}个失败`);
            
            // 即使部分失败也不抛出错误，允许应用继续初始化
        } catch (error) {
            console.warn('⚠️ 模型预加载过程出错:', error);
            // 不抛出错误，允许应用继续初始化
        }
    }
}