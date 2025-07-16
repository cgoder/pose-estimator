/**
 * 姿态估计器核心模块
 * 负责姿态检测、滤波处理和结果输出
 */

import * as tf from '@tensorflow/tfjs';
import * as poseDetection from '@tensorflow-models/pose-detection';
import { FilterManager } from './FilterManager.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { Logger } from '../utils/Logger.js';

export class PoseEstimator {
    constructor(options = {}) {
        this.options = {
            modelType: 'MoveNet',
            modelConfig: {
                modelType: poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
                enableSmoothing: true,
                multiPoseMaxDimension: 256,
                enableTracking: true,
                trackerType: poseDetection.TrackerType.BoundingBox
            },
            enableFilter: true,
            filterConfig: {
                frequency: 30,
                minCutoff: 1.0,
                beta: 0.007,
                derivateCutoff: 1.0
            },
            confidenceThreshold: 0.3,
            maxPoses: 1,
            flipHorizontal: false,
            ...options
        };
        
        this.detector = null;
        this.filterManager = null;
        this.performanceMonitor = new PerformanceMonitor();
        this.logger = new Logger('PoseEstimator');
        
        this.isInitialized = false;
        this.isDetecting = false;
        this.frameCount = 0;
        this.lastDetectionTime = 0;
        
        // 统计信息
        this.stats = {
            totalFrames: 0,
            successfulDetections: 0,
            averageConfidence: 0,
            averageFPS: 0,
            averageLatency: 0
        };
        
        // 事件回调
        this.onPoseDetected = null;
        this.onError = null;
        this.onPerformanceUpdate = null;
        
        this.logger.info('姿态估计器已创建', this.options);
    }
    
    /**
     * 初始化姿态估计器
     */
    async initialize() {
        try {
            this.logger.info('开始初始化姿态估计器...');
            
            // 创建检测器
            await this.createDetector();
            
            // 初始化滤波管理器
            if (this.options.enableFilter) {
                this.filterManager = new FilterManager(this.options.filterConfig);
                this.logger.info('滤波管理器已初始化');
            }
            
            this.isInitialized = true;
            this.logger.info('姿态估计器初始化完成');
            
        } catch (error) {
            this.logger.error('姿态估计器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 创建姿态检测器
     */
    async createDetector() {
        try {
            const modelConfig = { ...this.options.modelConfig };
            
            switch (this.options.modelType) {
                case 'MoveNet':
                    this.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.MoveNet,
                        modelConfig
                    );
                    break;
                    
                case 'PoseNet':
                    this.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.PoseNet,
                        {
                            quantBytes: 4,
                            architecture: 'MobileNetV1',
                            outputStride: 16,
                            inputResolution: { width: 640, height: 480 },
                            multiplier: 0.75,
                            ...modelConfig
                        }
                    );
                    break;
                    
                case 'BlazePose':
                    this.detector = await poseDetection.createDetector(
                        poseDetection.SupportedModels.BlazePose,
                        {
                            runtime: 'mediapipe',
                            enableSmoothing: true,
                            modelType: 'full',
                            ...modelConfig
                        }
                    );
                    break;
                    
                default:
                    throw new Error(`不支持的模型类型: ${this.options.modelType}`);
            }
            
            this.logger.info(`${this.options.modelType} 检测器创建成功`);
            
        } catch (error) {
            this.logger.error('创建检测器失败:', error);
            throw error;
        }
    }
    
    /**
     * 检测姿态
     * @param {HTMLVideoElement|HTMLCanvasElement|ImageData} input - 输入图像
     * @returns {Promise<Array>} 检测到的姿态数组
     */
    async detectPoses(input) {
        if (!this.isInitialized || !this.detector) {
            throw new Error('姿态估计器未初始化');
        }
        
        const startTime = performance.now();
        
        try {
            this.isDetecting = true;
            
            // 执行姿态检测
            let poses = await this.detector.estimatePoses(input, {
                maxPoses: this.options.maxPoses,
                flipHorizontal: this.options.flipHorizontal,
                scoreThreshold: this.options.confidenceThreshold
            });
            
            // 过滤低置信度的关键点
            poses = this.filterLowConfidencePoses(poses);
            
            // 应用滤波
            if (this.filterManager && poses.length > 0) {
                poses = this.filterManager.filter(poses);
            }
            
            // 更新统计信息
            const processingTime = performance.now() - startTime;
            this.updateStats(poses, processingTime);
            
            // 触发回调
            if (this.onPoseDetected) {
                this.onPoseDetected({
                    poses,
                    timestamp: Date.now(),
                    frameCount: this.frameCount,
                    processingTime,
                    fps: this.calculateFPS(),
                    averageConfidence: this.calculateAverageConfidence(poses)
                });
            }
            
            this.frameCount++;
            this.lastDetectionTime = performance.now();
            
            return poses;
            
        } catch (error) {
            this.logger.error('姿态检测失败:', error);
            
            if (this.onError) {
                this.onError(error);
            }
            
            throw error;
            
        } finally {
            this.isDetecting = false;
        }
    }
    
    /**
     * 过滤低置信度的姿态
     */
    filterLowConfidencePoses(poses) {
        return poses.map(pose => ({
            ...pose,
            keypoints: pose.keypoints.filter(kp => 
                kp.score >= this.options.confidenceThreshold
            )
        })).filter(pose => pose.keypoints.length > 0);
    }
    
    /**
     * 计算平均置信度
     */
    calculateAverageConfidence(poses) {
        if (poses.length === 0) return 0;
        
        let totalScore = 0;
        let totalKeypoints = 0;
        
        poses.forEach(pose => {
            pose.keypoints.forEach(kp => {
                totalScore += kp.score;
                totalKeypoints++;
            });
        });
        
        return totalKeypoints > 0 ? totalScore / totalKeypoints : 0;
    }
    
    /**
     * 计算FPS
     */
    calculateFPS() {
        const now = performance.now();
        const timeDiff = now - this.lastDetectionTime;
        return timeDiff > 0 ? 1000 / timeDiff : 0;
    }
    
    /**
     * 更新统计信息
     */
    updateStats(poses, processingTime) {
        this.stats.totalFrames++;
        
        if (poses.length > 0) {
            this.stats.successfulDetections++;
        }
        
        // 计算移动平均
        const alpha = 0.1; // 平滑因子
        
        const currentFPS = this.calculateFPS();
        this.stats.averageFPS = this.stats.averageFPS * (1 - alpha) + currentFPS * alpha;
        
        this.stats.averageLatency = this.stats.averageLatency * (1 - alpha) + processingTime * alpha;
        
        const currentConfidence = this.calculateAverageConfidence(poses);
        this.stats.averageConfidence = this.stats.averageConfidence * (1 - alpha) + currentConfidence * alpha;
        
        // 性能监控
        this.performanceMonitor.recordFrame(processingTime, currentFPS);
        
        // 触发性能更新回调
        if (this.onPerformanceUpdate && this.frameCount % 30 === 0) {
            this.onPerformanceUpdate({
                ...this.stats,
                currentFPS,
                currentLatency: processingTime,
                memoryUsage: this.getMemoryUsage()
            });
        }
    }
    
    /**
     * 获取内存使用情况
     */
    getMemoryUsage() {
        if (performance.memory) {
            return {
                used: Math.round(performance.memory.usedJSHeapSize / 1024 / 1024),
                total: Math.round(performance.memory.totalJSHeapSize / 1024 / 1024),
                limit: Math.round(performance.memory.jsHeapSizeLimit / 1024 / 1024)
            };
        }
        return null;
    }
    
    /**
     * 更改模型类型
     */
    async changeModel(modelType, modelConfig = {}) {
        try {
            this.logger.info(`切换到模型: ${modelType}`);
            
            // 清理当前检测器
            if (this.detector) {
                this.detector.dispose();
                this.detector = null;
            }
            
            // 更新配置
            this.options.modelType = modelType;
            this.options.modelConfig = { ...this.options.modelConfig, ...modelConfig };
            
            // 重新创建检测器
            await this.createDetector();
            
            // 重置统计信息
            this.resetStats();
            
            this.logger.info('模型切换完成');
            
        } catch (error) {
            this.logger.error('模型切换失败:', error);
            throw error;
        }
    }
    
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        this.options = { ...this.options, ...newConfig };
        
        // 更新滤波器配置
        if (this.filterManager && newConfig.filterConfig) {
            this.filterManager.updateConfig(newConfig.filterConfig);
        }
        
        this.logger.info('配置已更新', this.options);
    }
    
