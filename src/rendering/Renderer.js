/**
 * 渲染器模块
 * 负责在Canvas上绘制姿态检测结果，包括关键点、骨架、轨迹等
 */

import { Logger } from '../utils/Logger.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';

export class Renderer {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.logger = new Logger('Renderer');
        this.performanceMonitor = new PerformanceMonitor();
        
        // 渲染选项
        this.options = {
            // 关键点设置
            showKeypoints: true,
            keypointRadius: 4,
            keypointColor: '#00ff00',
            keypointBorderColor: '#ffffff',
            keypointBorderWidth: 2,
            
            // 骨架设置
            showSkeleton: true,
            skeletonColor: '#ff0000',
            skeletonWidth: 2,
            
            // 置信度设置
            confidenceThreshold: 0.3,
            showConfidence: false,
            confidenceTextColor: '#ffffff',
            confidenceTextSize: 12,
            
            // 轨迹设置
            showTrajectory: false,
            trajectoryLength: 30,
            trajectoryColor: '#0080ff',
            trajectoryWidth: 1,
            trajectoryFade: true,
            
            // 生物力学可视化
            showBiomechanics: false,
            angleColor: '#ffff00',
            angleTextColor: '#ffffff',
            angleTextSize: 10,
            
            // 性能优化
            enableAntialiasing: true,
            enableImageSmoothing: true,
            pixelRatio: window.devicePixelRatio || 1,
            
            // 调试选项
            showDebugInfo: false,
            debugTextColor: '#ffffff',
            debugTextSize: 12,
            
            ...options
        };
        
        // 关键点连接定义（COCO格式）
        this.connections = [
            [5, 6],   // 左肩-右肩
            [5, 7],   // 左肩-左肘
            [7, 9],   // 左肘-左腕
            [6, 8],   // 右肩-右肘
            [8, 10],  // 右肘-右腕
            [5, 11],  // 左肩-左髋
            [6, 12],  // 右肩-右髋
            [11, 12], // 左髋-右髋
            [11, 13], // 左髋-左膝
            [13, 15], // 左膝-左踝
            [12, 14], // 右髋-右膝
            [14, 16], // 右膝-右踝
            [0, 1],   // 鼻子-左眼
            [0, 2],   // 鼻子-右眼
            [1, 3],   // 左眼-左耳
            [2, 4],   // 右眼-右耳
        ];
        
        // 关键点名称
        this.keypointNames = [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ];
        
        // 轨迹历史
        this.trajectoryHistory = new Map();
        
        // 渲染统计
        this.stats = {
            frameCount: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };
        
