/**
 * Worker 生命周期管理器
 * 提供 Worker 的创建、监控、重启和资源管理功能
 */
export interface WorkerLifecycleConfig {
    maxRetries: number;
    retryDelay: number;
    healthCheckInterval: number;
    maxIdleTime: number;
    enableAutoRestart: boolean;
}
export interface WorkerMetrics {
    createdAt: number;
    lastActivity: number;
    requestCount: number;
    errorCount: number;
    restartCount: number;
    averageResponseTime: number;
    status: 'initializing' | 'ready' | 'busy' | 'error' | 'terminated';
}
export interface WorkerHealthStatus {
    isHealthy: boolean;
    lastCheck: number;
    issues: string[];
    metrics: WorkerMetrics;
}
/**
 * Worker 生命周期管理器
 */
export declare class WorkerLifecycleManager {
    private workers;
    private metrics;
    private config;
    private healthCheckInterval;
    private pendingRequests;
    constructor(config?: Partial<WorkerLifecycleConfig>);
    /**
     * 创建并管理 Worker
     */
    createWorker(workerId: string, workerScript: string, options?: WorkerOptions): Promise<Worker>;
    /**
     * 设置 Worker 事件监听器
     */
    private setupWorkerEventListeners;
    /**
     * 发送消息到 Worker
     */
    sendMessage(workerId: string, message: any, timeout?: number): Promise<any>;
    /**
     * 更新平均响应时间
     */
    private updateAverageResponseTime;
    /**
     * 安排 Worker 重启
     */
    private scheduleWorkerRestart;
    /**
     * 重启 Worker
     */
    restartWorker(workerId: string): Promise<void>;
    /**
     * 终止 Worker
     */
    terminateWorker(workerId: string): Promise<void>;
    /**
     * 获取 Worker 健康状态
     */
    getWorkerHealth(workerId: string): WorkerHealthStatus | null;
    /**
     * 获取所有 Worker 的健康状态
     */
    getAllWorkerHealth(): Map<string, WorkerHealthStatus>;
    /**
     * 开始健康检查
     */
    private startHealthCheck;
    /**
     * 停止健康检查
     */
    private stopHealthCheck;
    /**
     * 执行健康检查
     */
    private performHealthCheck;
    /**
     * 清理所有资源
     */
    cleanup(): Promise<void>;
    /**
     * 获取统计信息
     */
    getStatistics(): {
        totalWorkers: number;
        activeWorkers: number;
        totalRequests: number;
        totalErrors: number;
        averageResponseTime: number;
    };
}
/**
 * 全局 Worker 生命周期管理器实例
 */
export declare const workerLifecycleManager: WorkerLifecycleManager;
//# sourceMappingURL=WorkerLifecycleManager.d.ts.map