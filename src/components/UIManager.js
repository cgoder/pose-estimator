import { CONFIG } from '../utils/constants.js';
import { LoadingManager } from './LoadingManager.js';
import { ErrorManager } from './ErrorManager.js';
import { ControlsManager } from './ControlsManager.js';
import { StatusManager } from './StatusManager.js';
import { PanelManager } from './PanelManager.js';

/**
 * UI管理器类 - 重构版本
 * 负责协调各个UI模块的工作
 */
export class UIManager {
    constructor() {
        // 初始化各个管理器
        this.loadingManager = new LoadingManager();
        this.errorManager = new ErrorManager();
        this.controlsManager = new ControlsManager();
        this.statusManager = new StatusManager();
        this.panelManager = new PanelManager();
        
        this.isInitialized = false;
        this.callbacks = {};
        
        console.log('🎨 UIManager已重构初始化');
    }
    
    /**
     * 初始化UI元素
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        if (this.isInitialized) return;
        
        // 初始化各个管理器
        await this.loadingManager.init();
        await this.errorManager.init();
        await this.statusManager.init();
        await this.panelManager.init();
        
        // 初始化控制管理器并绑定回调
        await this.controlsManager.init();
        this.bindControlsCallbacks();
        
        this.isInitialized = true;
        console.log('✅ UI管理器重构初始化完成');
    }
    
    /**
     * 绑定控制面板回调
     */
    bindControlsCallbacks() {
        this.controlsManager.bindControlEvents({
            onToggleModelPanel: () => this.panelManager.showModelPanel(),
            onTogglePerformanceInfo: () => this.statusManager.toggleVisibility(),
            onToggleFilterPanel: () => this.panelManager.showFilterPanel()
        });
        
        // 绑定面板管理器回调
        this.panelManager.bindCallbacks({
            onModelChange: (model) => this.triggerCallback('onModelChange', model),
            onScoreThresholdChange: (threshold) => this.triggerCallback('onScoreThresholdChange', threshold),
            onToggleSkeleton: (enabled) => this.triggerCallback('onToggleSkeleton', enabled),
            onToggleKeypoints: (enabled) => this.triggerCallback('onToggleKeypoints', enabled),
            onToggleCache: (enabled) => this.triggerCallback('onToggleCache', enabled),
            onResetModelParams: () => this.triggerCallback('onResetModelParams'),
            onToggleFilter: (enabled) => this.triggerCallback('onToggleFilter', enabled),
            onFilterParamChange: (data) => this.triggerCallback('onFilterParamChange', data),
            onResetFilterParams: () => this.triggerCallback('onResetFilterParams'),
            onApplyFilterParams: () => this.triggerCallback('onApplyFilterParams')
        });
    }
    
