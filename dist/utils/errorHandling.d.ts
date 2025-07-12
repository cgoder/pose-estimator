/**
 * 自定义错误接口
 */
export interface CustomError extends Error {
    type?: string;
    originalError?: Error | null;
    timestamp?: string;
}
/**
 * 兼容性检查结果接口
 */
export interface CompatibilityResult {
    isCompatible: boolean;
    issues: string[];
}
/**
 * 错误处理工具类
 */
export declare class ErrorHandler {
    /**
     * 处理启动错误
     */
    static handleStartupError(error: unknown): void;
    /**
     * 处理摄像头相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCameraError(error: Error): string;
    /**
     * 处理模型加载错误
     * @param {Error} error - 错误对象
     * @param {string} modelType - 模型类型
     * @returns {string} 用户友好的错误消息
     */
    static handleModelError(error: Error, modelType?: string): string;
    /**
     * 处理缓存相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCacheError(error: Error): string;
    /**
     * 创建自定义错误
     * @param {string} type - 错误类型
     * @param {string} message - 错误消息
     * @param {Error} originalError - 原始错误
     * @returns {Error} 自定义错误对象
     */
    static createError(type: string, message: string, originalError?: Error | null): CustomError;
    /**
     * 异步错误处理包装器
     * @param {Function} asyncFn - 异步函数
     * @param {string} context - 错误上下文
     * @returns {Function} 包装后的函数
     */
    static asyncWrapper<T extends any[], R>(asyncFn: (...args: T) => Promise<R>, context?: string): (...args: T) => Promise<R>;
    /**
     * 重试机制
     * @param {Function} fn - 要重试的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试延迟(ms)
     * @returns {Promise} 执行结果
     */
    static retry<T>(fn: () => Promise<T>, maxRetries?: number, delay?: number): Promise<T>;
}
/**
 * 环境检查工具
 */
export declare class EnvironmentChecker {
    /**
     * 检查HTTPS环境
     * @throws {Error} 如果不是HTTPS环境
     */
    static checkHTTPS(): boolean;
    /**
     * 检查浏览器兼容性
     * @returns {Object} 兼容性检查结果
     */
    static checkBrowserCompatibility(): CompatibilityResult;
    /**
     * 检查Canvas支持
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果Canvas不支持
     */
    static checkCanvas(canvas: HTMLCanvasElement | null): void;
    /**
     * 执行完整的环境检查
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果环境检查失败
     */
    static checkEnvironment(canvas: HTMLCanvasElement | null): void;
}
/**
 * 全局错误处理器
 */
export declare class GlobalErrorHandler {
    static init(): void;
}
//# sourceMappingURL=errorHandling.d.ts.map