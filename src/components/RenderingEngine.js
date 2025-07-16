/**
 * 渲染引擎
 * 多线程渲染架构和可视化组件设计
 * 基于架构设计文档要求实现
 */

/**
 * 渲染模式枚举
 */
export const RenderMode = {
    SKELETON: 'skeleton',
    KEYPOINTS: 'keypoints',
    HEATMAP: 'heatmap',
    OVERLAY: 'overlay',
    ANALYSIS: 'analysis',
    COMPARISON: 'comparison'
};

/**
 * 渲染质量等级
 */
export const RenderQuality = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    ULTRA: 'ultra'
};

/**
 * 渲染状态枚举
 */
export const RenderStatus = {
    IDLE: 'idle',
    RENDERING: 'rendering',
    PAUSED: 'paused',
    ERROR: 'error'
};

/**
 * 可视化主题
 */
export const VisualizationTheme = {
    DEFAULT: 'default',
    DARK: 'dark',
    LIGHT: 'light',
    NEON: 'neon',
    MEDICAL: 'medical',
    SPORTS: 'sports'
};

/**
 * 渲染配置类
 */
class RenderConfig {
    constructor(config = {}) {
        this.mode = config.mode || RenderMode.SKELETON;
        this.quality = config.quality || RenderQuality.MEDIUM;
        this.theme = config.theme || VisualizationTheme.DEFAULT;
        this.fps = config.fps || 30;
        this.enableSmoothing = config.enableSmoothing !== false;
        this.enableAntiAliasing = config.enableAntiAliasing !== false;
        this.enableShadows = config.enableShadows || false;
        this.enableGlow = config.enableGlow || false;
        this.lineWidth = config.lineWidth || 2;
        this.pointRadius = config.pointRadius || 4;
        this.opacity = config.opacity || 1.0;
        this.showConfidence = config.showConfidence || false;
        this.showLabels = config.showLabels || false;
        this.showGrid = config.showGrid || false;
        this.showAxes = config.showAxes || false;
        this.backgroundColor = config.backgroundColor || 'transparent';
        this.foregroundColor = config.foregroundColor || '#00ff00';
        this.highlightColor = config.highlightColor || '#ff0000';
        this.textColor = config.textColor || '#ffffff';
        this.gridColor = config.gridColor || '#333333';
    }
}

/**
 * 渲染统计信息
 */
class RenderStats {
    constructor() {
        this.frameCount = 0;
        this.fps = 0;
        this.averageFrameTime = 0;
        this.lastFrameTime = 0;
        this.renderTime = 0;
        this.drawCalls = 0;
        this.vertexCount = 0;
        this.triangleCount = 0;
        this.memoryUsage = 0;
        this.gpuMemoryUsage = 0;
        this.startTime = performance.now();
        this.lastUpdateTime = this.startTime;
        this.frameTimeHistory = [];
    }
    
    update(frameTime) {
        this.frameCount++;
        this.lastFrameTime = frameTime;
        this.frameTimeHistory.push(frameTime);
        
        // 保持最近100帧的历史
        if (this.frameTimeHistory.length > 100) {
            this.frameTimeHistory.shift();
        }
        
        // 计算平均帧时间
        this.averageFrameTime = this.frameTimeHistory.reduce((a, b) => a + b, 0) / this.frameTimeHistory.length;
        
        // 计算FPS
        const now = performance.now();
        const deltaTime = now - this.lastUpdateTime;
        if (deltaTime >= 1000) { // 每秒更新一次FPS
            this.fps = Math.round(1000 / this.averageFrameTime);
            this.lastUpdateTime = now;
        }
    }
    
    reset() {
        this.frameCount = 0;
        this.fps = 0;
        this.averageFrameTime = 0;
        this.lastFrameTime = 0;
        this.renderTime = 0;
        this.drawCalls = 0;
        this.vertexCount = 0;
        this.triangleCount = 0;
        this.startTime = performance.now();
        this.lastUpdateTime = this.startTime;
        this.frameTimeHistory = [];
    }
}

/**
 * 渲染层抽象类
 */
