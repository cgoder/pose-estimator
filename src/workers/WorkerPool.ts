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

export class WorkerPool extends EventEmitter {
  private workers: Map<string, PooledWorker> = new Map();
  private queue: Array<{ task: any; resolve: Function; reject: Function }> = [];
  private config: WorkerPoolConfig;
  private requestId = 0;

  constructor(config: Partial<WorkerPoolConfig> = {}) {
    super();
    this.config = {
      maxWorkers: navigator.hardwareConcurrency || 4,
      workerScript: './pose-worker.js',
      timeout: 30000,
      ...config
    };
  }

  /**
   * 初始化 Worker 池
   */
  async initialize(): Promise<void> {
    const workerPromises = [];
    
    for (let i = 0; i < this.config.maxWorkers; i++) {
      workerPromises.push(this.createWorker(`worker-${i}`));
    }

    await Promise.all(workerPromises);
    this.emit('initialized', { workerCount: this.workers.size });
  }

  /**
   * 创建单个 Worker
   */
  private async createWorker(id: string): Promise<void> {
    try {
      const worker = new Worker(new URL(this.config.workerScript, import.meta.url));
      
      const pooledWorker: PooledWorker = {
        id,
        worker,
        busy: false,
        lastUsed: Date.now()
      };

      // 设置 Worker 事件处理
      worker.onmessage = (event) => this.handleWorkerMessage(id, event);
      worker.onerror = (error) => this.handleWorkerError(id, error);

      this.workers.set(id, pooledWorker);

      // 初始化 Worker
      await this.sendToWorker(id, { type: 'initialize' });
      
    } catch (error) {
      this.emit('error', { workerId: id, error });
      throw error;
    }
  }

  /**
   * 执行任务
   */
  async execute(task: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const availableWorker = this.getAvailableWorker();
      
      if (availableWorker) {
        this.executeTask(availableWorker.id, task, resolve, reject);
      } else {
        // 加入队列等待
        this.queue.push({ task, resolve, reject });
      }
    });
  }

  /**
   * 获取可用的 Worker
   */
  private getAvailableWorker(): PooledWorker | null {
    for (const worker of this.workers.values()) {
      if (!worker.busy) {
        return worker;
      }
    }
    return null;
  }

  /**
   * 执行具体任务
   */
  private async executeTask(
    workerId: string, 
    task: any, 
    resolve: Function, 
    reject: Function
  ): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      reject(new Error(`Worker ${workerId} not found`));
      return;
    }

    worker.busy = true;
    worker.lastUsed = Date.now();

    try {
      const result = await this.sendToWorker(workerId, task);
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      worker.busy = false;
      this.processQueue();
    }
  }

  /**
   * 处理队列中的任务
   */
  private processQueue(): void {
    if (this.queue.length === 0) return;

    const availableWorker = this.getAvailableWorker();
    if (availableWorker) {
      const { task, resolve, reject } = this.queue.shift()!;
      this.executeTask(availableWorker.id, task, resolve, reject);
    }
  }

  /**
   * 发送消息到指定 Worker
   */
  private async sendToWorker(workerId: string, message: any): Promise<any> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} not found`);
    }

    return new Promise((resolve, reject) => {
      const id = (++this.requestId).toString();
      const timeout = setTimeout(() => {
        reject(new Error(`Worker ${workerId} timeout`));
      }, this.config.timeout);

      const messageHandler = (event: MessageEvent) => {
        if (event.data.id === id) {
          clearTimeout(timeout);
          worker.worker.removeEventListener('message', messageHandler);
          
          if (event.data.error) {
            reject(new Error(event.data.error));
          } else {
            resolve(event.data.payload);
          }
        }
      };

      worker.worker.addEventListener('message', messageHandler);
      worker.worker.postMessage({ ...message, id });
    });
  }

  /**
   * 处理 Worker 消息
   */
  private handleWorkerMessage(workerId: string, event: MessageEvent): void {
    // 这里处理非请求-响应类型的消息（如事件通知）
    if (!event.data.id) {
      this.emit('workerEvent', { workerId, data: event.data });
    }
  }

  /**
   * 处理 Worker 错误
   */
  private handleWorkerError(workerId: string, error: ErrorEvent): void {
    this.emit('workerError', { workerId, error: error.message });
    
    // 重启出错的 Worker
    this.restartWorker(workerId);
  }

  /**
   * 重启 Worker
   */
  private async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (worker) {
      worker.worker.terminate();
      this.workers.delete(workerId);
      
      try {
        await this.createWorker(workerId);
        this.emit('workerRestarted', { workerId });
      } catch (error) {
        this.emit('error', { workerId, error });
      }
    }
  }

  /**
   * 获取池状态
   */
  getStatus() {
    const workers = Array.from(this.workers.values());
    return {
      totalWorkers: workers.length,
      busyWorkers: workers.filter(w => w.busy).length,
      queueLength: this.queue.length,
      workers: workers.map(w => ({
        id: w.id,
        busy: w.busy,
        lastUsed: w.lastUsed
      }))
    };
  }

  /**
   * 销毁 Worker 池
   */
  dispose(): void {
    for (const worker of this.workers.values()) {
      worker.worker.terminate();
    }
    this.workers.clear();
    this.queue.length = 0;
    this.removeAllListeners();
  }
}