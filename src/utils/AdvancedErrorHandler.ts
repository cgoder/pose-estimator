/**
 * 高级错误处理和恢复机制
 * 提供智能错误分类、自动重试和优雅降级功能
 */

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  MODEL_LOADING = 'model_loading',
  INFERENCE = 'inference',
  WORKER = 'worker',
  MEMORY = 'memory',
  PERMISSION = 'permission',
  VALIDATION = 'validation',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  timestamp: number;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  stack?: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  url?: string;
  userId?: string;
}

export interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors: ErrorCategory[];
}

export interface RecoveryStrategy {
  category: ErrorCategory;
  handler: (error: ErrorContext) => Promise<boolean>;
  fallback?: () => Promise<any>;
}

export class AdvancedErrorHandler {
  private errorHistory: ErrorContext[] = [];
  private retryConfig: RetryConfig;
  private recoveryStrategies = new Map<ErrorCategory, RecoveryStrategy>();
  private errorListeners: Array<(error: ErrorContext) => void> = [];
  private maxHistorySize: number;

  constructor(config: Partial<RetryConfig> = {}, maxHistorySize = 1000) {
    this.maxHistorySize = maxHistorySize;
    this.retryConfig = {
      maxAttempts: 3,
      baseDelay: 1000,
      maxDelay: 10000,
      backoffFactor: 2,
      retryableErrors: [
        ErrorCategory.NETWORK,
        ErrorCategory.MODEL_LOADING,
        ErrorCategory.WORKER
      ],
      ...config
    };

    this.setupDefaultRecoveryStrategies();
  }

  /**
   * 设置默认恢复策略
   */
  private setupDefaultRecoveryStrategies(): void {
    // 网络错误恢复策略
    this.addRecoveryStrategy(ErrorCategory.NETWORK, {
      category: ErrorCategory.NETWORK,
      handler: async (_error: ErrorContext) => {
        console.log('🔄 尝试网络错误恢复...');
        // 检查网络连接
        if (navigator.onLine) {
          return true; // 可以重试
        }
        return false;
      },
      fallback: async () => {
        console.log('📱 切换到离线模式');
        // 返回缓存的模型或使用本地推理
        return { mode: 'offline', message: '已切换到离线模式' };
      }
    });

    // Worker 错误恢复策略
    this.addRecoveryStrategy(ErrorCategory.WORKER, {
      category: ErrorCategory.WORKER,
      handler: async (_error: ErrorContext) => {
        console.log('🔄 尝试 Worker 错误恢复...');
        // 检查 Worker 支持
        if (typeof Worker !== 'undefined') {
          return true; // 可以重试创建 Worker
        }
        return false;
      },
      fallback: async () => {
        console.log('🔄 切换到主线程推理');
        // 切换到主线程推理
        return { mode: 'main-thread', message: '已切换到主线程推理' };
      }
    });

    // 内存错误恢复策略
    this.addRecoveryStrategy(ErrorCategory.MEMORY, {
      category: ErrorCategory.MEMORY,
      handler: async (_error: ErrorContext) => {
        console.log('🧹 尝试内存清理...');
        // 触发垃圾回收和内存清理
        if (typeof window !== 'undefined' && 'gc' in window) {
          (window as any).gc();
        }
        return false; // 内存错误通常不适合重试
      },
      fallback: async () => {
        console.log('📉 降低模型精度');
        // 降低模型精度或切换到轻量级模型
        return { mode: 'lightweight', message: '已切换到轻量级模型' };
      }
    });
  }

  /**
   * 添加恢复策略
   */
  addRecoveryStrategy(category: ErrorCategory, strategy: RecoveryStrategy): void {
    this.recoveryStrategies.set(category, strategy);
  }

  /**
   * 添加错误监听器
   */
  onError(listener: (error: ErrorContext) => void): void {
    this.errorListeners.push(listener);
  }

  /**
   * 智能错误分类
   */
  private categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = error.stack?.toLowerCase() || '';

    if (message.includes('network') || message.includes('fetch') || message.includes('cors')) {
      return ErrorCategory.NETWORK;
    }
    
    if (message.includes('worker') || stack.includes('worker')) {
      return ErrorCategory.WORKER;
    }
    
    if (message.includes('model') || message.includes('load')) {
      return ErrorCategory.MODEL_LOADING;
    }
    
    if (message.includes('memory') || message.includes('heap')) {
      return ErrorCategory.MEMORY;
    }
    
    if (message.includes('permission') || message.includes('denied')) {
      return ErrorCategory.PERMISSION;
    }
    
    if (message.includes('inference') || message.includes('predict')) {
      return ErrorCategory.INFERENCE;
    }
    