class RenderLayer {
    constructor(name, zIndex = 0) {
        this.name = name;
        this.zIndex = zIndex;
        this.visible = true;
        this.opacity = 1.0;
        this.transform = {
            x: 0,
            y: 0,
            scaleX: 1,
            scaleY: 1,
            rotation: 0
        };
        this.dirty = true;
        this.canvas = null;
        this.context = null;
    }
    
    /**
     * 初始化层
     */
    initialize(width, height) {
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.context = this.canvas.getContext('2d');
        this.dirty = true;
    }
    
    /**
     * 渲染层内容
     */
    render(data, config) {
        throw new Error('render() must be implemented by subclass');
    }
    
    /**
     * 清空层
     */
    clear() {
        if (this.context) {
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        this.dirty = true;
    }
    
    /**
     * 设置变换
     */
    setTransform(transform) {
        Object.assign(this.transform, transform);
        this.dirty = true;
    }
    
    /**
     * 设置可见性
     */
    setVisible(visible) {
        this.visible = visible;
        this.dirty = true;
    }
    
    /**
     * 设置透明度
     */
    setOpacity(opacity) {
        this.opacity = Math.max(0, Math.min(1, opacity));
        this.dirty = true;
    }
    
    /**
     * 销毁层
     */
    dispose() {
        this.canvas = null;
        this.context = null;
    }
}

/**
 * 骨架渲染层
 */
class SkeletonLayer extends RenderLayer {
    constructor() {
        super('skeleton', 1);
        this.connections = [
            // 头部
            [0, 1], [0, 2], [1, 3], [2, 4],
            // 躯干
            [5, 6], [5, 11], [6, 12], [11, 12],
            // 左臂
            [5, 7], [7, 9],
            // 右臂
            [6, 8], [8, 10],
            // 左腿
            [11, 13], [13, 15],
            // 右腿
            [12, 14], [14, 16]
        ];
    }
    
    render(poses, config) {
        if (!this.context || !poses || poses.length === 0) return;
        
        this.clear();
        
        const ctx = this.context;
        ctx.save();
        
        // 应用变换
        this._applyTransform(ctx);
        
        // 设置样式
        ctx.lineWidth = config.lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.globalAlpha = this.opacity;
        
        if (config.enableAntiAliasing) {
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
        }
        
        poses.forEach((pose, index) => {
            this._renderPoseSkeleton(ctx, pose, config, index);
        });
        
        ctx.restore();
        this.dirty = false;
    }
    
    _renderPoseSkeleton(ctx, pose, config, poseIndex) {
        const keypoints = pose.keypoints;
        if (!keypoints) return;
        
        // 渲染连接线
        ctx.strokeStyle = this._getPoseColor(config, poseIndex);
        
        this.connections.forEach(([startIdx, endIdx]) => {
            const startPoint = keypoints[startIdx];
            const endPoint = keypoints[endIdx];
            
            if (startPoint && endPoint && 
                startPoint.score > config.minConfidence && 
                endPoint.score > config.minConfidence) {
                
                this._drawConnection(ctx, startPoint, endPoint, config);
            }
        });
        
        // 渲染关键点
        ctx.fillStyle = this._getPoseColor(config, poseIndex);
        keypoints.forEach((keypoint, index) => {
            if (keypoint && keypoint.score > config.minConfidence) {
                this._drawKeypoint(ctx, keypoint, config, index);
            }
        });
    }
    
    _drawConnection(ctx, startPoint, endPoint, config) {
        ctx.beginPath();
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
        
        if (config.enableGlow) {
            ctx.shadowColor = ctx.strokeStyle;
            ctx.shadowBlur = 10;
        }
        
        ctx.stroke();
        
        if (config.enableGlow) {
            ctx.shadowBlur = 0;
        }
    }
    
    _drawKeypoint(ctx, keypoint, config, index) {
        ctx.beginPath();
        ctx.arc(keypoint.x, keypoint.y, config.pointRadius, 0, 2 * Math.PI);
        
        if (config.enableGlow) {
            ctx.shadowColor = ctx.fillStyle;
            ctx.shadowBlur = 5;
        }
        
        ctx.fill();
        
        if (config.enableGlow) {
            ctx.shadowBlur = 0;
        }
        
        // 显示置信度
        if (config.showConfidence) {
            ctx.fillStyle = config.textColor;
            ctx.font = '10px Arial';
            ctx.fillText(
                keypoint.score.toFixed(2),
                keypoint.x + config.pointRadius + 2,
                keypoint.y - config.pointRadius - 2
            );
        }
        
        // 显示标签
        if (config.showLabels) {
            const label = this._getKeypointLabel(index);
            ctx.fillStyle = config.textColor;
            ctx.font = '12px Arial';
            ctx.fillText(
                label,
                keypoint.x + config.pointRadius + 2,
                keypoint.y + config.pointRadius + 12
            );
        }
    }
    
