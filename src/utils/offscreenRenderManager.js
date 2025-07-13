/**
 * OffscreenCanvas 渲染管理器
 * 管理 OffscreenCanvas Worker 的通信和渲染任务
 */

export class OffscreenRenderManager {
    constructor() {
        this.worker = null;
        this.canvas = null;
        this.offscreenCanvas = null;
        this.isInitialized = false;
        this.isSupported = false;
        this.renderQueue = [];
        this.isProcessing = false;
        
        // 性能统计
        this.stats = {
            totalFrames: 0,
            successfulRenders: 0,
            failedRenders: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            workerInitTime: 0
        };
        
        // 检查浏览器支持
        this._checkSupport();
        
        console.log('🎨 OffscreenRenderManager 创建完成');
    }

    /**
     * 检查浏览器对 OffscreenCanvas 的支持
     */
    _checkSupport() {
        this.isSupported = (
            typeof OffscreenCanvas !== 'undefined' &&
            typeof Worker !== 'undefined' &&
            OffscreenCanvas.prototype.transferControlToOffscreen
        );
        
        if (this.isSupported) {
            console.log('✅ 浏览器支持 OffscreenCanvas');
        } else {
            console.warn('⚠️ 浏览器不支持 OffscreenCanvas，将使用主线程渲染');
        }
    }

    /**
     * 初始化 OffscreenCanvas 渲染
     * @param {HTMLCanvasElement} canvas - 主画布元素
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async init(canvas) {
        if (!this.isSupported) {
            console.warn('⚠️ OffscreenCanvas 不支持，跳过初始化');
            return false;
        }

        try {
            const startTime = performance.now();
            
            this.canvas = canvas;
            
            // 创建 OffscreenCanvas
            this.offscreenCanvas = canvas.transferControlToOffscreen();
            
            // 创建 Worker
            this.worker = new Worker('/src/workers/renderWorker.js');
            
            // 设置 Worker 消息处理
            this._setupWorkerHandlers();
            
            // 初始化 Worker
            const initResult = await this._initWorker();
            
            if (initResult.success) {
                this.isInitialized = true;
                this.stats.workerInitTime = performance.now() - startTime;
                console.log(`✅ OffscreenCanvas 初始化成功 (${this.stats.workerInitTime.toFixed(1)}ms)`);
                return true;
            } else {
                throw new Error(initResult.error || '初始化失败');
            }
            
        } catch (error) {
            console.error('❌ OffscreenCanvas 初始化失败:', error);
            await this.cleanup();
            return false;
        }
    }

    /**
     * 设置 Worker 消息处理器
     */
    _setupWorkerHandlers() {
        this.worker.onmessage = (event) => {
            const { type, data } = event.data;
            
            switch (type) {
                case 'INIT_RESULT':
                    this._resolveInit(data);
                    break;
                    
                case 'RENDER_COMPLETE':
                    this._handleRenderComplete(data);
                    break;
                    
                case 'STATS_RESULT':
                    this._handleStatsResult(data);
                    break;
                    
                case 'ERROR':
                    this._handleWorkerError(data);
                    break;
                    
                default:
                    console.warn('⚠️ 未知的 Worker 消息类型:', type);
            }
        };

        this.worker.onerror = (error) => {
            console.error('❌ Worker 错误:', error);
            this.stats.failedRenders++;
        };
    }

    /**
     * 初始化 Worker
     * @returns {Promise<Object>} 初始化结果
     */
    _initWorker() {
        return new Promise((resolve) => {
            this._resolveInit = resolve;
            
            this.worker.postMessage({
                type: 'INIT',
                data: {
                    canvas: this.offscreenCanvas
                }
            }, [this.offscreenCanvas]);
        });
    }

