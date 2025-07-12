/**
 * 代码质量检查工具
 * 提供运行时代码质量监控和分析功能
 */
export interface CodeQualityMetrics {
    memoryLeaks: MemoryLeakInfo[];
    performanceIssues: PerformanceIssue[];
    errorPatterns: ErrorPattern[];
    codeSmells: CodeSmell[];
    securityIssues: SecurityIssue[];
    timestamp: number;
}
export interface MemoryLeakInfo {
    type: 'tensor' | 'dom' | 'event-listener' | 'worker' | 'other';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    location?: string;
    suggestions: string[];
    memoryUsage?: number;
}
export interface PerformanceIssue {
    type: 'slow-function' | 'blocking-operation' | 'inefficient-loop' | 'large-payload';
    description: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    duration?: number;
    location?: string;
    suggestions: string[];
}
export interface ErrorPattern {
    pattern: string;
    count: number;
    lastOccurrence: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    suggestions: string[];
}
export interface CodeSmell {
    type: 'long-function' | 'deep-nesting' | 'duplicate-code' | 'large-class' | 'god-object';
    description: string;
    severity: 'low' | 'medium' | 'high';
    location?: string;
    suggestions: string[];
}
export interface SecurityIssue {
    type: 'xss' | 'unsafe-eval' | 'insecure-random' | 'data-exposure';
    description: string;
    severity: 'medium' | 'high' | 'critical';
    location?: string;
    suggestions: string[];
}
export interface QualityCheckConfig {
    enableMemoryLeakDetection: boolean;
    enablePerformanceMonitoring: boolean;
    enableErrorPatternAnalysis: boolean;
    enableSecurityChecks: boolean;
    checkInterval: number;
    memoryThreshold: number;
    performanceThreshold: number;
}
/**
 * 代码质量检查器
 */
export declare class CodeQualityChecker {
    private config;
    private checkInterval;
    private errorHistory;
    private performanceHistory;
    private memorySnapshots;
    private startTime;
    constructor(config?: Partial<QualityCheckConfig>);
    /**
     * 开始质量检查
     */
    startChecking(): void;
    /**
     * 停止质量检查
     */
    stopChecking(): void;
    /**
     * 执行质量检查
     */
    performQualityCheck(): Promise<CodeQualityMetrics>;
    /**
     * 检测内存泄漏
     */
    private detectMemoryLeaks;
    /**
     * 计算内存增长趋势
     */
    private calculateMemoryTrend;
    /**
     * 检测性能问题
     */
    private detectPerformanceIssues;
    /**
     * 检测安全问题
     */
    private detectSecurityIssues;
    /**
     * 检测代码异味
     */
    private detectCodeSmells;
    /**
     * 获取严重问题
     */
    private getCriticalIssues;
    /**
     * 设置全局错误处理
     */
    private setupGlobalErrorHandling;
    /**
     * 记录错误模式
     */
    private recordError;
    /**
     * 提取错误模式
     */
    private extractErrorPattern;
    /**
     * 分类错误严重程度
     */
    private categorizeErrorSeverity;
    /**
     * 获取错误建议
     */
    private getErrorSuggestions;
    /**
     * 设置性能监控
     */
    private setupPerformanceMonitoring;
    /**
     * 生成质量报告
     */
    generateQualityReport(metrics: CodeQualityMetrics): string;
}
/**
 * 全局代码质量检查器实例
 */
export declare const codeQualityChecker: CodeQualityChecker;
//# sourceMappingURL=CodeQualityChecker.d.ts.map