    _getPoseColor(config, poseIndex) {
        const colors = [
            config.foregroundColor,
            '#ff6b6b',
            '#4ecdc4',
            '#45b7d1',
            '#f9ca24',
            '#f0932b',
            '#eb4d4b',
            '#6c5ce7'
        ];
        return colors[poseIndex % colors.length];
    }
    
    _getKeypointLabel(index) {
        const labels = [
            'nose', 'left_eye', 'right_eye', 'left_ear', 'right_ear',
            'left_shoulder', 'right_shoulder', 'left_elbow', 'right_elbow',
            'left_wrist', 'right_wrist', 'left_hip', 'right_hip',
            'left_knee', 'right_knee', 'left_ankle', 'right_ankle'
        ];
        return labels[index] || `point_${index}`;
    }
    
    _applyTransform(ctx) {
        const t = this.transform;
        ctx.translate(t.x, t.y);
        ctx.scale(t.scaleX, t.scaleY);
        ctx.rotate(t.rotation);
    }
}

/**
 * 热力图渲染层
 */
class HeatmapLayer extends RenderLayer {
    constructor() {
        super('heatmap', 0);
        this.heatmapData = null;
        this.colorMap = this._createColorMap();
    }
    
    render(poses, config) {
        if (!this.context || !poses || poses.length === 0) return;
        
        this.clear();
        
        const ctx = this.context;
        ctx.save();
        
        this._applyTransform(ctx);
        
        // 生成热力图数据
        this._generateHeatmapData(poses, config);
        
        // 渲染热力图
        this._renderHeatmap(ctx, config);
        
        ctx.restore();
        this.dirty = false;
    }
    
    _generateHeatmapData(poses, config) {
        const width = this.canvas.width;
        const height = this.canvas.height;
        const data = new Float32Array(width * height);
        
        poses.forEach(pose => {
            pose.keypoints.forEach(keypoint => {
                if (keypoint && keypoint.score > config.minConfidence) {
                    this._addHeatmapPoint(data, width, height, keypoint.x, keypoint.y, keypoint.score);
                }
            });
        });
        
        this.heatmapData = data;
    }
    
    _addHeatmapPoint(data, width, height, x, y, intensity) {
        const radius = 20;
        const x0 = Math.max(0, Math.floor(x - radius));
        const x1 = Math.min(width - 1, Math.floor(x + radius));
        const y0 = Math.max(0, Math.floor(y - radius));
        const y1 = Math.min(height - 1, Math.floor(y + radius));
        
        for (let py = y0; py <= y1; py++) {
            for (let px = x0; px <= x1; px++) {
                const distance = Math.sqrt((px - x) ** 2 + (py - y) ** 2);
                if (distance <= radius) {
                    const falloff = 1 - (distance / radius);
                    const index = py * width + px;
                    data[index] += intensity * falloff;
                }
            }
        }
    }
    
    _renderHeatmap(ctx, config) {
        if (!this.heatmapData) return;
        
        const width = this.canvas.width;
        const height = this.canvas.height;
        const imageData = ctx.createImageData(width, height);
        const pixels = imageData.data;
        
        for (let i = 0; i < this.heatmapData.length; i++) {
            const intensity = Math.min(1, this.heatmapData[i]);
            const color = this._getHeatmapColor(intensity);
            
            const pixelIndex = i * 4;
            pixels[pixelIndex] = color.r;
            pixels[pixelIndex + 1] = color.g;
            pixels[pixelIndex + 2] = color.b;
            pixels[pixelIndex + 3] = color.a * this.opacity * 255;
        }
        
        ctx.putImageData(imageData, 0, 0);
    }
    
