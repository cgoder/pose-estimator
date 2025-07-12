/**
 * Web Workers支持模块
 * 将TensorFlow.js推理计算移到Web Worker中，避免阻塞主线程
 */
import { eventBus } from '../core/EventBus.js';
/**
 * TensorFlow.js Worker管理器实现
 */
export class TensorFlowWorkerManager {
    constructor() {
        this.worker = null;
        this.isWorkerReady = false;
        this.pendingRequests = new Map();
        this.requestId = 0;
        this.isSupported = true;
        this.isInitialized = false;
        this.eventListeners = new Map();
        this.isSupported = typeof Worker !== 'undefined';
    }
    /**
     * 添加事件监听器
     */
    on(event, callback) {
        if (!this.eventListeners.has(event)) {
            this.eventListeners.set(event, []);
        }
        this.eventListeners.get(event).push(callback);
    }
    /**
     * 移除事件监听器
     */
    off(event, callback) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            const index = listeners.indexOf(callback);
            if (index > -1) {
                listeners.splice(index, 1);
            }
        }
    }
    /**
     * 触发事件
     */
    emit(event, data) {
        const listeners = this.eventListeners.get(event);
        if (listeners) {
            listeners.forEach(callback => callback(data));
        }
    }
    /**
     * 初始化Worker
     */
    async initialize() {
        if (this.isInitialized)
            return;
        if (!this.isSupported) {
            throw new Error('Web Workers are not supported in this environment');
        }
        try {
            console.log('🔧 开始初始化 Worker...');
            // 创建Worker - 使用编译后的 JS 文件（经典脚本模式）
            this.worker = new Worker(new URL('./pose-worker-simple.js', import.meta.url));
            // 设置消息处理
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            this.worker.onerror = this.handleWorkerError.bind(this);
            // 等待Worker初始化完成，使用较短的超时时间
            console.log('⏳ 等待 Worker 初始化响应...');
            await this.sendMessage({ type: 'initialize' }, 10000); // 10秒超时
            this.isWorkerReady = true;
            this.isInitialized = true;
            console.log('✅ Worker 初始化成功');
            this.emit('initialized');
        }
        catch (error) {
            console.warn('⚠️ Worker 初始化失败，将使用主线程回退:', error);
            // 清理失败的 Worker
            if (this.worker) {
                this.worker.terminate();
                this.worker = null;
            }
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 加载模型
     */
    async loadModel(modelType, config) {
        if (!this.isInitialized) {
            await this.initialize();
        }
        if (!this.isReady()) {
            throw new Error('Worker未初始化');
        }
        try {
            await this.sendMessage({
                type: 'loadModel',
                payload: { modelType, config }
            });
            this.emit('modelLoaded', { modelType });
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 执行推理
     */
    async predict(imageData) {
        if (!this.isReady()) {
            throw new Error('Worker未就绪');
        }
        try {
            const response = await this.sendMessage({
                type: 'predict',
                payload: { imageData }
            });
            return response.result;
        }
        catch (error) {
            this.emit('error', error);
            throw error;
        }
    }
    /**
     * 检查Worker是否就绪
     */
    isReady() {
        return this.isWorkerReady && this.worker !== null;
    }
    /**
     * 释放Worker资源
     */
    dispose() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isWorkerReady = false;
        this.isInitialized = false;
        this.pendingRequests.clear();
        this.eventListeners.clear();
    }
    /**
     * 发送消息到Worker
     */
    async sendMessage(message, timeout = 30000) {
        return new Promise((resolve, reject) => {
            if (!this.worker) {
                reject(new Error('Worker不可用'));
                return;
            }
            const id = (++this.requestId).toString();
            this.pendingRequests.set(id, { resolve, reject });
            // 设置超时
            const timeoutId = setTimeout(() => {
                if (this.pendingRequests.has(id)) {
                    this.pendingRequests.delete(id);
                    console.error(`⏰ Worker请求超时 (${timeout}ms):`, message.type);
                    reject(new Error(`Worker请求超时: ${message.type}`));
                }
            }, timeout);
            // 保存超时ID以便清理
            this.pendingRequests.get(id).timeoutId = timeoutId;
            this.worker.postMessage({ ...message, id });
        });
    }
    /**
     * 处理Worker消息
     */
    handleWorkerMessage(event) {
        const { id, payload, error } = event.data;
        if (id && this.pendingRequests.has(id)) {
            const request = this.pendingRequests.get(id);
            const { resolve, reject, timeoutId } = request;
            // 清理超时定时器
            if (timeoutId) {
                clearTimeout(timeoutId);
            }
            this.pendingRequests.delete(id);
            if (error) {
                console.error('❌ Worker 返回错误:', error);
                reject(new Error(error));
            }
            else {
                resolve(payload);
            }
        }
    }
    /**
     * 处理Worker错误
     */
    handleWorkerError(error) {
        this.emit('error', {
            error: `Worker错误: ${error.message}`
        });
    }
}
/**
 * Worker管理器工厂
 */
export class WorkerManagerFactory {
    static async create(preferWorker = true) {
        // 严格遵循架构原则：只能使用 Worker，不允许主线程回退
        if (!preferWorker) {
            throw new Error('架构设计要求必须使用 Worker 进行推理，不允许禁用 Worker');
        }
        // 检查Worker支持
        if (typeof Worker === 'undefined') {
            throw new Error('当前浏览器不支持 Web Workers，无法进行姿态推理');
        }
        try {
            console.log('🔧 创建 Worker 管理器...');
            const workerManager = new TensorFlowWorkerManager();
            await workerManager.initialize();
            console.log('✅ Worker 管理器创建成功');
            return workerManager;
        }
        catch (error) {
            console.error('❌ Worker 初始化失败:', error);
            throw new Error(`Worker 管理器初始化失败，应用无法启动。主线程不支持 TensorFlow.js 推理。原因: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
/**
 * 性能监控器
 */
export class PerformanceMonitor {
    constructor() {
        this.eventBus = eventBus; // 使用全局eventBus实例
        this.metrics = {
            frameCount: 0,
            totalInferenceTime: 0,
            averageInferenceTime: 0,
            fps: 0,
            lastFrameTime: 0,
            memoryUsage: 0
        };
        // 构造函数不需要参数
        this.startMonitoring();
    }
    /**
     * 记录帧性能
     */
    recordFrame(inferenceTime) {
        const now = performance.now();
        this.metrics.frameCount++;
        this.metrics.totalInferenceTime += inferenceTime;
        this.metrics.averageInferenceTime = this.metrics.totalInferenceTime / this.metrics.frameCount;
        if (this.metrics.lastFrameTime > 0) {
            const frameDuration = now - this.metrics.lastFrameTime;
            this.metrics.fps = 1000 / frameDuration;
        }
        this.metrics.lastFrameTime = now;
        // 每100帧发送一次性能报告
        if (this.metrics.frameCount % 100 === 0) {
            this.reportPerformance();
        }
    }
    /**
     * 获取性能指标
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * 重置指标
     */
    reset() {
        this.metrics = {
            frameCount: 0,
            totalInferenceTime: 0,
            averageInferenceTime: 0,
            fps: 0,
            lastFrameTime: 0,
            memoryUsage: 0
        };
    }
    /**
     * 开始监控
     */
    startMonitoring() {
        // 监控内存使用（如果支持）
        if ('memory' in performance) {
            setInterval(() => {
                this.metrics.memoryUsage = performance.memory.usedJSHeapSize / 1024 / 1024; // MB
            }, 5000);
        }
    }
    /**
     * 报告性能
     */
    reportPerformance() {
        this.eventBus.emit('performance:report', this.getMetrics());
    }
}
//# sourceMappingURL=WorkerManager.js.map