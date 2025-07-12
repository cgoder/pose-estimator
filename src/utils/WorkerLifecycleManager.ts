/**
 * Worker 生命周期管理器
 * 提供 Worker 的创建、监控、重启和资源管理功能
 */

import { eventBus } from '../core/EventBus.js';

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
export class WorkerLifecycleManager {
  private workers = new Map<string, Worker>();
  private metrics = new Map<string, WorkerMetrics>();
  private config: WorkerLifecycleConfig;
  private healthCheckInterval: number | null = null;
  private pendingRequests = new Map<string, Map<string, any>>();

  constructor(config: Partial<WorkerLifecycleConfig> = {}) {
    this.config = {
      maxRetries: 3,
      retryDelay: 1000,
      healthCheckInterval: 30000, // 30秒
      maxIdleTime: 300000, // 5分钟
      enableAutoRestart: true,
      ...config
    };
  }

  /**
   * 创建并管理 Worker
   */
  async createWorker(
    workerId: string,
    workerScript: string,
    options: WorkerOptions = {}
  ): Promise<Worker> {
    try {
      // 如果 Worker 已存在，先清理
      if (this.workers.has(workerId)) {
        await this.terminateWorker(workerId);
      }

      // 创建新的 Worker
      const worker = new Worker(workerScript, options);
      
      // 初始化指标
      const metrics: WorkerMetrics = {
        createdAt: Date.now(),
        lastActivity: Date.now(),
        requestCount: 0,
        errorCount: 0,
        restartCount: 0,
        averageResponseTime: 0,
        status: 'initializing'
      };

      this.workers.set(workerId, worker);
      this.metrics.set(workerId, metrics);
      this.pendingRequests.set(workerId, new Map());

      // 设置事件监听器
      this.setupWorkerEventListeners(workerId, worker);

      // 启动健康检查（如果是第一个 Worker）
      if (this.workers.size === 1 && !this.healthCheckInterval) {
        this.startHealthCheck();
      }

      console.log(`✅ Worker ${workerId} 创建成功`);
      eventBus.emit('worker-created', { workerId, metrics });

      return worker;

    } catch (error) {
      console.error(`❌ Worker ${workerId} 创建失败:`, error);
      eventBus.emit('worker-creation-failed', { workerId, error });
      throw error;
    }
  }

  /**
   * 设置 Worker 事件监听器
   */
  private setupWorkerEventListeners(workerId: string, worker: Worker): void {
    const metrics = this.metrics.get(workerId)!;

    worker.onmessage = (event) => {
      metrics.lastActivity = Date.now();
      metrics.requestCount++;
      
      // 更新状态
      if (metrics.status === 'initializing') {
        metrics.status = 'ready';
        eventBus.emit('worker-ready', { workerId });
      } else {
        metrics.status = 'ready';
      }

      // 处理响应时间统计
      const message = event.data;
      if (message.id && this.pendingRequests.has(workerId)) {
        const pending = this.pendingRequests.get(workerId)!;
        const requestInfo = pending.get(message.id);
        if (requestInfo) {
          const responseTime = Date.now() - requestInfo.startTime;
          this.updateAverageResponseTime(workerId, responseTime);
          pending.delete(message.id);
        }
      }

      eventBus.emit('worker-message', { workerId, message: event.data });
    };

    worker.onerror = (error) => {
      metrics.errorCount++;
      metrics.status = 'error';
      metrics.lastActivity = Date.now();

      console.error(`❌ Worker ${workerId} 错误:`, error);
      eventBus.emit('worker-error', { workerId, error });

      // 自动重启（如果启用）
      if (this.config.enableAutoRestart && metrics.restartCount < this.config.maxRetries) {
        this.scheduleWorkerRestart(workerId);
      }
    };

    worker.onmessageerror = (error) => {
      metrics.errorCount++;
      metrics.status = 'error';
      console.error(`❌ Worker ${workerId} 消息错误:`, error);
      eventBus.emit('worker-message-error', { workerId, error });
    };
  }

  /**
   * 发送消息到 Worker
   */
  async sendMessage(
    workerId: string,
    message: any,
    timeout: number = 30000
  ): Promise<any> {
    const worker = this.workers.get(workerId);
    const metrics = this.metrics.get(workerId);

    if (!worker || !metrics) {
      throw new Error(`Worker ${workerId} 不存在`);
    }

    if (metrics.status === 'error' || metrics.status === 'terminated') {
      throw new Error(`Worker ${workerId} 状态异常: ${metrics.status}`);
    }

    return new Promise((resolve, reject) => {
      const messageId = `${workerId}_${Date.now()}_${Math.random()}`;
      const startTime = Date.now();

      // 记录待处理请求
      const pending = this.pendingRequests.get(workerId)!;
      pending.set(messageId, { startTime, resolve, reject });

      // 设置超时
      const timeoutId = setTimeout(() => {
        pending.delete(messageId);
        metrics.errorCount++;
        reject(new Error(`Worker ${workerId} 请求超时`));
      }, timeout);

      // 监听响应
      const handleResponse = (event: MessageEvent) => {
        const response = event.data;
        if (response.id === messageId) {
          clearTimeout(timeoutId);
          pending.delete(messageId);
          worker.removeEventListener('message', handleResponse);

          if (response.type === 'error') {
            metrics.errorCount++;
            reject(new Error(response.error));
          } else {
            resolve(response);
          }
        }
      };

      worker.addEventListener('message', handleResponse);
      
      // 发送消息
      metrics.status = 'busy';
      worker.postMessage({ ...message, id: messageId });
    });
  }

