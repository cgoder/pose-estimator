/**
 * Web Workers支持模块
 * 将TensorFlow.js推理计算移到Web Worker中，避免阻塞主线程
 */

import { eventBus } from '../core/EventBus.js';
import { 
  ModelType, 
  PoseEstimationResult,
  WorkerMessage,
  WorkerResponse,
  ModelConfig
} from '../types/index.js';

/**
 * Worker管理器接口
 */
export interface WorkerManagerInterface {
  isSupported: boolean;
  isInitialized: boolean;
  initialize(): Promise<void>;
  loadModel(modelType: ModelType, config?: ModelConfig): Promise<void>;
  predict(imageData: ImageData): Promise<PoseEstimationResult>;
  dispose(): void;
  isReady(): boolean;
  on(event: string, callback: Function): void;
  off(event: string, callback: Function): void;
}

/**
 * TensorFlow.js Worker管理器实现
 */
export class TensorFlowWorkerManager implements WorkerManagerInterface {
  private worker: Worker | null = null;
  private isWorkerReady = false;
  private pendingRequests = new Map<string, { 
    resolve: Function; 
    reject: Function; 
    timeoutId?: NodeJS.Timeout 
  }>();
  private requestId = 0;
  
  public isSupported: boolean = true;
  public isInitialized: boolean = false;
  private eventListeners = new Map<string, Function[]>();

  constructor() {
    this.isSupported = typeof Worker !== 'undefined';
  }

  /**
   * 添加事件监听器
   */
  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  /**
   * 移除事件监听器
   */
  off(event: string, callback: Function): void {
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
  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => callback(data));
    }
  }

  /**
   * 初始化Worker
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

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
      
    } catch (error) {
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
  async loadModel(modelType: ModelType, config?: ModelConfig): Promise<void> {
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
    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 执行推理
   */
  async predict(imageData: ImageData): Promise<PoseEstimationResult> {
    if (!this.isReady()) {
      throw new Error('Worker未就绪');
    }

    try {
      const response = await this.sendMessage({
        type: 'predict',
        payload: { imageData }
      });

      // 确保返回的数据包含必要的字段
      if (!response || !response.poses) {
        throw new Error('Worker 返回的推理结果格式不正确');
      }

      return response;

    } catch (error) {
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * 检查Worker是否就绪
   */
  isReady(): boolean {
    return this.isWorkerReady && this.worker !== null;
  }

  /**
   * 释放Worker资源
   */
  dispose(): void {
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
  private async sendMessage(message: WorkerMessage, timeout: number = 30000): Promise<any> {
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
      this.pendingRequests.get(id)!.timeoutId = timeoutId;

      this.worker.postMessage({ ...message, id });
    });
  }

  /**
   * 处理Worker消息
   */
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { id, payload, error } = event.data;

    if (id && this.pendingRequests.has(id)) {
      const request = this.pendingRequests.get(id)!;
      const { resolve, reject, timeoutId } = request;
      
      // 清理超时定时器
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      this.pendingRequests.delete(id);

      if (error) {
        console.error('❌ Worker 返回错误:', error);
        reject(new Error(error));
      } else {
        resolve(payload);
      }
    }
  }

  /**
   * 处理Worker错误
   */
  private handleWorkerError(error: ErrorEvent): void {
    this.emit('error', { 
      error: `Worker错误: ${error.message}` 
    });
  }
}

/**
 * Worker管理器工厂
 */
export class WorkerManagerFactory {
  static async create(
    preferWorker: boolean = true
  ): Promise<WorkerManagerInterface> {
    
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
    } catch (error) {
      console.error('❌ Worker 初始化失败:', error);
      throw new Error(`Worker 管理器初始化失败，应用无法启动。主线程不支持 TensorFlow.js 推理。原因: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

/**
 * 性能监控器
 */
export class PerformanceMonitor {
  private eventBus = eventBus; // 使用全局eventBus实例
  private metrics = {
    frameCount: 0,
    totalInferenceTime: 0,
    averageInferenceTime: 0,
    fps: 0,
    lastFrameTime: 0,
    memoryUsage: 0
  };

  constructor() {
    // 构造函数不需要参数
    this.startMonitoring();
  }

  /**
   * 记录帧性能
   */
  recordFrame(inferenceTime: number): void {
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
  getMetrics(): typeof this.metrics {
    return { ...this.metrics };
  }

  /**
   * 重置指标
   */
  reset(): void {
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
  private startMonitoring(): void {
    // 监控内存使用（如果支持）
    if ('memory' in performance) {
      setInterval(() => {
        this.metrics.memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
      }, 5000);
    }
  }

  /**
   * 报告性能
   */
  private reportPerformance(): void {
    this.eventBus.emit('performance:report', this.getMetrics());
  }
}