    _createColorMap() {
        return [
            { r: 0, g: 0, b: 255, a: 0 },     // 透明蓝
            { r: 0, g: 255, b: 255, a: 0.5 }, // 青色
            { r: 0, g: 255, b: 0, a: 0.7 },   // 绿色
            { r: 255, g: 255, b: 0, a: 0.8 }, // 黄色
            { r: 255, g: 0, b: 0, a: 1.0 }    // 红色
        ];
    }
    
    _getHeatmapColor(intensity) {
        if (intensity <= 0) {
            return { r: 0, g: 0, b: 0, a: 0 };
        }
        
        const colorMap = this.colorMap;
        const scaledIntensity = intensity * (colorMap.length - 1);
        const index = Math.floor(scaledIntensity);
        const fraction = scaledIntensity - index;
        
        if (index >= colorMap.length - 1) {
            return colorMap[colorMap.length - 1];
        }
        
        const color1 = colorMap[index];
        const color2 = colorMap[index + 1];
        
        return {
            r: Math.round(color1.r + (color2.r - color1.r) * fraction),
            g: Math.round(color1.g + (color2.g - color1.g) * fraction),
            b: Math.round(color1.b + (color2.b - color1.b) * fraction),
            a: color1.a + (color2.a - color1.a) * fraction
        };
    }
    
    _applyTransform(ctx) {
        const t = this.transform;
        ctx.translate(t.x, t.y);
        ctx.scale(t.scaleX, t.scaleY);
        ctx.rotate(t.rotation);
    }
}

/**
 * 分析结果渲染层
 */
class AnalysisLayer extends RenderLayer {
    constructor() {
        super('analysis', 2);
    }
    
    render(analysisData, config) {
        if (!this.context || !analysisData) return;
        
        this.clear();
        
        const ctx = this.context;
        ctx.save();
        
        this._applyTransform(ctx);
        
        // 渲染分析结果
        this._renderAnalysisResults(ctx, analysisData, config);
        
        ctx.restore();
        this.dirty = false;
    }
    
    _renderAnalysisResults(ctx, analysisData, config) {
        // 渲染运动轨迹
        if (analysisData.trajectory) {
            this._renderTrajectory(ctx, analysisData.trajectory, config);
        }
        
        // 渲染角度信息
        if (analysisData.angles) {
            this._renderAngles(ctx, analysisData.angles, config);
        }
        
        // 渲染质量评分
        if (analysisData.quality) {
            this._renderQualityScore(ctx, analysisData.quality, config);
        }
        
        // 渲染重复计数
        if (analysisData.repetitions) {
            this._renderRepetitionCount(ctx, analysisData.repetitions, config);
        }
        
        // 渲染建议
        if (analysisData.recommendations) {
            this._renderRecommendations(ctx, analysisData.recommendations, config);
        }
    }
    
    _renderTrajectory(ctx, trajectory, config) {
        if (!trajectory || trajectory.length < 2) return;
        
        ctx.strokeStyle = config.highlightColor;
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        
        ctx.beginPath();
        ctx.moveTo(trajectory[0].x, trajectory[0].y);
        
        for (let i = 1; i < trajectory.length; i++) {
            ctx.lineTo(trajectory[i].x, trajectory[i].y);
        }
        
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    _renderAngles(ctx, angles, config) {
        ctx.fillStyle = config.textColor;
        ctx.font = '14px Arial';
        
        angles.forEach((angle, index) => {
            const x = 20;
            const y = 30 + index * 25;
            ctx.fillText(`${angle.name}: ${angle.value.toFixed(1)}°`, x, y);
        });
    }
    
    _renderQualityScore(ctx, quality, config) {
        const x = this.canvas.width - 150;
        const y = 30;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, 140, 40);
        
        // 分数
        ctx.fillStyle = this._getQualityColor(quality.score);
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`质量: ${quality.score}/100`, x, y);
        
        // 等级
        ctx.fillStyle = config.textColor;
        ctx.font = '12px Arial';
        ctx.fillText(quality.level, x, y + 15);
    }
    
