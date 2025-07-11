import { IBaseModule } from '../core/IBaseModule.js';

/**
 * 错误管理器接口
 */
export class IErrorManager extends IBaseModule {
    /**
     * 显示错误消息
     * @param {string|Error} error - 错误消息或错误对象
     * @param {Object} options - 显示选项
     */
    showError(error, options = {}) {
        throw new Error('IErrorManager.showError must be implemented');
    }

    /**
     * 显示警告消息
     * @param {string} message - 警告消息
     * @param {Object} options - 显示选项
     */
    showWarning(message, options = {}) {
        throw new Error('IErrorManager.showWarning must be implemented');
    }

    /**
     * 显示信息消息
     * @param {string} message - 信息消息
     * @param {Object} options - 显示选项
     */
    showInfo(message, options = {}) {
        throw new Error('IErrorManager.showInfo must be implemented');
    }

    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {Object} options - 显示选项
     */
    showSuccess(message, options = {}) {
        throw new Error('IErrorManager.showSuccess must be implemented');
    }

    /**
     * 清除所有消息
     */
    clearAll() {
        throw new Error('IErrorManager.clearAll must be implemented');
    }

    /**
     * 清除特定类型的消息
     * @param {string} type - 消息类型
     */
    clearByType(type) {
        throw new Error('IErrorManager.clearByType must be implemented');
    }

    /**
     * 处理全局错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    handleGlobalError(error, context = {}) {
        throw new Error('IErrorManager.handleGlobalError must be implemented');
    }

    /**
     * 记录错误
     * @param {Error} error - 错误对象
     * @param {Object} context - 错误上下文
     */
    logError(error, context = {}) {
        throw new Error('IErrorManager.logError must be implemented');
    }

    /**
     * 获取错误历史
     * @returns {Array} 错误历史记录
     */
    getErrorHistory() {
        throw new Error('IErrorManager.getErrorHistory must be implemented');
    }

    /**
     * 获取错误统计
     * @returns {Object} 错误统计信息
     */
    getErrorStats() {
        throw new Error('IErrorManager.getErrorStats must be implemented');
    }
}

export default IErrorManager;