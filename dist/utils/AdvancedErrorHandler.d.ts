/**
 * 高级错误处理和恢复机制
 * 提供智能错误分类、自动重试和优雅降级功能
 */
export declare enum ErrorSeverity {
    LOW = "low",
    MEDIUM = "medium",
    HIGH = "high",
    CRITICAL = "critical"
}
export declare enum ErrorCategory {
    NETWORK = "network",
    MODEL_LOADING = "model_loading",
    INFERENCE = "inference",
    WORKER = "worker",
    MEMORY = "memory",
    PERMISSION = "permission",
    VALIDATION = "validation",
    UNKNOWN = "unknown"
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
export declare class AdvancedErrorHandler {
    private errorHistory;
    private retryConfig;
    private recoveryStrategies;
    private errorListeners;
    private maxHistorySize;
    constructor(config?: Partial<RetryConfig>, maxHistorySize?: number);
    /**
     * 设置默认恢复策略
     */
    private setupDefaultRecoveryStrategies;
    /**
     * 添加恢复策略
     */
    addRecoveryStrategy(category: ErrorCategory, strategy: RecoveryStrategy): void;
    /**
     * 添加错误监听器
     */
    onError(listener: (error: ErrorContext) => void): void;
    /**
     * 智能错误分类
     */
    private categorizeError;
    /**
     * 确定错误严重程度
     */
    private determineSeverity;
    /**
     * 处理错误
     */
    handleError(error: Error, metadata?: Record<string, any>): Promise<any>;
    /**
     * 记录错误
     */
    private recordError;
    /**
     * 获取严重程度对应的表情符号
     */
    private getSeverityEmoji;
    /**
     * 尝试恢复
     */
    private attemptRecovery;
    /**
     * 判断是否应该重试
     */
    private shouldRetry;
    /**
     * 计算重试延迟
     */
    private calculateRetryDelay;
    /**
     * 带重试的异步操作包装器
     */
    withRetry<T>(operation: () => Promise<T>, category: ErrorCategory, metadata?: Record<string, any>): Promise<T>;
    /**
     * 获取错误统计
     */
    getErrorStats(timeWindowMs?: number): Record<string, any>;
    /**
     * 清除错误历史
     */
    clearHistory(): void;
    /**
     * 导出错误报告
     */
    exportErrorReport(): string;
}
export declare const globalErrorHandler: AdvancedErrorHandler;
//# sourceMappingURL=AdvancedErrorHandler.d.ts.map