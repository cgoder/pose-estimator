import { errorManager } from './ErrorManager.js';
import { environmentManager } from './EnvironmentManager.js';

/**
 * 错误处理工具类（兼容性包装器）
 * @deprecated 建议直接使用 ErrorManager
 */
export class ErrorHandler {
    /**
     * 处理应用启动错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleStartupError(error) {
        const errorInfo = errorManager.handleError(error, 'ApplicationStartup');
        return errorInfo.userMessage;
    }
    
    /**
     * 处理摄像头相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCameraError(error) {
        const errorInfo = errorManager.handleError(error, 'CameraAccess');
        return errorInfo.userMessage;
    }
    
    /**
     * 处理模型加载错误
     * @param {Error} error - 错误对象
     * @param {string} modelType - 模型类型
     * @returns {string} 用户友好的错误消息
     */
    static handleModelError(error, modelType = 'unknown') {
        const errorInfo = errorManager.handleError(error, `ModelLoad_${modelType}`);
        return errorInfo.userMessage;
    }
    
    /**
     * 处理缓存相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCacheError(error) {
        const errorInfo = errorManager.handleError(error, 'CacheOperation');
        return errorInfo.userMessage;
    }
    
    /**
     * 通用错误处理方法
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {Object} 错误信息对象
     */
    static handleError(error, context = 'Unknown') {
        return errorManager.handleError(error, context);
    }
    
    /**
     * 创建自定义错误
     * @param {string} type - 错误类型
     * @param {string} message - 错误消息
     * @param {Error} originalError - 原始错误
     * @returns {Error} 自定义错误对象
     */
    static createError(type, message, originalError = null) {
        const error = new Error(message);
        error.type = type;
        error.originalError = originalError;
        error.timestamp = new Date().toISOString();
        return error;
    }
    
    /**
     * 异步错误处理包装器
     * @param {Function} asyncFn - 异步函数
     * @param {string} context - 错误上下文
     * @returns {Function} 包装后的函数
     */
    static asyncWrapper(asyncFn, context = 'Unknown') {
        return errorManager.withRetry(asyncFn, context, { maxRetries: 0 });
    }
    
    /**
     * 重试机制
     * @param {Function} fn - 要重试的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试延迟(ms)
     * @returns {Promise} 执行结果
     */
    static async retry(fn, maxRetries = 3, delay = 1000) {
        const retryFn = errorManager.withRetry(fn, 'RetryOperation', {
            maxRetries,
            baseDelay: delay
        });
        return retryFn();
    }
}

/**
 * 环境检查工具（兼容性包装器）
 * @deprecated 建议直接使用 EnvironmentManager
 */
export class EnvironmentChecker {
    /**
     * 检查HTTPS环境
     * @throws {Error} 如果不是HTTPS环境
     */
    static async checkHTTPS() {
        if (!environmentManager.getEnvironmentInfo()) {
            await environmentManager.init();
        }
        
        const envInfo = environmentManager.getEnvironmentInfo();
        if (!envInfo || !envInfo.security) {
            throw new Error('环境信息初始化失败，无法检查HTTPS状态');
        }
        
        const security = envInfo.security;
        
        if (!security.canAccessCamera && !security.isLocalhost) {
            throw new Error('需要HTTPS环境才能访问摄像头');
        }
        
        if (security.recommendHTTPS) {
            console.warn('⚠️ 建议使用HTTPS协议以获得最佳体验和完整功能支持');
        }
        
        return true;
    }
    
    /**
     * 检查浏览器兼容性
     * @returns {Object} 兼容性检查结果
     */
    static async checkBrowserCompatibility() {
        if (!environmentManager.getEnvironmentInfo()) {
            await environmentManager.init();
        }
        
        const report = environmentManager.getCompatibilityReport();
        
        // 处理环境信息未初始化的情况
        if (report.error) {
            return {
                isCompatible: false,
                issues: [report.error]
            };
        }
        
        return {
            isCompatible: report.compatible || false,
            issues: report.issues || []
        };
    }
    
    /**
     * 检查Canvas支持
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果Canvas不支持
     */
    static checkCanvas(canvas) {
        if (!canvas) {
            throw new Error('Canvas元素未找到，请检查HTML结构');
        }
        
        if (!canvas.getContext) {
            throw new Error('浏览器不支持Canvas API');
        }
    }
    
    /**
     * 执行完整的环境检查
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果环境检查失败
     */
    static async checkEnvironment(canvas) {
        await this.checkHTTPS();
        const compatibility = await this.checkBrowserCompatibility();
        this.checkCanvas(canvas);
        
        if (!compatibility.isCompatible) {
            throw new Error(`环境兼容性检查失败: ${compatibility.issues.join(', ')}`);
        }
    }
}

/**
 * 全局错误处理器（兼容性包装器）
 * @deprecated 建议直接使用 ErrorManager 的 initGlobalErrorHandler
 */
export class GlobalErrorHandler {
    static init() {
        // 使用新的错误管理器初始化全局错误处理
        const { initGlobalErrorHandler } = require('./ErrorManager.js');
        initGlobalErrorHandler();
    }
}

// 导出新的错误管理器实例以保持兼容性
export { errorManager, environmentManager };
export { initGlobalErrorHandler } from './ErrorManager.js';