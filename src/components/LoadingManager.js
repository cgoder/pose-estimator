import { CONFIG } from '../utils/constants.js';
import { ILoadingManager } from '../interfaces/components/ILoadingManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 加载状态管理器
 * 负责管理应用的加载状态显示
 * 实现ILoadingManager接口
 */
export class LoadingManager extends ILoadingManager {
    constructor() {
        super();
        this.loadingElement = null;
        this.isInitialized = false;
        this.currentProgress = 0;
        this.currentMessage = '';
        
        // 绑定事件监听器
        this.bindEvents();
        
        console.log('⏳ LoadingManager已初始化');
    }
    
    /**
     * 初始化加载元素
     * @param {Object} config - 配置对象
     * @returns {Promise<void>}
     */
    async init(config = {}) {
        if (this.isInitialized) return;
        
        this.createLoadingElement();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_LOADING_READY, { manager: this });
        
        console.log('✅ 加载管理器初始化完成');
    }
    
    /**
     * 绑定事件监听器
     */
    bindEvents() {
        // 监听全局加载事件
        eventBus.on(EVENTS.UI_LOADING_SHOW, (data) => {
            this.showLoading(data.message, data.options);
        });
        
        eventBus.on(EVENTS.UI_LOADING_HIDE, () => {
            this.hideLoading();
        });
        
        eventBus.on(EVENTS.LOADING_UPDATE, (data) => {
            this.updateProgress(data.progress, data.message);
        });
    }
    
    /**
     * 创建加载状态元素
     */
    createLoadingElement() {
        this.loadingElement = document.createElement('div');
        this.loadingElement.id = 'loading-status';
        this.loadingElement.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 20px 30px;
            border-radius: 10px;
            font-family: Arial, sans-serif;
            font-size: 16px;
            text-align: center;
            z-index: 1000;
            display: none;
            min-width: 200px;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
        `;
        
        this.loadingElement.innerHTML = `
            <div style="margin-bottom: 15px;">
                <div style="
                    width: 40px;
                    height: 40px;
                    border: 4px solid #f3f3f3;
                    border-top: 4px solid #3498db;
                    border-radius: 50%;
                    animation: spin 1s linear infinite;
                    margin: 0 auto;
                "></div>
            </div>
            <div id="loading-text">正在初始化...</div>
            <div id="loading-progress" style="
                margin-top: 10px;
                font-size: 12px;
                color: #ccc;
            "></div>
        `;
        
        // 添加旋转动画样式
        if (!document.querySelector('#loading-spinner-style')) {
            const style = document.createElement('style');
            style.id = 'loading-spinner-style';
            style.textContent = `
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.loadingElement);
    }
    
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {Object} options - 选项
     */
    showLoading(message = '正在加载...', options = {}) {
        if (!this.loadingElement) {
            this.init();
        }
        
        this.currentMessage = message;
        
        const textElement = this.loadingElement.querySelector('#loading-text');
        const progressElement = this.loadingElement.querySelector('#loading-progress');
        
        if (textElement) textElement.textContent = message;
        if (progressElement && options.progress) {
            progressElement.textContent = options.progress;
        }
        
        this.loadingElement.style.display = 'block';
        
        // 发布加载显示事件
        eventBus.emit(EVENTS.LOADING_SHOWN, { message, options });
        
        console.log('⏳ 显示加载状态:', message, options);
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        
        this.currentMessage = '';
        this.currentProgress = 0;
        
        // 发布加载隐藏事件
        eventBus.emit(EVENTS.LOADING_HIDDEN);
        
        console.log('✅ 隐藏加载状态');
    }
    
    /**
     * 更新加载消息
     * @param {string} message - 新的加载消息
     */
    updateMessage(message) {
        if (!this.loadingElement) return;
        
        const textElement = this.loadingElement.querySelector('#loading-text');
        if (textElement) {
            textElement.textContent = message;
        }
    }
    
    /**
     * 更新加载进度
     * @param {number} progress - 进度百分比 (0-100)
     * @param {string} message - 进度消息
     */
    updateProgress(progress, message) {
        if (!this.loadingElement) return;
        
        this.currentProgress = progress;
        if (message) {
            this.currentMessage = message;
        }
        
        const textElement = this.loadingElement.querySelector('#loading-text');
        const progressElement = this.loadingElement.querySelector('#loading-progress');
        
        if (textElement && message) {
            textElement.textContent = message;
        }
        
        if (progressElement) {
            progressElement.textContent = `${Math.round(progress)}%`;
        }
        
        // 发布进度更新事件
        eventBus.emit(EVENTS.LOADING_PROGRESS, { progress, message });
    }
    
    /**
     * 检查是否正在加载
     * @returns {boolean}
     */
    isLoading() {
        return this.loadingElement && this.loadingElement.style.display !== 'none';
    }
    
    /**
     * 获取模块状态
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isLoading: this.isLoading(),
            currentMessage: this.currentMessage,
            currentProgress: this.currentProgress
        };
    }
    
    /**
     * 重置模块到初始状态
     * @returns {Promise<void>}
     */
    async reset() {
        this.hideLoading();
        this.currentMessage = '';
        this.currentProgress = 0;
        
        // 发布重置事件
        eventBus.emit(EVENTS.LOADING_RESET);
        
        console.log('🔄 LoadingManager已重置');
    }
    
    /**
     * 销毁模块，清理资源
     * @returns {Promise<void>}
     */
    async destroy() {
        // 移除事件监听器
        eventBus.removeAllListeners('loading');
        
        if (this.loadingElement && this.loadingElement.parentNode) {
            this.loadingElement.parentNode.removeChild(this.loadingElement);
        }
        
        this.loadingElement = null;
        this.isInitialized = false;
        this.currentMessage = '';
        this.currentProgress = 0;
        
        // 发布销毁事件
        eventBus.emit(EVENTS.LOADING_DESTROYED);
        
        console.log('🧹 LoadingManager已销毁');
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
        return 'LoadingManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    // 保持向后兼容性的方法
    show(message, progress) {
        this.showLoading(message, { progress });
    }
    
    hide() {
        this.hideLoading();
    }
    
    isVisible() {
        return this.isLoading();
    }
    
    cleanup() {
        this.destroy();
    }
}

// 创建全局加载管理器实例
export const loadingManager = new LoadingManager();