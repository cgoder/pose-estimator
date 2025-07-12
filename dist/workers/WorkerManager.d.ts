/**
 * Web Workers支持模块
 * 将TensorFlow.js推理计算移到Web Worker中，避免阻塞主线程
 */
import { ModelType, PoseEstimationResult, ModelConfig } from '../types/index.js';
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
export declare class TensorFlowWorkerManager implements WorkerManagerInterface {
    private worker;
    private isWorkerReady;
    private pendingRequests;
    private requestId;
    isSupported: boolean;
    isInitialized: boolean;
    private eventListeners;
    constructor();
    /**
     * 添加事件监听器
     */
    on(event: string, callback: Function): void;
    /**
     * 移除事件监听器
     */
    off(event: string, callback: Function): void;
    /**
     * 触发事件
     */
    private emit;
    /**
     * 初始化Worker
     */
    initialize(): Promise<void>;
    /**
     * 加载模型
     */
    loadModel(modelType: ModelType, config?: ModelConfig): Promise<void>;
    /**
     * 执行推理
     */
    predict(imageData: ImageData): Promise<PoseEstimationResult>;
    /**
     * 检查Worker是否就绪
     */
    isReady(): boolean;
    /**
     * 释放Worker资源
     */
    dispose(): void;
    /**
     * 发送消息到Worker
     */
    private sendMessage;
    /**
     * 处理Worker消息
     */
    private handleWorkerMessage;
    /**
     * 处理Worker错误
     */
    private handleWorkerError;
}
/**
 * Worker管理器工厂
 */
export declare class WorkerManagerFactory {
    static create(preferWorker?: boolean): Promise<WorkerManagerInterface>;
}
/**
 * 性能监控器
 */
export declare class PerformanceMonitor {
    private eventBus;
    private metrics;
    constructor();
    /**
     * 记录帧性能
     */
    recordFrame(inferenceTime: number): void;
    /**
     * 获取性能指标
     */
    getMetrics(): typeof this.metrics;
    /**
     * 重置指标
     */
    reset(): void;
    /**
     * 开始监控
     */
    private startMonitoring;
    /**
     * 报告性能
     */
    private reportPerformance;
}
//# sourceMappingURL=WorkerManager.d.ts.map