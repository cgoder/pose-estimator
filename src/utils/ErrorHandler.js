/**
 * 错误处理工具类
 * 提供统一的错误处理、分类和报告功能
 */

import { ERROR_CODES } from '../config/constants.js';
import { logger } from './Logger.js';
import { performanceMonitor } from './PerformanceMonitor.js';

/**
 * 错误严重级别枚举
 */
export const ERROR_SEVERITY = {
    LOW: 'low',
    MEDIUM: 'medium',
    HIGH: 'high',
    CRITICAL: 'critical'
};

/**
 * 错误类型枚举
 */
export const ERROR_TYPES = {
    CAMERA: 'camera',
    VIDEO: 'video',
    IMAGE: 'image',
    CANVAS: 'canvas',
    NETWORK: 'network',
    VALIDATION: 'validation',
    PERFORMANCE: 'performance',
    SYSTEM: 'system'
};

/**
 * 增强的输入源错误类
 */
export class InputSourceError extends Error {
    constructor(code, message, originalError = null, context = {}) {
        super(message);
        this.name = 'InputSourceError';
        this.code = code;
        this.originalError = originalError;
        this.context = context;
        this.timestamp = new Date().toISOString();
        this.severity = this._determineSeverity(code);
        this.type = this._determineType(code);
        this.stack = originalError?.stack || this.stack;
    }

    /**
     * 确定错误严重级别
     * @param {string} code - 错误代码
     * @returns {string} 严重级别
     * @private
     */
    _determineSeverity(code) {
        const criticalCodes = [
            ERROR_CODES.CANVAS_RENDER_ERROR,
            ERROR_CODES.SYSTEM_ERROR
        ];
        
        const highCodes = [
            ERROR_CODES.CAMERA_ACCESS_DENIED,
            ERROR_CODES.VIDEO_LOAD_ERROR,
            ERROR_CODES.IMAGE_LOAD_ERROR
        ];
        
        const mediumCodes = [
            ERROR_CODES.INVALID_FILE_TYPE,
            ERROR_CODES.FILE_TOO_LARGE,
            ERROR_CODES.INVALID_DIMENSIONS
        ];
        
        if (criticalCodes.includes(code)) return ERROR_SEVERITY.CRITICAL;
        if (highCodes.includes(code)) return ERROR_SEVERITY.HIGH;
        if (mediumCodes.includes(code)) return ERROR_SEVERITY.MEDIUM;
        return ERROR_SEVERITY.LOW;
    }

    /**
     * 确定错误类型
     * @param {string} code - 错误代码
     * @returns {string} 错误类型
     * @private
     */
    _determineType(code) {
        if (code.includes('CAMERA')) return ERROR_TYPES.CAMERA;
        if (code.includes('VIDEO')) return ERROR_TYPES.VIDEO;
        if (code.includes('IMAGE')) return ERROR_TYPES.IMAGE;
        if (code.includes('CANVAS')) return ERROR_TYPES.CANVAS;
        if (code.includes('NETWORK')) return ERROR_TYPES.NETWORK;
        if (code.includes('VALIDATION')) return ERROR_TYPES.VALIDATION;
        if (code.includes('PERFORMANCE')) return ERROR_TYPES.PERFORMANCE;
        return ERROR_TYPES.SYSTEM;
    }

    /**
     * 转换为JSON格式
     * @returns {Object} JSON对象
     */
    toJSON() {
        return {
            name: this.name,
            code: this.code,
            message: this.message,
            severity: this.severity,
            type: this.type,
            timestamp: this.timestamp,
            context: this.context,
            originalError: this.originalError ? {
                name: this.originalError.name,
                message: this.originalError.message,
                stack: this.originalError.stack
            } : null
        };
    }

