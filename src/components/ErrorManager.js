import { CONFIG } from '../utils/constants.js';
import { IErrorManager } from '../interfaces/components/IErrorManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 错误管理器
 * 负责管理错误消息的显示和处理
 * 实现IErrorManager接口
 */
export class ErrorManager extends IErrorManager {
    constructor() {
        super();
        this.errorElement = null;
        this.isInitialized = false;
        this.autoHideTimeout = null;
        this.errorHistory = [];
        this.maxHistorySize = 50;
        
        // 绑定事件监听器
        this.bindEvents();
        
        console.log('❌ ErrorManager已初始化');
    }
    
    /**
     * 初始化错误元素
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async init(config = {}) {
        if (this.isInitialized) return;
        
        this.createErrorElement();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_ERROR_READY, { manager: this });
        
        console.log('✅ 错误管理器初始化完成');
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听全局错误事件
        eventBus.on(EVENTS.UI_ERROR_SHOW, (data) => {
            this.showError(data.error, data.options);
        });
        
        eventBus.on(EVENTS.UI_ERROR_HIDE, () => {
            this.hideError();
        });
        
        eventBus.on(EVENTS.ERROR_WARNING, (data) => {
            this.showWarning(data.message, data.options);
        });
        
        eventBus.on(EVENTS.ERROR_INFO, (data) => {
            this.showInfo(data.message, data.options);
        });
        
        eventBus.on(EVENTS.ERROR_SUCCESS, (data) => {
            this.showSuccess(data.message, data.options);
        });
    }
    
    /**
     * 创建错误显示元素
     */
    createErrorElement() {
        this.errorElement = document.createElement('div');
        this.errorElement.id = 'error-display';
        this.errorElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 400px;
            z-index: 1001;
            display: none;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            animation: slideInFromRight 0.3s ease-out;
        `;
        
        // 添加滑入动画样式
        if (!document.querySelector('#error-animation-style')) {
            const style = document.createElement('style');
            style.id = 'error-animation-style';
            style.textContent = `
                @keyframes slideInFromRight {
                    0% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutToRight {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.errorElement);
    }
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     * @param {number} duration - 自动隐藏时长（毫秒），0表示不自动隐藏
     * @param {string} type - 错误类型 ('error', 'warning', 'info')
     */
    show(message, duration = 5000, type = 'error') {
        if (!this.errorElement) {
            this.init();
        }
        
        // 清除之前的自动隐藏定时器
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
        
        // 根据类型设置样式
        const colors = {
            error: { bg: '#ff4444', icon: '❌' },
            warning: { bg: '#ff9800', icon: '⚠️' },
            info: { bg: '#2196f3', icon: 'ℹ️' }
        };
        
        const color = colors[type] || colors.error;
        this.errorElement.style.background = color.bg;
        
        this.errorElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; margin-right: 10px;">
                    <span style="margin-right: 8px;">${color.icon}</span>
                    ${message}
                </div>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
            </div>
        `;
        
        this.errorElement.style.display = 'block';
        this.errorElement.style.animation = 'slideInFromRight 0.3s ease-out';
        
        // 设置自动隐藏
        if (duration > 0) {
            this.autoHideTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
        
        console.log(`❌ 显示${type}消息:`, message);
    }
    
    /**
     * 显示错误消息
     * @param {string|Error} error - 错误信息
     * @param {Object} options - 选项
     */
    showError(error, options = {}) {
        const message = error instanceof Error ? error.message : error;
        const duration = options.duration || 5000;
        
        this.addToHistory('error', message, error);
        this.show(message, duration, 'error');
        
        // 发布错误事件
        eventBus.emit(EVENTS.ERROR_SHOWN, { error, message, type: 'error' });
    }
    
    /**
     * 显示警告消息
     * @param {string} message - 警告消息
     * @param {Object} options - 选项
     */
    showWarning(message, options = {}) {
        const duration = options.duration || 4000;
        
        this.addToHistory('warning', message);
        this.show(message, duration, 'warning');
        
        // 发布警告事件
        eventBus.emit(EVENTS.ERROR_WARNING_SHOWN, { message, type: 'warning' });
    }
    
    /**
     * 显示信息消息
     * @param {string} message - 信息消息
     * @param {Object} options - 选项
     */
    showInfo(message, options = {}) {
        const duration = options.duration || 3000;
        
        this.addToHistory('info', message);
        this.show(message, duration, 'info');
        
        // 发布信息事件
        eventBus.emit(EVENTS.ERROR_INFO_SHOWN, { message, type: 'info' });
    }
    
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {Object} options - 选项
     */
    showSuccess(message, options = {}) {
        const duration = options.duration || 3000;
        
        this.addToHistory('success', message);
        
        if (!this.errorElement) {
            this.init();
        }
        
        // 清除之前的自动隐藏定时器
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
        
        this.errorElement.style.background = '#27ae60';
        
        this.errorElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; margin-right: 10px;">
                    <span style="margin-right: 8px;">✅</span>
                    ${message}
                </div>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.8;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.8'">×</button>
            </div>
        `;
        
        this.errorElement.style.display = 'block';
        this.errorElement.style.animation = 'slideInFromRight 0.3s ease-out';
        
        // 设置自动隐藏
        if (duration > 0) {
            this.autoHideTimeout = setTimeout(() => {
                this.hide();
            }, duration);
        }
        
        // 发布成功事件
        eventBus.emit(EVENTS.ERROR_SUCCESS_SHOWN, { message, type: 'success' });
        
        console.log('✅ 显示成功消息:', message);
    }
    
    /**
     * 隐藏错误消息
     */
    hide() {
        if (this.errorElement) {
            this.errorElement.style.animation = 'slideOutToRight 0.3s ease-out';
            
            setTimeout(() => {
                if (this.errorElement) {
                    this.errorElement.style.display = 'none';
                }
            }, 300);
        }
        
        // 清除自动隐藏定时器
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
        
        // 发布隐藏事件
        eventBus.emit(EVENTS.ERROR_HIDDEN, {});
        
        console.log('✅ 隐藏错误消息');
    }
    
    /**
     * 隐藏错误消息（接口方法）
     */
    hideError() {
        this.hide();
    }
    
    /**
     * 检查是否正在显示
     * @returns {boolean} 是否正在显示
     */
    isVisible() {
        return this.errorElement && this.errorElement.style.display !== 'none';
    }
    
    /**
     * 添加错误到历史记录
     * @param {string} type - 错误类型
     * @param {string} message - 错误消息
     * @param {Error} error - 错误对象（可选）
     */
    addToHistory(type, message, error = null) {
        const entry = {
            id: Date.now() + Math.random(),
            type,
            message,
            error,
            timestamp: new Date().toISOString(),
            stack: error ? error.stack : null
        };
        
        this.errorHistory.unshift(entry);
        
        // 限制历史记录大小
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(0, this.maxHistorySize);
        }
    }
    