    _renderRepetitionCount(ctx, repetitions, config) {
        const x = this.canvas.width - 150;
        const y = 80;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(x - 10, y - 20, 140, 40);
        
        // 计数
        ctx.fillStyle = config.foregroundColor;
        ctx.font = 'bold 18px Arial';
        ctx.fillText(`重复: ${repetitions.count}`, x, y);
        
        // 状态
        ctx.fillStyle = config.textColor;
        ctx.font = '12px Arial';
        ctx.fillText(repetitions.phase, x, y + 15);
    }
    
    _renderRecommendations(ctx, recommendations, config) {
        if (!recommendations || recommendations.length === 0) return;
        
        const x = 20;
        let y = this.canvas.height - 100;
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - 10, y - 20, this.canvas.width - 40, 80);
        
        // 标题
        ctx.fillStyle = config.highlightColor;
        ctx.font = 'bold 14px Arial';
        ctx.fillText('建议:', x, y);
        
        // 建议内容
        ctx.fillStyle = config.textColor;
        ctx.font = '12px Arial';
        
        recommendations.slice(0, 3).forEach((recommendation, index) => {
            y += 20;
            ctx.fillText(`• ${recommendation}`, x + 10, y);
        });
    }
    
    _getQualityColor(score) {
        if (score >= 80) return '#00ff00';
        if (score >= 60) return '#ffff00';
        if (score >= 40) return '#ff8800';
        return '#ff0000';
    }
    
    _applyTransform(ctx) {
        const t = this.transform;
        ctx.translate(t.x, t.y);
        ctx.scale(t.scaleX, t.scaleY);
        ctx.rotate(t.rotation);
    }
}

/**
 * 渲染工作线程管理器
 */
class RenderWorkerManager {
    constructor(maxWorkers = 2) {
        this.maxWorkers = maxWorkers;
        this.workers = [];
        this.taskQueue = [];
        this.activeJobs = new Map();
        this.jobIdCounter = 0;
    }
    
    /**
     * 初始化工作线程
     */
    async initialize() {
        try {
            for (let i = 0; i < this.maxWorkers; i++) {
                const worker = await this._createWorker();
                this.workers.push(worker);
            }
            console.log(`渲染工作线程池初始化完成，共 ${this.workers.length} 个线程`);
        } catch (error) {
            console.warn('工作线程初始化失败，将使用主线程渲染:', error);
        }
    }
    
    /**
     * 提交渲染任务
     */
    async submitTask(taskData) {
        return new Promise((resolve, reject) => {
            const jobId = ++this.jobIdCounter;
            const job = {
                id: jobId,
                data: taskData,
                resolve,
                reject,
                timestamp: Date.now()
            };
            
            this.taskQueue.push(job);
            this._processQueue();
        });
    }
    
    /**
     * 处理任务队列
     */
    _processQueue() {
        if (this.taskQueue.length === 0) return;
        
        const availableWorker = this.workers.find(worker => !worker.busy);
        if (!availableWorker) return;
        
        const job = this.taskQueue.shift();
        this._executeJob(availableWorker, job);
    }
    
    /**
     * 执行任务
     */
    async _executeJob(worker, job) {
        worker.busy = true;
        this.activeJobs.set(job.id, job);
        
        try {
            const result = await this._sendToWorker(worker, job.data);
            job.resolve(result);
        } catch (error) {
            job.reject(error);
        } finally {
            worker.busy = false;
            this.activeJobs.delete(job.id);
            this._processQueue(); // 处理下一个任务
        }
    }
    
    /**
     * 发送任务到工作线程
     */
    _sendToWorker(worker, data) {
        return new Promise((resolve, reject) => {
            const messageId = Date.now() + Math.random();
            
            const handleMessage = (event) => {
                if (event.data.messageId === messageId) {
                    worker.removeEventListener('message', handleMessage);
                    worker.removeEventListener('error', handleError);
                    
                    if (event.data.error) {
                        reject(new Error(event.data.error));
                    } else {
                        resolve(event.data.result);
                    }
                }
            };
            
            const handleError = (error) => {
                worker.removeEventListener('message', handleMessage);
                worker.removeEventListener('error', handleError);
                reject(error);
            };
            
            worker.addEventListener('message', handleMessage);
            worker.addEventListener('error', handleError);
            
            worker.postMessage({
                messageId,
                task: data
            });
        });
    }
    