    /**
     * 获取用户友好的错误消息
     * @returns {string} 用户友好的消息
     */
    getUserFriendlyMessage() {
        const friendlyMessages = {
            [ERROR_CODES.CAMERA_ACCESS_DENIED]: '无法访问摄像头，请检查权限设置',
            [ERROR_CODES.VIDEO_LOAD_ERROR]: '视频文件加载失败，请检查文件格式',
            [ERROR_CODES.IMAGE_LOAD_ERROR]: '图片文件加载失败，请检查文件格式',
            [ERROR_CODES.INVALID_FILE_TYPE]: '不支持的文件类型',
            [ERROR_CODES.FILE_TOO_LARGE]: '文件大小超出限制',
            [ERROR_CODES.INVALID_DIMENSIONS]: '图片或视频尺寸不符合要求',
            [ERROR_CODES.CANVAS_RENDER_ERROR]: '渲染出现问题，请刷新页面重试'
        };
        
        return friendlyMessages[this.code] || this.message;
    }
}

/**
 * 错误处理器类
 */
export class ErrorHandler {
    constructor() {
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.errorCounts = new Map();
        this.lastErrorTime = new Map();
        this.suppressionThreshold = 5; // 相同错误在短时间内超过此次数将被抑制
        this.suppressionWindow = 60000; // 抑制窗口时间（毫秒）
        this.context = null; // 当前上下文
    }

    /**
     * 设置错误处理器的上下文
     * @param {string} context - 上下文名称
     */
    setContext(context) {
        this.context = context;
        logger.debug(`ErrorHandler 上下文设置为: ${context}`);
    }

    /**
     * 获取当前上下文
     * @returns {string|null} 当前上下文
     */
    getContext() {
        return this.context;
    }

    /**
     * 处理错误
     * @param {Error|InputSourceError} error - 错误对象
     * @param {Object} context - 上下文信息
     * @returns {InputSourceError} 处理后的错误对象
     */
    handleError(error, context = {}) {
        let processedError;
        
        // 合并当前上下文和传入的上下文
        const mergedContext = {
            ...context,
            handlerContext: this.context
        };
        
        // 如果不是 InputSourceError，则转换为 InputSourceError
        if (!(error instanceof InputSourceError)) {
            processedError = new InputSourceError(
                ERROR_CODES.SYSTEM_ERROR,
                error.message || '未知错误',
                error,
                mergedContext
            );
        } else {
            processedError = error;
            processedError.context = { ...processedError.context, ...mergedContext };
        }
        
        // 检查是否应该抑制此错误
        if (this._shouldSuppressError(processedError)) {
            logger.debug('错误被抑制', {
                code: processedError.code,
                message: processedError.message,
                suppressionCount: this.errorCounts.get(processedError.code)
            });
            return processedError;
        }
        
        // 记录错误
        this._recordError(processedError);
        
        // 根据严重级别记录日志
        this._logError(processedError);
        
        // 记录性能影响
        this._recordPerformanceImpact(processedError);
        
        // 触发错误恢复机制
        this._attemptRecovery(processedError);
        
        return processedError;
    }

    /**
     * 检查是否应该抑制错误
     * @param {InputSourceError} error - 错误对象
     * @returns {boolean} 是否应该抑制
     * @private
     */
    _shouldSuppressError(error) {
        const now = Date.now();
        const lastTime = this.lastErrorTime.get(error.code) || 0;
        const count = this.errorCounts.get(error.code) || 0;
        
        // 如果在抑制窗口内且错误次数超过阈值
        if (now - lastTime < this.suppressionWindow && count >= this.suppressionThreshold) {
            return true;
        }
        
        // 重置计数器（如果超出窗口时间）
        if (now - lastTime >= this.suppressionWindow) {
            this.errorCounts.set(error.code, 0);
        }
        
        return false;
    }