    /**
     * 获取错误历史记录
     * @param {number} limit - 限制数量
     * @returns {Array} 错误历史记录
     */
    getErrorHistory(limit = null) {
        return limit ? this.errorHistory.slice(0, limit) : [...this.errorHistory];
    }
    
    /**
     * 清除错误历史记录
     */
    clearHistory() {
        this.errorHistory = [];
        eventBus.emit(EVENTS.ERROR_HISTORY_CLEARED, {});
    }
    
    /**
     * 获取模块状态
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.isVisible(),
            historyCount: this.errorHistory.length,
            hasAutoHideTimeout: !!this.autoHideTimeout
        };
    }
    
    /**
     * 重置模块
     */
    reset() {
        this.hide();
        this.clearHistory();
        eventBus.emit(EVENTS.ERROR_RESET, {});
    }
    
    /**
     * 销毁模块
     */
    destroy() {
        this.cleanup();
        eventBus.emit(EVENTS.ERROR_DESTROYED, {});
    }
    
    /**
     * 获取模块状态（IBaseModule接口）
     * @returns {string} 模块状态
     */
    getStatus() {
        return this.isInitialized ? 'initialized' : 'not_initialized';
    }
    
    /**
     * 获取模块名称（IBaseModule接口）
     * @returns {string} 模块名称
     */
    getName() {
        return 'ErrorManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 清理错误元素（向后兼容）
     */
    cleanup() {
        // 清除定时器
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }
        
        if (this.errorElement && this.errorElement.parentNode) {
            this.errorElement.parentNode.removeChild(this.errorElement);
        }
        
        this.errorElement = null;
        this.isInitialized = false;
        this.errorHistory = [];
        
        console.log('🧹 ErrorManager清理完成');
    }
}

// 创建全局错误管理器实例
export const errorManager = new ErrorManager();