  /**
   * 更新平均响应时间
   */
  private updateAverageResponseTime(workerId: string, responseTime: number): void {
    const metrics = this.metrics.get(workerId);
    if (!metrics) return;

    const totalRequests = metrics.requestCount;
    const currentAvg = metrics.averageResponseTime;
    
    // 计算新的平均值
    metrics.averageResponseTime = 
      (currentAvg * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * 安排 Worker 重启
   */
  private scheduleWorkerRestart(workerId: string): void {
    const metrics = this.metrics.get(workerId);
    if (!metrics) return;

    metrics.restartCount++;
    
    setTimeout(async () => {
      try {
        console.log(`🔄 重启 Worker ${workerId} (第 ${metrics.restartCount} 次)`);
        await this.restartWorker(workerId);
      } catch (error) {
        console.error(`❌ Worker ${workerId} 重启失败:`, error);
        eventBus.emit('worker-restart-failed', { workerId, error });
      }
    }, this.config.retryDelay * metrics.restartCount);
  }

  /**
   * 重启 Worker
   */
  async restartWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      throw new Error(`Worker ${workerId} 不存在`);
    }

    // 使用默认的 Worker 脚本路径
    const workerScript = './pose-worker.js';
    
    // 终止旧 Worker
    await this.terminateWorker(workerId);
    
    // 创建新 Worker
    await this.createWorker(workerId, workerScript);
    
    eventBus.emit('worker-restarted', { workerId });
  }

  /**
   * 终止 Worker
   */
  async terminateWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    const metrics = this.metrics.get(workerId);

    if (worker) {
      worker.terminate();
      this.workers.delete(workerId);
    }

    if (metrics) {
      metrics.status = 'terminated';
      this.metrics.delete(workerId);
    }

    // 清理待处理请求
    const pending = this.pendingRequests.get(workerId);
    if (pending) {
      pending.forEach(({ reject }) => {
        reject(new Error(`Worker ${workerId} 已终止`));
      });
      this.pendingRequests.delete(workerId);
    }

    // 如果没有 Worker 了，停止健康检查
    if (this.workers.size === 0 && this.healthCheckInterval) {
      this.stopHealthCheck();
    }

    console.log(`🗑️ Worker ${workerId} 已终止`);
    eventBus.emit('worker-terminated', { workerId });
  }

  /**
   * 获取 Worker 健康状态
   */
  getWorkerHealth(workerId: string): WorkerHealthStatus | null {
    const worker = this.workers.get(workerId);
    const metrics = this.metrics.get(workerId);

    if (!worker || !metrics) {
      return null;
    }

    const now = Date.now();
    const issues: string[] = [];
    
    // 检查各种健康指标
    if (metrics.status === 'error') {
      issues.push('Worker 处于错误状态');
    }
    
    if (metrics.errorCount > 10) {
      issues.push(`错误次数过多: ${metrics.errorCount}`);
    }
    
    if (now - metrics.lastActivity > this.config.maxIdleTime) {
      issues.push('Worker 长时间无活动');
    }
    
    if (metrics.averageResponseTime > 5000) {
      issues.push(`响应时间过长: ${metrics.averageResponseTime.toFixed(0)}ms`);
    }

    return {
      isHealthy: issues.length === 0,
      lastCheck: now,
      issues,
      metrics: { ...metrics }
    };
  }

  /**
   * 获取所有 Worker 的健康状态
   */
  getAllWorkerHealth(): Map<string, WorkerHealthStatus> {
    const healthMap = new Map<string, WorkerHealthStatus>();
    
    for (const workerId of this.workers.keys()) {
      const health = this.getWorkerHealth(workerId);
      if (health) {
        healthMap.set(workerId, health);
      }
    }
    
    return healthMap;
  }

  /**
   * 开始健康检查
   */
  private startHealthCheck(): void {
    this.healthCheckInterval = window.setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * 停止健康检查
   */
  private stopHealthCheck(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  /**
   * 执行健康检查
   */
  private performHealthCheck(): void {
    const healthResults = this.getAllWorkerHealth();
    
    for (const [workerId, health] of healthResults) {
      if (!health.isHealthy) {
        console.warn(`⚠️ Worker ${workerId} 健康检查失败:`, health.issues);
        eventBus.emit('worker-health-warning', { workerId, health });
        
        // 如果启用自动重启且问题严重，重启 Worker
        if (this.config.enableAutoRestart && 
            health.issues.some(issue => 
              issue.includes('错误状态') || issue.includes('长时间无活动')
            )) {
          this.scheduleWorkerRestart(workerId);
        }
      }
    }
    
    eventBus.emit('health-check-completed', { results: healthResults });
  }

  /**
   * 清理所有资源
   */
  async cleanup(): Promise<void> {
    this.stopHealthCheck();
    
    const terminationPromises = Array.from(this.workers.keys()).map(
      workerId => this.terminateWorker(workerId)
    );
    
    await Promise.all(terminationPromises);
    
    console.log('🧹 Worker 生命周期管理器已清理');
  }

  /**
   * 获取统计信息
   */
  getStatistics(): {
    totalWorkers: number;
    activeWorkers: number;
    totalRequests: number;
    totalErrors: number;
    averageResponseTime: number;
  } {
    const metrics = Array.from(this.metrics.values());
    
    return {
      totalWorkers: metrics.length,
      activeWorkers: metrics.filter(m => m.status === 'ready' || m.status === 'busy').length,
      totalRequests: metrics.reduce((sum, m) => sum + m.requestCount, 0),
      totalErrors: metrics.reduce((sum, m) => sum + m.errorCount, 0),
      averageResponseTime: metrics.length > 0 
        ? metrics.reduce((sum, m) => sum + m.averageResponseTime, 0) / metrics.length 
        : 0
    };
  }
}

/**
 * 全局 Worker 生命周期管理器实例
 */
export const workerLifecycleManager = new WorkerLifecycleManager();