    if (message.includes('validation') || message.includes('invalid')) {
      return ErrorCategory.VALIDATION;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * 确定错误严重程度
   */
  private determineSeverity(category: ErrorCategory, _error: Error): ErrorSeverity {
    switch (category) {
      case ErrorCategory.MEMORY:
        return ErrorSeverity.CRITICAL;
      
      case ErrorCategory.MODEL_LOADING:
      case ErrorCategory.WORKER:
        return ErrorSeverity.HIGH;
      
      case ErrorCategory.NETWORK:
      case ErrorCategory.INFERENCE:
        return ErrorSeverity.MEDIUM;
      
      default:
        return ErrorSeverity.LOW;
    }
  }

  /**
   * 处理错误
   */
  async handleError(error: Error, metadata?: Record<string, any>): Promise<any> {
    const category = this.categorizeError(error);
    const severity = this.determineSeverity(category, error);
    
    const errorContext: ErrorContext = {
      timestamp: Date.now(),
      category,
      severity,
      message: error.message,
      stack: error.stack || '',
      metadata: metadata || {},
      userAgent: navigator.userAgent,
      url: window.location.href
    };

    // 记录错误
    this.recordError(errorContext);

    // 通知监听器
    this.errorListeners.forEach(listener => {
      try {
        listener(errorContext);
      } catch (e) {
        console.error('Error listener failed:', e);
      }
    });

    // 尝试恢复
    return await this.attemptRecovery(errorContext);
  }

  /**
   * 记录错误
   */
  private recordError(error: ErrorContext): void {
    this.errorHistory.push(error);
    
    // 限制历史记录大小
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift();
    }

    // 输出到控制台
    const emoji = this.getSeverityEmoji(error.severity);
    console.error(`${emoji} [${error.category.toUpperCase()}] ${error.message}`, error);
  }

  /**
   * 获取严重程度对应的表情符号
   */
  private getSeverityEmoji(severity: ErrorSeverity): string {
    switch (severity) {
      case ErrorSeverity.CRITICAL: return '🚨';
      case ErrorSeverity.HIGH: return '❌';
      case ErrorSeverity.MEDIUM: return '⚠️';
      case ErrorSeverity.LOW: return 'ℹ️';
      default: return '❓';
    }
  }

  /**
   * 尝试恢复
   */
  private async attemptRecovery(errorContext: ErrorContext): Promise<any> {
    const strategy = this.recoveryStrategies.get(errorContext.category);
    
    if (strategy) {
      try {
        const canRetry = await strategy.handler(errorContext);
        
        if (canRetry && this.shouldRetry(errorContext.category)) {
          console.log(`🔄 准备重试 ${errorContext.category} 操作...`);
          return { shouldRetry: true, delay: this.calculateRetryDelay(0) };
        }
        
        if (strategy.fallback) {
          console.log(`🔄 执行 ${errorContext.category} 降级策略...`);
          return await strategy.fallback();
        }
      } catch (recoveryError) {
        console.error('恢复策略执行失败:', recoveryError);
      }
    }

    // 如果没有恢复策略或恢复失败，抛出原始错误
    throw new Error(`无法恢复的错误: ${errorContext.message}`);
  }

  /**
   * 判断是否应该重试
   */
  private shouldRetry(category: ErrorCategory): boolean {
    return this.retryConfig.retryableErrors.includes(category);
  }

  /**
   * 计算重试延迟
   */
  private calculateRetryDelay(attempt: number): number {
    const delay = Math.min(
      this.retryConfig.baseDelay * Math.pow(this.retryConfig.backoffFactor, attempt),
      this.retryConfig.maxDelay
    );
    
    // 添加随机抖动，避免雷群效应
    return delay + Math.random() * 1000;
  }

  /**
   * 带重试的异步操作包装器
   */
  async withRetry<T>(
    operation: () => Promise<T>,
    category: ErrorCategory,
    metadata?: Record<string, any>
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt < this.retryConfig.maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === this.retryConfig.maxAttempts - 1) {
          // 最后一次尝试失败，执行错误处理
          return await this.handleError(lastError, {
            ...metadata,
            attempt: attempt + 1,
            maxAttempts: this.retryConfig.maxAttempts
          });
        }
        
        if (this.shouldRetry(category)) {
          const delay = this.calculateRetryDelay(attempt);
          console.log(`🔄 第 ${attempt + 1} 次重试失败，${delay}ms 后重试...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        } else {
          // 不可重试的错误，直接处理
          return await this.handleError(lastError, metadata);
        }
      }
    }
    
    throw lastError!;
  }

  /**
   * 获取错误统计
   */
  getErrorStats(timeWindowMs = 3600000): Record<string, any> {
    const now = Date.now();
    const recentErrors = this.errorHistory.filter(
      error => now - error.timestamp <= timeWindowMs
    );

    const stats: Record<string, any> = {
      total: recentErrors.length,
      byCategory: {},
      bySeverity: {},
      timeline: []
    };

    // 按类别统计
    for (const category of Object.values(ErrorCategory)) {
      stats['byCategory'][category] = recentErrors.filter(e => e.category === category).length;
    }

    // 按严重程度统计
    for (const severity of Object.values(ErrorSeverity)) {
      stats['bySeverity'][severity] = recentErrors.filter(e => e.severity === severity).length;
    }

    // 时间线（每小时的错误数量）
    const hourlyBuckets = new Map<number, number>();
    for (const error of recentErrors) {
      const hour = Math.floor(error.timestamp / 3600000) * 3600000;
      hourlyBuckets.set(hour, (hourlyBuckets.get(hour) || 0) + 1);
    }
    
    stats['timeline'] = Array.from(hourlyBuckets.entries())
      .sort(([a], [b]) => a - b)
      .map(([timestamp, count]) => ({ timestamp, count }));

    return stats;
  }

  /**
   * 清除错误历史
   */
  clearHistory(): void {
    this.errorHistory.length = 0;
  }

  /**
   * 导出错误报告
   */
  exportErrorReport(): string {
    const stats = this.getErrorStats();
    const report = {
      generatedAt: new Date().toISOString(),
      statistics: stats,
      recentErrors: this.errorHistory.slice(-50), // 最近50个错误
      recoveryStrategies: Array.from(this.recoveryStrategies.keys())
    };

    return JSON.stringify(report, null, 2);
  }
}

// 全局错误处理器实例
export const globalErrorHandler = new AdvancedErrorHandler();