/**
 * OffscreenCanvas 渲染工作器
 * 将渲染操作从主线程移至 Worker，提升性能
 */

// 导入配置和常量
importScripts('../utils/constants.js');

class OffscreenRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.isInitialized = false;
        this.renderStats = {
            framesRendered: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };
        
        console.log('🎨 OffscreenRenderer 初始化');
    }

    /**
     * 初始化 OffscreenCanvas
     * @param {OffscreenCanvas} canvas - 传输过来的 OffscreenCanvas
     */
    init(canvas) {
        try {
            this.canvas = canvas;
            this.ctx = canvas.getContext('2d');
            
            if (!this.ctx) {
                throw new Error('无法获取 OffscreenCanvas 2D 上下文');
            }
            
            // 设置渲染质量
            this.ctx.imageSmoothingEnabled = true;
            this.ctx.imageSmoothingQuality = 'high';
            
            this.isInitialized = true;
            console.log('✅ OffscreenCanvas 初始化成功');
            
            return { success: true };
        } catch (error) {
            console.error('❌ OffscreenCanvas 初始化失败:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * 渲染视频帧
     * @param {ImageData} imageData - 视频帧数据
     * @param {number} width - 画布宽度
     * @param {number} height - 画布高度
     */
    renderVideoFrame(imageData, width, height) {
        if (!this.isInitialized) return;

        try {
            // 设置画布尺寸（如果需要）
            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }

            // 清空画布
            this.ctx.clearRect(0, 0, width, height);
            
            // 绘制视频帧
            this.ctx.putImageData(imageData, 0, 0);
            
        } catch (error) {
            console.error('❌ 视频帧渲染失败:', error);
        }
    }

    /**
     * 渲染姿态检测结果
     * @param {Array} poses - 姿态数组
     * @param {Object} options - 渲染选项
     */
    renderPoses(poses, options = {}) {
        if (!this.isInitialized || !poses || poses.length === 0) return;

        const startTime = performance.now();

        try {
            poses.forEach(pose => {
                if (pose.keypoints && pose.keypoints.length > 0) {
                    // 渲染骨架
                    if (options.showSkeleton) {
                        this._drawSkeleton(pose.keypoints, options);
                    }
                    
                    // 渲染关键点
                    if (options.showKeypoints) {
                        this._drawKeypoints(pose.keypoints, options);
                    }
                }
            });

            // 更新渲染统计
            const renderTime = performance.now() - startTime;
            this._updateRenderStats(renderTime);

        } catch (error) {
            console.error('❌ 姿态渲染失败:', error);
        }
    }

    /**
     * 绘制骨架连接
     * @param {Array} keypoints - 关键点数组
     * @param {Object} options - 渲染选项
     */
    _drawSkeleton(keypoints, options) {
        // 使用全局 CONFIG 或默认值
        const skeletonColor = (typeof CONFIG !== 'undefined' && CONFIG.UI) 
            ? CONFIG.UI.SKELETON_COLOR 
            : '#00ff00';
        const lineWidth = (typeof CONFIG !== 'undefined' && CONFIG.UI) 
            ? CONFIG.UI.SKELETON_LINE_WIDTH 
            : 2;
        const confidenceThreshold = (typeof CONFIG !== 'undefined' && CONFIG.UI) 
            ? CONFIG.UI.CONFIDENCE_THRESHOLD 
            : 0.3;

        this.ctx.strokeStyle = options.skeletonColor || skeletonColor;
        this.ctx.lineWidth = options.lineWidth || lineWidth;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';

        // 定义骨架连接（如果 POSE_CONNECTIONS 不可用，使用默认连接）
        const connections = (typeof POSE_CONNECTIONS !== 'undefined') 
            ? POSE_CONNECTIONS 
            : this._getDefaultConnections();

        connections.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];

            if (startPoint && endPoint && 
                startPoint.score > confidenceThreshold && 
                endPoint.score > confidenceThreshold) {
                
                // 根据置信度调整透明度
                const avgConfidence = (startPoint.score + endPoint.score) / 2;
                const alpha = Math.min(avgConfidence * 1.5, 1);
                
                this.ctx.globalAlpha = alpha;
                this.ctx.beginPath();
                this.ctx.moveTo(startPoint.x, startPoint.y);
                this.ctx.lineTo(endPoint.x, endPoint.y);
                this.ctx.stroke();
            }
        });

        this.ctx.globalAlpha = 1; // 重置透明度
    }

    /**
     * 绘制关键点
     * @param {Array} keypoints - 关键点数组
     * @param {Object} options - 渲染选项
     */
    _drawKeypoints(keypoints, options) {
        const confidenceThreshold = (typeof CONFIG !== 'undefined' && CONFIG.UI) 
            ? CONFIG.UI.CONFIDENCE_THRESHOLD 
            : 0.3;
        const keypointRadius = (typeof CONFIG !== 'undefined' && CONFIG.UI) 
            ? CONFIG.UI.KEYPOINT_RADIUS 
            : 4;

        keypoints.forEach((keypoint, index) => {
            if (keypoint && keypoint.score > confidenceThreshold) {
                // 根据置信度设置颜色和大小
                const confidence = keypoint.score;
                const alpha = Math.min(confidence * 2, 1);
                const radius = keypointRadius * (0.5 + confidence * 0.5);
                
                // 渐变颜色：低置信度为黄色，高置信度为红色
                const hue = (1 - confidence) * 60; // 60度为黄色，0度为红色
                this.ctx.fillStyle = `hsla(${hue}, 100%, 50%, ${alpha})`;
                
                // 绘制关键点
                this.ctx.beginPath();
                this.ctx.arc(keypoint.x, keypoint.y, radius, 0, 2 * Math.PI);
                this.ctx.fill();
                
                // 绘制边框
                this.ctx.strokeStyle = 'white';
                this.ctx.lineWidth = 1;
                this.ctx.stroke();
                
                // 绘制关键点标签（如果启用）
                if (options.showKeypointLabels) {
                    this._drawKeypointLabel(keypoint, index);
                }
            }
        });
    }

    /**
     * 绘制关键点标签
     * @param {Object} keypoint - 关键点
     * @param {number} index - 关键点索引
     */
    _drawKeypointLabel(keypoint, index) {
        const keypointNames = (typeof KEYPOINT_NAMES !== 'undefined') 
            ? KEYPOINT_NAMES 
            : this._getDefaultKeypointNames();

        this.ctx.fillStyle = 'white';
        this.ctx.strokeStyle = 'black';
        this.ctx.font = '10px Arial';
        this.ctx.lineWidth = 2;
        this.ctx.textAlign = 'left';
        this.ctx.textBaseline = 'bottom';

        const label = keypointNames[index] || `P${index}`;
        const x = keypoint.x + 5;
        const y = keypoint.y - 5;

        // 绘制文字边框
        this.ctx.strokeText(label, x, y);
        // 绘制文字
        this.ctx.fillText(label, x, y);
    }

    /**
     * 更新渲染统计
     * @param {number} renderTime - 渲染时间
     */
    _updateRenderStats(renderTime) {
        this.renderStats.framesRendered++;
        this.renderStats.totalRenderTime += renderTime;
        this.renderStats.averageRenderTime = this.renderStats.totalRenderTime / this.renderStats.framesRendered;
        this.renderStats.lastRenderTime = renderTime;
    }

    /**
     * 获取渲染统计
     * @returns {Object} 渲染统计信息
     */
    getRenderStats() {
        return {
            ...this.renderStats,
            fps: this.renderStats.framesRendered > 0 
                ? (1000 / this.renderStats.averageRenderTime).toFixed(1)
                : 0
        };
    }

    /**
     * 重置渲染统计
     */
    resetRenderStats() {
        this.renderStats = {
            framesRendered: 0,
            totalRenderTime: 0,
            averageRenderTime: 0,
            lastRenderTime: 0
        };
    }

    /**
     * 获取默认骨架连接（备用）
     */
    _getDefaultConnections() {
        return [
            [0, 1], [0, 2], [1, 3], [2, 4],  // 头部
            [5, 6], [5, 7], [7, 9], [6, 8], [8, 10],  // 手臂
            [5, 11], [6, 12], [11, 12],  // 躯干
            [11, 13], [13, 15], [12, 14], [14, 16]  // 腿部
        ];
    }

    /**
     * 获取默认关键点名称（备用）
     */
    _getDefaultKeypointNames() {
        return [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ];
    }
}