    /**
     * 渲染视频帧和姿态
     * @param {HTMLVideoElement} video - 视频元素
     * @param {Array} poses - 姿态数组
     * @param {Object} options - 渲染选项
     */
    async renderFrame(video, poses = [], options = {}) {
        if (!this.isInitialized) {
            console.warn('⚠️ OffscreenCanvas 未初始化，跳过渲染');
            return false;
        }

        try {
            const startTime = performance.now();
            
            // 获取视频帧数据
            const imageData = this._getVideoFrameData(video);
            
            if (!imageData) {
                console.warn('⚠️ 无法获取视频帧数据');
                return false;
            }

            // 发送渲染任务到 Worker
            this.worker.postMessage({
                type: 'RENDER_FRAME',
                data: {
                    imageData: imageData,
                    width: video.videoWidth || this.canvas.width,
                    height: video.videoHeight || this.canvas.height
                }
            });

            // 如果有姿态数据，也发送渲染
            if (poses && poses.length > 0) {
                this.worker.postMessage({
                    type: 'RENDER_POSES',
                    data: {
                        poses: poses,
                        options: {
                            showSkeleton: options.showSkeleton !== false,
                            showKeypoints: options.showKeypoints !== false,
                            showKeypointLabels: options.showKeypointLabels || false,
                            skeletonColor: options.skeletonColor,
                            lineWidth: options.lineWidth
                        }
                    }
                });
            }

            this.stats.totalFrames++;
            this.stats.lastRenderTime = performance.now() - startTime;
            
            return true;
            
        } catch (error) {
            console.error('❌ 渲染帧失败:', error);
            this.stats.failedRenders++;
            return false;
        }
    }

    /**
     * 获取视频帧数据
     * @param {HTMLVideoElement} video - 视频元素
     * @returns {ImageData|null} 图像数据
     */
    _getVideoFrameData(video) {
        try {
            // 创建临时画布来获取视频帧数据
            const tempCanvas = document.createElement('canvas');
            const tempCtx = tempCanvas.getContext('2d');
            
            tempCanvas.width = video.videoWidth || this.canvas.width;
            tempCanvas.height = video.videoHeight || this.canvas.height;
            
            tempCtx.drawImage(video, 0, 0, tempCanvas.width, tempCanvas.height);
            
            const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
            
            // 清理临时画布
            tempCanvas.width = 0;
            tempCanvas.height = 0;
            
            return imageData;
            
        } catch (error) {
            console.error('❌ 获取视频帧数据失败:', error);
            return null;
        }
    }

    /**
     * 处理渲染完成事件
     * @param {Object} data - 渲染完成数据
     */
    _handleRenderComplete(data) {
        this.stats.successfulRenders++;
        
        // 更新平均渲染时间
        if (this.stats.successfulRenders > 0) {
            this.stats.averageRenderTime = (
                (this.stats.averageRenderTime * (this.stats.successfulRenders - 1) + 
                 (data.timestamp - this.stats.lastRenderTime)) / this.stats.successfulRenders
            );
        }
    }

    /**
     * 处理统计结果
     * @param {Object} data - 统计数据
     */
    _handleStatsResult(data) {
        // 可以在这里处理来自 Worker 的统计数据
        console.log('📊 Worker 渲染统计:', data);
    }

    /**
     * 处理 Worker 错误
     * @param {Object} data - 错误数据
     */
    _handleWorkerError(data) {
        console.error('❌ Worker 渲染错误:', data.error);
        this.stats.failedRenders++;
    }

    /**
     * 获取渲染统计
     * @returns {Object} 统计信息
     */
    getStats() {
        const successRate = this.stats.totalFrames > 0 
            ? ((this.stats.successfulRenders / this.stats.totalFrames) * 100).toFixed(1)
            : 0;

        return {
            ...this.stats,
            isSupported: this.isSupported,
            isInitialized: this.isInitialized,
            successRate: `${successRate}%`,
            fps: this.stats.averageRenderTime > 0 
                ? (1000 / this.stats.averageRenderTime).toFixed(1)
                : 0
        };
    }

    /**
     * 重置统计
     */
    resetStats() {
        this.stats = {
            totalFrames: 0,
            successfulRenders: 0,
            failedRenders: 0,
            averageRenderTime: 0,
            lastRenderTime: 0,
            workerInitTime: this.stats.workerInitTime // 保留初始化时间
        };

        if (this.worker) {
            this.worker.postMessage({ type: 'RESET_STATS' });
        }
    }

    /**
     * 检查是否可用
     * @returns {boolean} 是否可用
     */
    isAvailable() {
        return this.isSupported && this.isInitialized;
    }

    /**
     * 清理资源
     */
    async cleanup() {
        console.log('🧹 清理 OffscreenCanvas 资源...');
        
        this.isInitialized = false;
        
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        
        this.offscreenCanvas = null;
        this.canvas = null;
        this.renderQueue = [];
        
        console.log('✅ OffscreenCanvas 资源清理完成');
    }
}

// 创建全局实例
export const offscreenRenderManager = new OffscreenRenderManager();

// 默认导出
export default offscreenRenderManager;