        this.setupCanvas();
        this.logger.info('渲染器已创建', this.options);
    }
    
    /**
     * 设置Canvas
     */
    setupCanvas() {
        // 设置高DPI支持
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * this.options.pixelRatio;
        this.canvas.height = rect.height * this.options.pixelRatio;
        
        this.ctx.scale(this.options.pixelRatio, this.options.pixelRatio);
        
        // 设置渲染质量
        this.ctx.imageSmoothingEnabled = this.options.enableImageSmoothing;
        if (this.options.enableAntialiasing) {
            this.ctx.imageSmoothingQuality = 'high';
        }
        
        this.logger.debug('Canvas设置完成', {
            width: this.canvas.width,
            height: this.canvas.height,
            pixelRatio: this.options.pixelRatio
        });
    }
    
    /**
     * 渲染姿态
     * @param {Array} poses - 姿态数组
     * @param {Object} additionalData - 额外数据（轨迹、生物力学等）
     */
    render(poses, additionalData = {}) {
        const startTime = performance.now();
        
        try {
            // 清空画布
            this.clearCanvas();
            
            if (poses && poses.length > 0) {
                poses.forEach((pose, index) => {
                    this.renderPose(pose, index, additionalData);
                });
            }
            
            // 渲染额外数据
            if (additionalData.trajectory && this.options.showTrajectory) {
                this.renderTrajectory(additionalData.trajectory);
            }
            
            if (additionalData.biomechanics && this.options.showBiomechanics) {
                this.renderBiomechanics(additionalData.biomechanics);
            }
            
            // 渲染调试信息
            if (this.options.showDebugInfo) {
                this.renderDebugInfo(poses, additionalData);
            }
            
            // 更新统计信息
            const renderTime = performance.now() - startTime;
            this.updateStats(renderTime);
            
        } catch (error) {
            this.logger.error('渲染失败:', error);
        }
    }
    
    /**
     * 渲染单个姿态
     * @param {Object} pose - 姿态数据
     * @param {number} index - 姿态索引
     * @param {Object} additionalData - 额外数据
     */
    renderPose(pose, index, additionalData) {
        const { keypoints } = pose;
        
        // 过滤低置信度的关键点
        const validKeypoints = keypoints.filter(kp => 
            kp.score >= this.options.confidenceThreshold
        );
        
        if (validKeypoints.length === 0) return;
        
        // 渲染骨架
        if (this.options.showSkeleton) {
            this.renderSkeleton(validKeypoints, index);
        }
        
        // 渲染关键点
        if (this.options.showKeypoints) {
            this.renderKeypoints(validKeypoints, index);
        }
        
        // 更新轨迹历史
        if (this.options.showTrajectory) {
            this.updateTrajectoryHistory(validKeypoints, index);
        }
    }
    
    /**
     * 渲染关键点
     * @param {Array} keypoints - 关键点数组
     * @param {number} poseIndex - 姿态索引
     */
    renderKeypoints(keypoints, poseIndex) {
        keypoints.forEach((keypoint, index) => {
            const { x, y, score } = keypoint;
            
            // 根据置信度调整透明度
            const alpha = Math.min(score, 1.0);
            
            // 绘制关键点
            this.ctx.save();
            this.ctx.globalAlpha = alpha;
            
            // 绘制边框
            if (this.options.keypointBorderWidth > 0) {
                this.ctx.beginPath();
                this.ctx.arc(x, y, this.options.keypointRadius + this.options.keypointBorderWidth, 0, 2 * Math.PI);
                this.ctx.fillStyle = this.options.keypointBorderColor;
                this.ctx.fill();
            }
            
            // 绘制关键点
            this.ctx.beginPath();
            this.ctx.arc(x, y, this.options.keypointRadius, 0, 2 * Math.PI);
            this.ctx.fillStyle = this.getKeypointColor(index, poseIndex);
            this.ctx.fill();
            
            // 显示置信度
            if (this.options.showConfidence) {
                this.renderConfidenceText(x, y, score);
            }
            
            this.ctx.restore();
        });
    }
    
    /**
     * 渲染骨架
     * @param {Array} keypoints - 关键点数组
     * @param {number} poseIndex - 姿态索引
     */
    renderSkeleton(keypoints, poseIndex) {
        this.ctx.save();
        this.ctx.strokeStyle = this.getSkeletonColor(poseIndex);
        this.ctx.lineWidth = this.options.skeletonWidth;
        this.ctx.lineCap = 'round';
        
        this.connections.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (startPoint && endPoint && 
                startPoint.score >= this.options.confidenceThreshold &&
                endPoint.score >= this.options.confidenceThreshold) {
                
                // 根据置信度调整透明度
                const alpha = Math.min((startPoint.score + endPoint.score) / 2, 1.0);
                this.ctx.globalAlpha = alpha;
                
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });
        
        this.ctx.restore();
    }
    
    /**
     * 渲染轨迹
     * @param {Object} trajectoryData - 轨迹数据
     */
    renderTrajectory(trajectoryData) {
        this.trajectoryHistory.forEach((history, keypointIndex) => {
            if (history.length < 2) return;
            
            this.ctx.save();
            this.ctx.strokeStyle = this.options.trajectoryColor;
            this.ctx.lineWidth = this.options.trajectoryWidth;
            this.ctx.lineCap = 'round';
            this.ctx.lineJoin = 'round';
            
            this.ctx.beginPath();
            
            history.forEach((point, index) => {
                if (index === 0) {
                    this.ctx.moveTo(point.x, point.y);
                } else {
                    // 渐变透明度
                    if (this.options.trajectoryFade) {
                        const alpha = index / history.length;
                        this.ctx.globalAlpha = alpha;
                    }
                    
                    this.ctx.lineTo(point.x, point.y);
                }
            });
            
            this.ctx.stroke();
            this.ctx.restore();
        });
    }
    
    /**
     * 渲染生物力学数据
     * @param {Object} biomechanicsData - 生物力学数据
     */
    renderBiomechanics(biomechanicsData) {
        if (!biomechanicsData.angles) return;
        
        this.ctx.save();
        this.ctx.strokeStyle = this.options.angleColor;
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = this.options.angleTextColor;
        this.ctx.font = `${this.options.angleTextSize}px Arial`;
        this.ctx.textAlign = 'center';
        
        biomechanicsData.angles.forEach(angle => {
            const { joint, value, position } = angle;
            
            if (position) {
                // 绘制角度弧线
                this.ctx.beginPath();
                this.ctx.arc(position.x, position.y, 20, 0, (value / 180) * Math.PI);
                this.ctx.stroke();
                
                // 显示角度值
                this.ctx.fillText(
                    `${value.toFixed(1)}°`,
                    position.x,
                    position.y - 25
                );
            }
        });
        
        this.ctx.restore();
    }
    
    /**
     * 渲染置信度文本
     * @param {number} x - X坐标
     * @param {number} y - Y坐标
     * @param {number} confidence - 置信度
     */
    renderConfidenceText(x, y, confidence) {
        this.ctx.save();
        this.ctx.fillStyle = this.options.confidenceTextColor;
        this.ctx.font = `${this.options.confidenceTextSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.fillText(
            (confidence * 100).toFixed(0) + '%',
            x,
            y - this.options.keypointRadius - 5
        );
        this.ctx.restore();
    }
    
    /**
     * 渲染调试信息
     * @param {Array} poses - 姿态数组
     * @param {Object} additionalData - 额外数据
     */
    renderDebugInfo(poses, additionalData) {
        this.ctx.save();
        this.ctx.fillStyle = this.options.debugTextColor;
        this.ctx.font = `${this.options.debugTextSize}px monospace`;
        this.ctx.textAlign = 'left';
        
        let y = 20;
        const lineHeight = this.options.debugTextSize + 4;
        
        // 基本信息
        this.ctx.fillText(`姿态数量: ${poses.length}`, 10, y);
        y += lineHeight;
        
        this.ctx.fillText(`渲染时间: ${this.stats.lastRenderTime.toFixed(2)}ms`, 10, y);
        y += lineHeight;
        
        this.ctx.fillText(`平均渲染时间: ${this.stats.averageRenderTime.toFixed(2)}ms`, 10, y);
        y += lineHeight;
        
        // 姿态详细信息
        poses.forEach((pose, index) => {
            const validKeypoints = pose.keypoints.filter(kp => 
                kp.score >= this.options.confidenceThreshold
            ).length;
            
            this.ctx.fillText(
                `姿态${index}: ${validKeypoints}个关键点`,
                10, y
            );
            y += lineHeight;
        });
        
        this.ctx.restore();
    }
    
    /**
     * 更新轨迹历史
     * @param {Array} keypoints - 关键点数组
     * @param {number} poseIndex - 姿态索引
     */
    updateTrajectoryHistory(keypoints, poseIndex) {
        keypoints.forEach((keypoint, index) => {
            const key = `${poseIndex}_${index}`;
            
            if (!this.trajectoryHistory.has(key)) {
                this.trajectoryHistory.set(key, []);
            }
            
            const history = this.trajectoryHistory.get(key);
            history.push({ x: keypoint.x, y: keypoint.y, timestamp: Date.now() });
            
            // 限制历史长度
            if (history.length > this.options.trajectoryLength) {
                history.shift();
            }
        });
    }
    
    /**
     * 获取关键点颜色
     * @param {number} keypointIndex - 关键点索引
     * @param {number} poseIndex - 姿态索引
     * @returns {string} 颜色值
     */
    getKeypointColor(keypointIndex, poseIndex) {
        // 可以根据关键点类型或姿态索引返回不同颜色
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00',
            '#ff00ff', '#00ffff', '#ffa500', '#800080'
        ];
        
        return colors[poseIndex % colors.length] || this.options.keypointColor;
    }
    
    /**
     * 获取骨架颜色
     * @param {number} poseIndex - 姿态索引
     * @returns {string} 颜色值
     */
    getSkeletonColor(poseIndex) {
        const colors = [
            '#ff0000', '#00ff00', '#0000ff', '#ffff00',
            '#ff00ff', '#00ffff', '#ffa500', '#800080'
        ];
        
        return colors[poseIndex % colors.length] || this.options.skeletonColor;
    }
    
    /**
     * 清空画布
     */
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    /**
     * 更新渲染选项
     * @param {Object} newOptions - 新选项
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        this.logger.debug('渲染选项已更新', this.options);
    }
    
    /**
     * 重置轨迹历史
     */
    resetTrajectory() {
        this.trajectoryHistory.clear();
        this.logger.debug('轨迹历史已重置');
    }
    
    /**
     * 更新统计信息
     * @param {number} renderTime - 渲染时间
     */
    updateStats(renderTime) {
        this.stats.frameCount++;
        this.stats.totalRenderTime += renderTime;
        this.stats.lastRenderTime = renderTime;
        this.stats.averageRenderTime = this.stats.totalRenderTime / this.stats.frameCount;
        
        this.performanceMonitor.recordFrame(renderTime, 1000 / renderTime);
    }
    
    /**
     * 获取渲染统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            performanceMetrics: this.performanceMonitor.getMetrics()
        };
    }
    
    /**
     * 截图
     * @param {string} format - 图片格式
     * @param {number} quality - 图片质量
     * @returns {string} 图片数据URL
     */
    screenshot(format = 'image/png', quality = 0.92) {
        return this.canvas.toDataURL(format, quality);
    }
    
    /**
     * 调整Canvas大小
     * @param {number} width - 新宽度
     * @param {number} height - 新高度
     */
    resize(width, height) {
        this.canvas.style.width = width + 'px';
        this.canvas.style.height = height + 'px';
        this.setupCanvas();
        this.logger.debug('Canvas大小已调整', { width, height });
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.trajectoryHistory.clear();
        this.performanceMonitor.dispose();
        this.logger.info('渲染器资源已清理');
    }
}

export default Renderer;