// 创建渲染器实例
const renderer = new OffscreenRenderer();

// 监听主线程消息
self.onmessage = function(event) {
    const { type, data } = event.data;

    try {
        switch (type) {
            case 'INIT':
                const result = renderer.init(data.canvas);
                self.postMessage({
                    type: 'INIT_RESULT',
                    data: result
                });
                break;

            case 'RENDER_FRAME':
                renderer.renderVideoFrame(data.imageData, data.width, data.height);
                break;

            case 'RENDER_POSES':
                renderer.renderPoses(data.poses, data.options);
                
                // 发送渲染完成通知（包含统计信息）
                self.postMessage({
                    type: 'RENDER_COMPLETE',
                    data: {
                        timestamp: performance.now(),
                        stats: renderer.getRenderStats()
                    }
                });
                break;

            case 'GET_STATS':
                self.postMessage({
                    type: 'STATS_RESULT',
                    data: renderer.getRenderStats()
                });
                break;

            case 'RESET_STATS':
                renderer.resetRenderStats();
                self.postMessage({
                    type: 'STATS_RESET',
                    data: { success: true }
                });
                break;

            default:
                console.warn('⚠️ 未知的消息类型:', type);
        }
    } catch (error) {
        console.error('❌ Worker 处理消息失败:', error);
        self.postMessage({
            type: 'ERROR',
            data: {
                error: error.message,
                originalType: type
            }
        });
    }
};

// Worker 错误处理
self.onerror = function(error) {
    console.error('❌ Worker 全局错误:', error);
    self.postMessage({
        type: 'ERROR',
        data: {
            error: error.message || 'Worker 发生未知错误'
        }
    });
};

console.log('🎨 RenderWorker 已启动');