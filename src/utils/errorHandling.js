import { CONFIG } from './constants.js';

/**
 * 错误处理工具类
 */
export class ErrorHandler {
    /**
     * 处理应用启动错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleStartupError(error) {
        console.error('❌ 启动错误:', error);
        
        let userMessage = '启动失败，请尝试以下解决方案：\n\n';
        
        if (error.message.includes('HTTPS')) {
            userMessage += '• 请使用HTTPS协议访问此页面\n• 或在本地环境(localhost)中运行';
        } else if (error.message.includes('摄像头') || error.message.includes('getUserMedia')) {
            userMessage += '• 请允许摄像头访问权限\n• 确保摄像头未被其他应用占用\n• 尝试刷新页面重新授权';
        } else if (error.message.includes('TensorFlow')) {
            userMessage += '• 网络连接问题，AI库加载失败\n• 请检查网络连接后刷新页面';
        } else if (error.message.includes('Canvas')) {
            userMessage += '• 浏览器不支持Canvas功能\n• 请使用现代浏览器(Chrome, Firefox, Safari, Edge)';
        } else {
            userMessage += '• 请刷新页面重试\n• 检查浏览器控制台获取详细错误信息\n• 确保使用现代浏览器';
        }
        
        userMessage += '\n\n详细错误: ' + error.message;
        return userMessage;
    }
    
    /**
     * 处理摄像头相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCameraError(error) {
        console.error('📷 摄像头错误:', error);
        
        if (error.name === 'NotAllowedError') {
            return '摄像头权限被拒绝，请在浏览器设置中允许摄像头访问权限。';
        } else if (error.name === 'NotFoundError') {
            return '未找到摄像头设备，请确保摄像头已正确连接。';
        } else if (error.name === 'NotReadableError') {
            return '摄像头被其他应用占用，请关闭其他使用摄像头的应用后重试。';
        } else if (error.name === 'OverconstrainedError') {
            return '摄像头不支持请求的配置，将尝试使用默认设置。';
        } else {
            return `摄像头访问失败: ${error.message}`;
        }
    }
    
    /**
     * 处理模型加载错误
     * @param {Error} error - 错误对象
     * @param {string} modelType - 模型类型
     * @returns {string} 用户友好的错误消息
     */
    static handleModelError(error, modelType = 'unknown') {
        console.error(`🤖 模型加载错误 (${modelType}):`, error);
        
        if (error.message.includes('fetch')) {
            return `网络连接问题，无法下载${modelType}模型。请检查网络连接后重试。`;
        } else if (error.message.includes('WebGL')) {
            return '浏览器WebGL支持有问题，请尝试更新浏览器或启用硬件加速。';
        } else {
            return `${modelType}模型加载失败: ${error.message}`;
        }
    }
    
    /**
     * 处理缓存相关错误
     * @param {Error} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    static handleCacheError(error) {
        console.warn('💾 缓存错误:', error);
        
        if (error.name === 'QuotaExceededError') {
            return '存储空间不足，将清理旧缓存后重试。';
        } else if (error.name === 'InvalidStateError') {
            return 'IndexedDB状态异常，将使用内存缓存。';
        } else {
            return `缓存操作失败: ${error.message}`;
        }
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
        return async (...args) => {
            try {
                return await asyncFn(...args);
            } catch (error) {
                console.error(`❌ ${context} 错误:`, error);
                throw ErrorHandler.createError(context, error.message, error);
            }
        };
    }
    
    /**
     * 重试机制
     * @param {Function} fn - 要重试的函数
     * @param {number} maxRetries - 最大重试次数
     * @param {number} delay - 重试延迟(ms)
     * @returns {Promise} 执行结果
     */
    static async retry(fn, maxRetries = 3, delay = 1000) {
        let lastError;
        
        for (let i = 0; i <= maxRetries; i++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error;
                
                if (i === maxRetries) {
                    throw error;
                }
                
                console.warn(`🔄 重试 ${i + 1}/${maxRetries}:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
            }
        }
        
        throw lastError;
    }
}

/**
 * 环境检查工具
 */
export class EnvironmentChecker {
    /**
     * 检查HTTPS环境
     * @throws {Error} 如果不是HTTPS环境
     */
    static checkHTTPS() {
        // 开发模式下可以跳过HTTPS检查
        if (CONFIG.DEVELOPMENT.SKIP_HTTPS_CHECK) {
            console.warn('🔧 开发模式：已跳过HTTPS检查');
            console.warn('⚠️ 注意：某些浏览器可能仍然限制HTTP环境下的摄像头访问');
            return true;
        }
        
        const isHTTPS = location.protocol === 'https:';
        const isLocalhost = location.hostname === 'localhost' || location.hostname === '127.0.0.1';
        
        if (!isHTTPS && !isLocalhost) {
            throw new Error('需要HTTPS环境才能访问摄像头');
        }
        
        // 即使是localhost，也建议使用HTTPS以获得最佳体验
        if (!isHTTPS && isLocalhost) {
            console.warn('⚠️ 建议使用HTTPS协议以获得最佳体验和完整功能支持');
        }
        
        return true;
    }
    
    /**
     * 检查浏览器兼容性
     * @returns {Object} 兼容性检查结果
     */
    static checkBrowserCompatibility() {
        const issues = [];
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            issues.push(CONFIG.ERROR_MESSAGES.CAMERA_NOT_SUPPORTED);
        }
        
        if (!window.tf || !window.poseDetection) {
            issues.push(CONFIG.ERROR_MESSAGES.TENSORFLOW_NOT_LOADED);
        }
        
        return {
            isCompatible: issues.length === 0,
            issues: issues
        };
    }
    
    /**
     * 检查Canvas支持
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果Canvas不支持
     */
    static checkCanvas(canvas) {
        if (!canvas) {
            throw new Error(CONFIG.ERROR_MESSAGES.CANVAS_NOT_FOUND);
        }
        
        if (!canvas.getContext) {
            throw new Error(CONFIG.ERROR_MESSAGES.CANVAS_NOT_SUPPORTED);
        }
    }
    
    /**
     * 执行完整的环境检查
     * @param {HTMLCanvasElement} canvas - Canvas元素
     * @throws {Error} 如果环境检查失败
     */
    static checkEnvironment(canvas) {
        this.checkHTTPS();
        this.checkBrowserCompatibility();
        this.checkCanvas(canvas);
    }
}

/**
 * 全局错误处理器
 */
export class GlobalErrorHandler {
    static init() {
        // 捕获未处理的Promise拒绝
        window.addEventListener('unhandledrejection', (event) => {
            console.error('❌ 未处理的Promise拒绝:', event.reason);
            event.preventDefault();
        });
        
        // 捕获全局错误
        window.addEventListener('error', (event) => {
            console.error('❌ 全局错误:', event.error);
        });
        
        // 捕获资源加载错误
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                console.error('❌ 资源加载错误:', event.target.src || event.target.href);
            }
        }, true);
    }
}