    /**
     * 启用/禁用滤波
     */
    toggleFilter(enabled) {
        this.options.enableFilter = enabled;
        
        if (enabled && !this.filterManager) {
            this.filterManager = new FilterManager(this.options.filterConfig);
        } else if (!enabled && this.filterManager) {
            this.filterManager.reset();
        }
        
        this.logger.info(`滤波器${enabled ? '已启用' : '已禁用'}`);
    }
    
    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            totalFrames: 0,
            successfulDetections: 0,
            averageConfidence: 0,
            averageFPS: 0,
            averageLatency: 0
        };
        
        this.frameCount = 0;
        this.performanceMonitor.reset();
        
        this.logger.info('统计信息已重置');
    }
    
    /**
     * 获取状态信息
     */
    getStatus() {
        return {
            isInitialized: this.isInitialized,
            isDetecting: this.isDetecting,
            modelType: this.options.modelType,
            filterEnabled: this.options.enableFilter,
            frameCount: this.frameCount,
            stats: { ...this.stats },
            memoryUsage: this.getMemoryUsage(),
            performanceMetrics: this.performanceMonitor.getMetrics()
        };
    }
    
    /**
     * 暂停检测
     */
    pause() {
        this.isDetecting = false;
        this.logger.info('姿态检测已暂停');
    }
    
    /**
     * 恢复检测
     */
    resume() {
        this.isDetecting = false; // 将在下次调用detectPoses时自动设为true
        this.logger.info('姿态检测已恢复');
    }
    
    /**
     * 清理资源
     */
    dispose() {
        try {
            if (this.detector) {
                this.detector.dispose();
                this.detector = null;
            }
            
            if (this.filterManager) {
                this.filterManager.dispose();
                this.filterManager = null;
            }
            
            this.performanceMonitor.dispose();
            
            this.isInitialized = false;
            this.isDetecting = false;
            
            this.logger.info('姿态估计器资源已清理');
            
        } catch (error) {
            this.logger.error('清理资源时出错:', error);
        }
    }
}

export default PoseEstimator;