    /**
     * 创建工作线程
     */
    async _createWorker() {
        const workerCode = `
            self.addEventListener('message', function(event) {
                const { messageId, task } = event.data;
                
                try {
                    // 这里实现具体的渲染任务处理逻辑
                    const result = processRenderTask(task);
                    
                    self.postMessage({
                        messageId,
                        result
                    });
                } catch (error) {
                    self.postMessage({
                        messageId,
                        error: error.message
                    });
                }
            });
            
            function processRenderTask(task) {
                // 渲染任务处理逻辑
                switch (task.type) {
                    case 'heatmap':
                        return processHeatmap(task.data);
                    case 'analysis':
                        return processAnalysis(task.data);
                    default:
                        throw new Error('Unknown task type: ' + task.type);
                }
            }
            
            function processHeatmap(data) {
                // 热力图处理逻辑
                return { type: 'heatmap', processed: true };
            }
            
            function processAnalysis(data) {
                // 分析数据处理逻辑
                return { type: 'analysis', processed: true };
            }
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        
        worker.busy = false;
        
        return worker;
    }
    
    /**
     * 清理工作线程
     */
    cleanup() {
        this.workers.forEach(worker => {
            worker.terminate();
        });
        this.workers = [];
        this.taskQueue = [];
        this.activeJobs.clear();
    }
}

/**
 * 渲染引擎主类
 */
class RenderingEngine {
    constructor(canvas, config = {}) {
        this.name = 'RenderingEngine';
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.config = new RenderConfig(config);
        
        this.layers = new Map();
        this.layerOrder = [];
        this.stats = new RenderStats();
        this.workerManager = new RenderWorkerManager(config.maxWorkers || 2);
        
        this.status = RenderStatus.IDLE;
        this.animationId = null;
        this.lastFrameTime = 0;
        this.targetFrameTime = 1000 / this.config.fps;
        
        this.eventListeners = new Map();
        this.isInitialized = false;
        
        // 性能监控
        this.performanceMonitor = {
            enabled: config.enablePerformanceMonitoring !== false,
            frameTimeThreshold: config.frameTimeThreshold || 33, // 30fps
            memoryCheckInterval: config.memoryCheckInterval || 5000
        };
        
        this._initializeLayers();
        this._setupEventListeners();
    }
    
    /**
     * 初始化渲染引擎
     */
    async initialize() {
        if (this.isInitialized) return;
        
        try {
            console.log('正在初始化渲染引擎...');
            
            // 初始化工作线程
            await this.workerManager.initialize();
            
            // 初始化渲染层
            this._initializeRenderLayers();
            
            // 开始性能监控
            if (this.performanceMonitor.enabled) {
                this._startPerformanceMonitoring();
            }
            
            this.isInitialized = true;
            this._emitEvent('initialized', { engine: this });
            
            console.log('渲染引擎初始化完成');
            
        } catch (error) {
            console.error('渲染引擎初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 开始渲染
     */
    start() {
        if (this.status === RenderStatus.RENDERING) return;
        
        this.status = RenderStatus.RENDERING;
        this.lastFrameTime = performance.now();
        this._renderLoop();
        
        this._emitEvent('started', { engine: this });
        console.log('渲染引擎已启动');
    }
    
    /**
     * 停止渲染
     */
    stop() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        this.status = RenderStatus.IDLE;
        this._emitEvent('stopped', { engine: this });
        console.log('渲染引擎已停止');
    }
    
    /**
     * 暂停渲染
     */
    pause() {
        if (this.status === RenderStatus.RENDERING) {
            this.stop();
            this.status = RenderStatus.PAUSED;
            this._emitEvent('paused', { engine: this });
        }
    }
    
    /**
     * 恢复渲染
     */
    resume() {
        if (this.status === RenderStatus.PAUSED) {
            this.start();
        }
    }
    
    /**
     * 渲染单帧
     */
    renderFrame(data) {
        const startTime = performance.now();
        
        try {
            // 清空画布
            this._clearCanvas();
            
            // 渲染所有层
            this._renderLayers(data);
            
            // 合成最终图像
            this._compositeFrame();
            
            // 更新统计信息
            const frameTime = performance.now() - startTime;
            this.stats.update(frameTime);
            
            // 渲染调试信息
            if (this.config.showDebugInfo) {
                this._renderDebugInfo();
            }
            
        } catch (error) {
            console.error('渲染帧失败:', error);
            this.status = RenderStatus.ERROR;
            this._emitEvent('error', { error });
        }
    }
    
    /**
     * 更新配置
     */
    updateConfig(newConfig) {
        Object.assign(this.config, newConfig);
        this.targetFrameTime = 1000 / this.config.fps;
        
        // 更新层配置
        this.layers.forEach(layer => {
            if (layer.updateConfig) {
                layer.updateConfig(this.config);
            }
        });
        
        this._emitEvent('configUpdated', { config: this.config });
    }
    
    /**
     * 添加渲染层
     */
    addLayer(layer) {
        this.layers.set(layer.name, layer);
        this.layerOrder.push(layer.name);
        this.layerOrder.sort((a, b) => {
            return this.layers.get(a).zIndex - this.layers.get(b).zIndex;
        });
        
        // 初始化层
        layer.initialize(this.canvas.width, this.canvas.height);
        
        this._emitEvent('layerAdded', { layer });
    }
    
    /**
     * 移除渲染层
     */
    removeLayer(layerName) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.dispose();
            this.layers.delete(layerName);
            this.layerOrder = this.layerOrder.filter(name => name !== layerName);
            
            this._emitEvent('layerRemoved', { layerName });
        }
    }
    
    /**
     * 获取渲染层
     */
    getLayer(layerName) {
        return this.layers.get(layerName);
    }
    
    /**
     * 设置层可见性
     */
    setLayerVisible(layerName, visible) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.setVisible(visible);
        }
    }
    
    /**
     * 设置层透明度
     */
    setLayerOpacity(layerName, opacity) {
        const layer = this.layers.get(layerName);
        if (layer) {
            layer.setOpacity(opacity);
        }
    }
    
    /**
     * 获取渲染统计信息
     */
    getStats() {
        return {
            ...this.stats,
            status: this.status,
            layerCount: this.layers.size,
            config: { ...this.config }
        };
    }
    
    /**
     * 截图
     */
    captureFrame() {
        return this.canvas.toDataURL('image/png');
    }
    
    /**
     * 调整画布大小
     */
    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        
        // 重新初始化所有层
        this.layers.forEach(layer => {
            layer.initialize(width, height);
        });
        
        this._emitEvent('resized', { width, height });
    }
    
    /**
     * 添加事件监听器
     */
    addEventListener(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    
    /**
     * 清理资源
     */
    cleanup() {
        // 停止渲染
        this.stop();
        
        // 清理工作线程
        this.workerManager.cleanup();
        
        // 清理渲染层
        this.layers.forEach(layer => layer.dispose());
        this.layers.clear();
        this.layerOrder = [];
        
        // 停止性能监控
        this._stopPerformanceMonitoring();
        
        // 清理事件监听器
        this.eventListeners.clear();
        
        this.isInitialized = false;
        console.log('渲染引擎已清理');
    }
    
    // ==================== 私有方法 ====================
    
    /**
     * 初始化渲染层
     */
    _initializeLayers() {
        // 添加默认渲染层
        this.addLayer(new HeatmapLayer());
        this.addLayer(new SkeletonLayer());
        this.addLayer(new AnalysisLayer());
    }
    
    /**
     * 初始化渲染层
     */
    _initializeRenderLayers() {
        this.layers.forEach(layer => {
            layer.initialize(this.canvas.width, this.canvas.height);
        });
    }
    
    /**
     * 设置事件监听器
     */
    _setupEventListeners() {
        // 监听画布大小变化
        if (window.ResizeObserver) {
            const resizeObserver = new ResizeObserver(entries => {
                for (const entry of entries) {
                    if (entry.target === this.canvas) {
                        const { width, height } = entry.contentRect;
                        this.resize(width, height);
                    }
                }
            });
            resizeObserver.observe(this.canvas);
        }
    }
    
    /**
     * 渲染循环
     */
    _renderLoop() {
        const currentTime = performance.now();
        const deltaTime = currentTime - this.lastFrameTime;
        
        if (deltaTime >= this.targetFrameTime) {
            // 这里应该从外部获取渲染数据
            // 暂时使用空数据
            this.renderFrame({});
            this.lastFrameTime = currentTime;
        }
        
        if (this.status === RenderStatus.RENDERING) {
            this.animationId = requestAnimationFrame(() => this._renderLoop());
        }
    }
    
    /**
     * 清空画布
     */
    _clearCanvas() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 设置背景色
        if (this.config.backgroundColor !== 'transparent') {
            this.context.fillStyle = this.config.backgroundColor;
            this.context.fillRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }
    
    /**
     * 渲染所有层
     */
    _renderLayers(data) {
        this.layerOrder.forEach(layerName => {
            const layer = this.layers.get(layerName);
            if (layer && layer.visible) {
                try {
                    // 根据层类型传递相应数据
                    if (layerName === 'skeleton' && data.poses) {
                        layer.render(data.poses, this.config);
                    } else if (layerName === 'heatmap' && data.poses) {
                        layer.render(data.poses, this.config);
                    } else if (layerName === 'analysis' && data.analysis) {
                        layer.render(data.analysis, this.config);
                    }
                } catch (error) {
                    console.error(`渲染层 ${layerName} 失败:`, error);
                }
            }
        });
    }
    
    /**
     * 合成最终图像
     */
    _compositeFrame() {
        this.layerOrder.forEach(layerName => {
            const layer = this.layers.get(layerName);
            if (layer && layer.visible && layer.canvas) {
                this.context.save();
                this.context.globalAlpha = layer.opacity;
                this.context.drawImage(layer.canvas, 0, 0);
                this.context.restore();
            }
        });
    }
    
    /**
     * 渲染调试信息
     */
    _renderDebugInfo() {
        const ctx = this.context;
        const stats = this.stats;
        
        ctx.save();
        
        // 背景
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(10, 10, 200, 100);
        
        // 文本
        ctx.fillStyle = '#ffffff';
        ctx.font = '12px monospace';
        
        const lines = [
            `FPS: ${stats.fps}`,
            `Frame Time: ${stats.lastFrameTime.toFixed(2)}ms`,
            `Avg Frame Time: ${stats.averageFrameTime.toFixed(2)}ms`,
            `Frame Count: ${stats.frameCount}`,
            `Status: ${this.status}`,
            `Layers: ${this.layers.size}`
        ];
        
        lines.forEach((line, index) => {
            ctx.fillText(line, 15, 25 + index * 15);
        });
        
        ctx.restore();
    }
    
    /**
     * 开始性能监控
     */
    _startPerformanceMonitoring() {
        this.performanceMonitorInterval = setInterval(() => {
            this._checkPerformance();
        }, this.performanceMonitor.memoryCheckInterval);
    }
    
    /**
     * 停止性能监控
     */
    _stopPerformanceMonitoring() {
        if (this.performanceMonitorInterval) {
            clearInterval(this.performanceMonitorInterval);
            this.performanceMonitorInterval = null;
        }
    }
    
    /**
     * 检查性能
     */
    _checkPerformance() {
        const stats = this.stats;
        
        // 检查帧时间
        if (stats.averageFrameTime > this.performanceMonitor.frameTimeThreshold) {
            this._emitEvent('performanceWarning', {
                type: 'frameTime',
                value: stats.averageFrameTime,
                threshold: this.performanceMonitor.frameTimeThreshold
            });
        }
        
        // 检查内存使用
        if (performance.memory) {
            const memoryUsage = performance.memory.usedJSHeapSize / (1024 * 1024);
            if (memoryUsage > 100) { // 100MB
                this._emitEvent('performanceWarning', {
                    type: 'memory',
                    value: memoryUsage,
                    threshold: 100
                });
            }
        }
    }
    
    /**
     * 触发事件
     */
    _emitEvent(event, data) {
        if (this.eventListeners.has(event)) {
            this.eventListeners.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Event callback error (${event}):`, error);
                }
            });
        }
    }
}

export default RenderingEngine;
export {
    RenderConfig,
    RenderStats,
    RenderLayer,
    SkeletonLayer,
    HeatmapLayer,
    AnalysisLayer,
    RenderWorkerManager,
    RenderMode,
    RenderQuality,
    RenderStatus,
    VisualizationTheme
};