    // === 加载状态管理 ===
    
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {string} progress - 进度信息
     */
    showLoading(message = '正在加载...', progress = '') {
        this.loadingManager.show(message, progress);
    }
    
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        this.loadingManager.hide();
    }
    
    /**
     * 更新加载消息
     * @param {string} message - 新消息
     * @param {string} progress - 进度信息
     */
    updateLoading(message, progress = '') {
        this.loadingManager.updateMessage(message);
        if (progress) {
            this.loadingManager.updateProgress(progress);
        }
    }
    
    // === 错误消息管理 ===
    
    /**
     * 显示错误消息
     * @param {string} message - 错误消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showError(message, duration = 5000) {
        this.errorManager.showError(message, duration);
    }
    
    /**
     * 显示警告消息
     * @param {string} message - 警告消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showWarning(message, duration = 4000) {
        this.errorManager.showWarning(message, duration);
    }
    
    /**
     * 显示信息消息
     * @param {string} message - 信息消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showInfo(message, duration = 3000) {
        this.errorManager.showInfo(message, duration);
    }
    
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showSuccess(message, duration = 3000) {
        this.errorManager.showSuccess(message, duration);
    }
    
    /**
     * 隐藏错误消息
     */
    hideError() {
        this.errorManager.hide();
    }
    
    // === 控制面板管理 ===
    
    /**
     * 显示控制面板
     */
    showControls() {
        this.controlsManager.show();
    }
    
    /**
     * 隐藏控制面板
     */
    hideControls() {
        this.controlsManager.hide();
    }
    
    /**
     * 切换控制面板显示状态
     */
    toggleControls() {
        this.controlsManager.toggle();
    }
    
    /**
     * 绑定控制面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindControlEvents(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        console.log('🎛️ 控制面板事件已绑定');
    }
    
    /**
     * 更新控制面板状态
     * @param {Object} options - 选项状态
     */
    updateControlsState(options) {
        this.controlsManager.updateState(options);
    }
    
    // === 状态监控管理 ===
    
    /**
     * 显示状态面板
     */
    showStatus() {
        this.statusManager.show();
    }
    
    /**
     * 隐藏状态面板
     */
    hideStatus() {
        this.statusManager.hide();
    }
    
    /**
     * 切换状态面板显示
     */
    toggleStatus() {
        this.statusManager.toggleVisibility();
    }
    
    /**
     * 更新性能统计
     * @param {Object} stats - 性能统计数据
     */
    updatePerformanceStats(stats) {
        this.statusManager.updateStats(stats);
    }
    
    /**
     * 重置性能统计
     */
    resetPerformanceStats() {
        this.statusManager.resetStats();
    }
    
    /**
     * 开始自动更新状态
     * @param {number} interval - 更新间隔（毫秒）
     */
    startStatusAutoUpdate(interval = 1000) {
        this.statusManager.startAutoUpdate(interval);
    }
    
    /**
     * 停止自动更新状态
     */
    stopStatusAutoUpdate() {
        this.statusManager.stopAutoUpdate();
    }
    
    // === 面板管理 ===
    
    /**
     * 显示模型参数面板
     */
    showModelPanel() {
        this.panelManager.showModelPanel();
    }
    
    /**
     * 隐藏模型参数面板
     */
    hideModelPanel() {
        this.panelManager.hideModelPanel();
    }
    
    /**
     * 显示滤波器参数面板
     */
    showFilterPanel() {
        this.panelManager.showFilterPanel();
    }
    
    /**
     * 隐藏滤波器参数面板
     */
    hideFilterPanel() {
        this.panelManager.hideFilterPanel();
    }
    
    // === 键盘快捷键 ===
    
    /**
     * 添加键盘快捷键支持
     * @param {Object} shortcuts - 快捷键配置
     */
    addKeyboardShortcuts(shortcuts = {}) {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + H: 切换控制面板
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggleControls();
                return;
            }
            
            // Ctrl/Cmd + R: 重启（如果有回调）
            if ((e.ctrlKey || e.metaKey) && e.key === 'r' && shortcuts.onRestart) {
                e.preventDefault();
                shortcuts.onRestart();
                return;
            }
            
            // 空格键: 暂停/继续（如果有回调）
            if (e.key === ' ' && shortcuts.onTogglePause) {
                e.preventDefault();
                shortcuts.onTogglePause();
                return;
            }
            
            // ESC: 隐藏所有面板
            if (e.key === 'Escape') {
                this.hideControls();
                this.hideError();
                this.hideModelPanel();
                this.hideFilterPanel();
                return;
            }
        });
        
        console.log('⌨️ 键盘快捷键已启用: Ctrl+H(控制面板), Ctrl+R(重启), Space(暂停), ESC(隐藏)');
    }
    
    // === 回调管理 ===
    
    /**
     * 绑定回调函数
     * @param {Object} callbacks - 回调函数对象
     */
    bindCallbacks(callbacks = {}) {
        this.callbacks = { ...this.callbacks, ...callbacks };
        console.log('🔗 UI回调函数已绑定');
    }
    
    /**
     * 触发回调函数
     * @param {string} callbackName - 回调函数名
     * @param {*} data - 传递的数据
     */
    triggerCallback(callbackName, data) {
        if (this.callbacks[callbackName]) {
            this.callbacks[callbackName](data);
        }
    }
    
    // === 状态获取 ===
    
    /**
     * 获取当前UI状态
     * @returns {Object} UI状态信息
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            loading: this.loadingManager.getVisibility(),
            error: this.errorManager.getVisibility(),
            controls: this.controlsManager.getVisibility(),
            status: this.statusManager.getVisibility(),
            panels: this.panelManager.getVisibility()
        };
    }
    
    /**
     * 获取所有管理器的引用
     * @returns {Object} 管理器对象
     */
    getManagers() {
        return {
            loading: this.loadingManager,
            error: this.errorManager,
            controls: this.controlsManager,
            status: this.statusManager,
            panels: this.panelManager
        };
    }
    
    // === IBaseModule 接口方法 ===
    
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
        return 'UIManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 销毁模块（IBaseModule接口）
     * @returns {Promise<void>}
     */
    async destroy() {
        this.cleanup();
    }
    
    /**
     * 重置模块（IBaseModule接口）
     * @returns {Promise<void>}
     */
    async reset() {
        // 重置各个管理器
        if (this.loadingManager.reset) await this.loadingManager.reset();
        if (this.errorManager.reset) await this.errorManager.reset();
        if (this.controlsManager.reset) await this.controlsManager.reset();
        if (this.statusManager.reset) await this.statusManager.reset();
        if (this.panelManager.reset) await this.panelManager.reset();
        
        console.log('🔄 UIManager已重置');
    }
    
    // === 清理 ===
    
    /**
     * 清理所有UI元素
     */
    cleanup() {
        // 清理各个管理器
        this.loadingManager.cleanup();
        this.errorManager.cleanup();
        this.controlsManager.cleanup();
        this.statusManager.cleanup();
        this.panelManager.cleanup();
        
        this.isInitialized = false;
        this.callbacks = {};
        
        console.log('🧹 UI管理器清理完成');
    }
}

// 创建全局UI管理器实例
export const uiManager = new UIManager();