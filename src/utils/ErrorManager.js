/**
 * 统一错误管理器
 * 提供统一的错误处理、格式化和重试机制
 */
export class ErrorManager {
    constructor() {
        this.errorHistory = [];
        this.maxHistorySize = 50;
        this.retryConfig = {
            maxRetries: 3,
            baseDelay: 1000,
            maxDelay: 10000
        };
    }

    /**
     * 统一错误处理入口
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @param {Object} options - 处理选项
     * @returns {Object} 格式化的错误信息
     */
    handleError(error, context = 'Unknown', options = {}) {
        const errorInfo = this.formatError(error, context);
        
        // 记录错误历史
        this.addToHistory(errorInfo);
        
        // 根据错误类型决定处理策略
        const strategy = this.getErrorStrategy(error, context);
        
        return {
            ...errorInfo,
            strategy,
            userMessage: this.getUserMessage(error, context),
            shouldRetry: strategy.retryable,
            severity: this.getErrorSeverity(error, context)
        };
    }

    /**
     * 格式化错误信息
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {Object} 格式化的错误信息
     */
    formatError(error, context) {
        return {
            id: this.generateErrorId(),
            timestamp: new Date().toISOString(),
            context,
            type: error.name || 'Error',
            message: error.message,
            stack: error.stack,
            originalError: error
        };
    }

    /**
     * 获取用户友好的错误消息
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {string} 用户友好的错误消息
     */
    getUserMessage(error, context) {
        const errorType = this.classifyError(error, context);
        
        const messageMap = {
            'camera_permission': '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问权限。',
            'camera_not_found': '未找到摄像头设备，请确保摄像头已正确连接。',
            'camera_occupied': '摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试。',
            'network_error': '网络连接问题，请检查网络连接后重试。',
            'model_load_error': 'AI模型加载失败，请检查网络连接后重试。',
            'webgl_error': '浏览器WebGL支持有问题，请尝试更新浏览器或启用硬件加速。',
            'https_required': '需要HTTPS环境才能访问摄像头，请使用HTTPS协议访问。',
            'browser_not_supported': '浏览器不支持所需功能，请使用现代浏览器(Chrome, Firefox, Safari, Edge)。',
            'storage_quota_exceeded': '存储空间不足，将清理旧缓存后重试。',
            'canvas_error': '浏览器不支持Canvas功能，请使用现代浏览器。',
            'generic': `操作失败: ${error.message}。请刷新页面重试。`
        };
        
        return messageMap[errorType] || messageMap.generic;
    }

    /**
     * 分类错误类型
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {string} 错误分类
     */
    classifyError(error, context) {
        const message = error.message.toLowerCase();
        const name = error.name;
        
        // 摄像头相关错误
        if (name === 'NotAllowedError' || message.includes('permission')) {
            return 'camera_permission';
        }
        if (name === 'NotFoundError' || message.includes('camera') || message.includes('device')) {
            return 'camera_not_found';
        }
        if (name === 'NotReadableError' || message.includes('occupied')) {
            return 'camera_occupied';
        }
        
        // 网络相关错误
        if (message.includes('fetch') || message.includes('network') || message.includes('timeout')) {
            return 'network_error';
        }
        
        // 模型加载错误
        if (context.includes('model') || message.includes('tensorflow') || message.includes('model')) {
            return 'model_load_error';
        }
        
        // WebGL错误
        if (message.includes('webgl') || message.includes('gpu')) {
            return 'webgl_error';
        }
        
        // HTTPS错误
        if (message.includes('https') || message.includes('secure')) {
            return 'https_required';
        }
        
        // 浏览器兼容性错误
        if (message.includes('not supported') || message.includes('unsupported')) {
            return 'browser_not_supported';
        }
        
        // 存储错误
        if (name === 'QuotaExceededError' || message.includes('quota')) {
            return 'storage_quota_exceeded';
        }
        
        // Canvas错误
        if (message.includes('canvas') || context.includes('canvas')) {
            return 'canvas_error';
        }
        
        return 'generic';
    }

    /**
     * 获取错误处理策略
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {Object} 错误处理策略
     */
    getErrorStrategy(error, context) {
        const errorType = this.classifyError(error, context);
        
        const strategies = {
            'camera_permission': { retryable: false, autoRecover: false, userAction: 'grant_permission' },
            'camera_not_found': { retryable: false, autoRecover: false, userAction: 'check_device' },
            'camera_occupied': { retryable: true, autoRecover: true, userAction: 'close_other_apps' },
            'network_error': { retryable: true, autoRecover: true, userAction: 'check_network' },
            'model_load_error': { retryable: true, autoRecover: true, userAction: 'check_network' },
            'webgl_error': { retryable: false, autoRecover: false, userAction: 'update_browser' },
            'https_required': { retryable: false, autoRecover: false, userAction: 'use_https' },
            'browser_not_supported': { retryable: false, autoRecover: false, userAction: 'update_browser' },
            'storage_quota_exceeded': { retryable: true, autoRecover: true, userAction: 'clear_cache' },
            'canvas_error': { retryable: false, autoRecover: false, userAction: 'update_browser' },
            'generic': { retryable: true, autoRecover: false, userAction: 'refresh_page' }
        };
        
        return strategies[errorType] || strategies.generic;
    }

