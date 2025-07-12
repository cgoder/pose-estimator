/**
 * Worker 池管理器
 * 提供多 Worker 并行处理能力，提升性能
 */
import { EventEmitter } from 'events';
export interface WorkerPoolConfig {
    maxWorkers: number;
    workerScript: string;
    timeout: number;
}
export interface PooledWorker {
    id: string;
    worker: Worker;
    busy: boolean;
    lastUsed: number;
}
export declare class WorkerPool extends EventEmitter {
    private workers;
    private queue;
    private config;
    private requestId;
    constructor(config?: Partial<WorkerPoolConfig>);
    /**
     * 初始化 Worker 池
     */
    initialize(): Promise<void>;
    /**
     * 创建单个 Worker
     */
    private createWorker;
    /**
     * 执行任务
     */
    execute(task: any): Promise<any>;
    /**
     * 获取可用的 Worker
     */
    private getAvailableWorker;
    /**
     * 执行具体任务
     */
    private executeTask;
    /**
     * 处理队列中的任务
     */
    private processQueue;
    /**
     * 发送消息到指定 Worker
     */
    private sendToWorker;
    /**
     * 处理 Worker 消息
     */
    private handleWorkerMessage;
    /**
     * 处理 Worker 错误
     */
    private handleWorkerError;
    /**
     * 重启 Worker
     */
    private restartWorker;
    /**
     * 获取池状态
     */
    getStatus(): {
        totalWorkers: number;
        busyWorkers: number;
        queueLength: number;
        workers: {
            id: string;
            busy: boolean;
            lastUsed: number;
        }[];
    };
    /**
     * 销毁 Worker 池
     */
    dispose(): void;
}
//# sourceMappingURL=WorkerPool.d.ts.map