    /**
     * 记录错误
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _recordError(error) {
        // 更新错误计数
        const count = this.errorCounts.get(error.code) || 0;
        this.errorCounts.set(error.code, count + 1);
        this.lastErrorTime.set(error.code, Date.now());
        
        // 添加到历史记录
        this.errorHistory.push(error.toJSON());
        
        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory.shift();
        }
    }

    /**
     * 记录错误日志
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _logError(error) {
        const logData = {
            code: error.code,
            type: error.type,
            severity: error.severity,
            context: error.context,
            userMessage: error.getUserFriendlyMessage()
        };
        
        switch (error.severity) {
            case ERROR_SEVERITY.CRITICAL:
                logger.error(`[CRITICAL] ${error.message}`, logData);
                break;
            case ERROR_SEVERITY.HIGH:
                logger.error(`[HIGH] ${error.message}`, logData);
                break;
            case ERROR_SEVERITY.MEDIUM:
                logger.warn(`[MEDIUM] ${error.message}`, logData);
                break;
            case ERROR_SEVERITY.LOW:
            default:
                logger.info(`[LOW] ${error.message}`, logData);
                break;
        }
    }

    /**
     * 记录性能影响
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _recordPerformanceImpact(error) {
        if (error.type === ERROR_TYPES.PERFORMANCE || error.severity === ERROR_SEVERITY.CRITICAL) {
            performanceMonitor.recordMetric('error_impact', 1, {
                errorCode: error.code,
                errorType: error.type,
                severity: error.severity
            });
        }
    }

    /**
     * 尝试错误恢复
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _attemptRecovery(error) {
        // 根据错误类型实施不同的恢复策略
        switch (error.type) {
            case ERROR_TYPES.CAMERA:
                this._recoverFromCameraError(error);
                break;
            case ERROR_TYPES.CANVAS:
                this._recoverFromCanvasError(error);
                break;
            case ERROR_TYPES.PERFORMANCE:
                this._recoverFromPerformanceError(error);
                break;
            default:
                logger.debug('无可用的自动恢复策略', { errorType: error.type });
                break;
        }
    }

    /**
     * 从摄像头错误中恢复
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _recoverFromCameraError(error) {
        logger.info('尝试从摄像头错误中恢复', { errorCode: error.code });
        // 可以实施重试逻辑、降级到默认约束等
    }

    /**
     * 从Canvas错误中恢复
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _recoverFromCanvasError(error) {
        logger.info('尝试从Canvas错误中恢复', { errorCode: error.code });
        // 可以实施Canvas重置、降低渲染质量等
    }

    /**
     * 从性能错误中恢复
     * @param {InputSourceError} error - 错误对象
     * @private
     */
    _recoverFromPerformanceError(error) {
        logger.info('尝试从性能错误中恢复', { errorCode: error.code });
        // 可以实施降低帧率、减少处理复杂度等
    }

    /**
     * 获取错误统计信息
     * @returns {Object} 错误统计
     */
    getErrorStatistics() {
        const stats = {
            totalErrors: this.errorHistory.length,
            errorsByType: {},
            errorsBySeverity: {},
            errorsByCode: {},
            recentErrors: this.errorHistory.slice(-10)
        };
        
        this.errorHistory.forEach(error => {
            // 按类型统计
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
            
            // 按严重级别统计
            stats.errorsBySeverity[error.severity] = (stats.errorsBySeverity[error.severity] || 0) + 1;
            
            // 按错误代码统计
            stats.errorsByCode[error.code] = (stats.errorsByCode[error.code] || 0) + 1;
        });
        
        return stats;
    }

    /**
     * 清除错误历史
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.errorCounts.clear();
        this.lastErrorTime.clear();
        logger.info('错误历史已清除');
    }

    /**
     * 设置抑制阈值
     * @param {number} threshold - 抑制阈值
     * @param {number} window - 抑制窗口时间（毫秒）
     */
    setSuppressionSettings(threshold, window) {
        this.suppressionThreshold = threshold;
        this.suppressionWindow = window;
        logger.info('错误抑制设置已更新', { threshold, window });
    }

    /**
     * 重置错误处理器状态
     */
    reset() {
        this.clearErrorHistory();
        logger.info('ErrorHandler 已重置');
    }

    /**
     * 获取错误统计信息（别名方法，用于兼容性）
     * @returns {Object} 错误统计
     */
    getErrorStats() {
        return this.getErrorStatistics();
    }
}

// 默认错误处理器实例
export const errorHandler = new ErrorHandler();

// 便捷函数
export const handleError = (error, context) => errorHandler.handleError(error, context);
export const createError = (code, message, originalError, context) => 
    new InputSourceError(code, message, originalError, context);

export default ErrorHandler;