    /**
     * 获取错误严重程度
     * @param {Error} error - 错误对象
     * @param {string} context - 错误上下文
     * @returns {string} 错误严重程度
     */
    getErrorSeverity(error, context) {
        const errorType = this.classifyError(error, context);
        
        const severityMap = {
            'camera_permission': 'critical',
            'camera_not_found': 'critical',
            'https_required': 'critical',
            'browser_not_supported': 'critical',
            'canvas_error': 'critical',
            'camera_occupied': 'high',
            'webgl_error': 'high',
            'model_load_error': 'medium',
            'network_error': 'medium',
            'storage_quota_exceeded': 'low',
            'generic': 'medium'
        };
        
        return severityMap[errorType] || 'medium';
    }

    /**
     * 异步操作重试包装器
     * @param {Function} asyncFn - 异步函数
     * @param {string} context - 操作上下文
     * @param {Object} retryOptions - 重试选项
     * @returns {Function} 包装后的函数
     */
    withRetry(asyncFn, context = 'Unknown', retryOptions = {}) {
        const options = { ...this.retryConfig, ...retryOptions };
        
        return async (...args) => {
            let lastError;
            
            for (let attempt = 0; attempt <= options.maxRetries; attempt++) {
                try {
                    return await asyncFn(...args);
                } catch (error) {
                    lastError = error;
                    
                    const errorInfo = this.handleError(error, context);
                    
                    // 如果错误不可重试，直接抛出
                    if (!errorInfo.shouldRetry || attempt === options.maxRetries) {
                        throw error;
                    }
                    
                    // 计算延迟时间（指数退避）
                    const delay = Math.min(
                        options.baseDelay * Math.pow(2, attempt),
                        options.maxDelay
                    );
                    
                    console.warn(`🔄 重试 ${attempt + 1}/${options.maxRetries} (${context}):`, error.message);
                    await this.delay(delay);
                }
            }
            
            throw lastError;
        };
    }

    /**
     * 延迟函数
     * @param {number} ms - 延迟毫秒数
     * @returns {Promise} 延迟Promise
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * 添加错误到历史记录
     * @param {Object} errorInfo - 错误信息
     */
    addToHistory(errorInfo) {
        this.errorHistory.unshift(errorInfo);
        
        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }

    /**
     * 生成错误ID
     * @returns {string} 错误ID
     */
    generateErrorId() {
        return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 获取错误历史
     * @param {number} limit - 限制数量
     * @returns {Array} 错误历史
     */
    getErrorHistory(limit = 10) {
        return this.errorHistory.slice(0, limit);
    }

    /**
     * 清理错误历史
     */
    clearHistory() {
        this.errorHistory = [];
    }

    /**
     * 获取错误统计
     * @returns {Object} 错误统计信息
     */
    getErrorStats() {
        const stats = {
            total: this.errorHistory.length,
            byType: {},
            bySeverity: {},
            byContext: {}
        };
        
        this.errorHistory.forEach(error => {
            // 按类型统计
            const errorType = this.classifyError(error.originalError, error.context);
            stats.byType[errorType] = (stats.byType[errorType] || 0) + 1;
            
            // 按严重程度统计
            const severity = this.getErrorSeverity(error.originalError, error.context);
            stats.bySeverity[severity] = (stats.bySeverity[severity] || 0) + 1;
            
            // 按上下文统计
            stats.byContext[error.context] = (stats.byContext[error.context] || 0) + 1;
        });
        
        return stats;
    }
}

// 创建全局错误管理器实例
export const errorManager = new ErrorManager();

// 全局错误处理器初始化
export function initGlobalErrorHandler() {
    // 捕获未处理的Promise拒绝
    window.addEventListener('unhandledrejection', (event) => {
        const errorInfo = errorManager.handleError(event.reason, 'UnhandledPromiseRejection');
        console.error('❌ 未处理的Promise拒绝:', errorInfo);
        event.preventDefault();
    });
    
    // 捕获全局错误
    window.addEventListener('error', (event) => {
        const errorInfo = errorManager.handleError(event.error, 'GlobalError');
        console.error('❌ 全局错误:', errorInfo);
    });
    
    // 捕获资源加载错误
    window.addEventListener('error', (event) => {
        if (event.target !== window) {
            const error = new Error(`资源加载失败: ${event.target.src || event.target.href}`);
            const errorInfo = errorManager.handleError(error, 'ResourceLoadError');
            console.error('❌ 资源加载错误:', errorInfo);
        }
    }, true);
}