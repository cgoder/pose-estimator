import { CONFIG } from '../utils/constants.js';
import { IStatusManager } from '../interfaces/components/IStatusManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 状态管理器
 * 负责管理性能监控和系统状态显示
 */
export class StatusManager extends IStatusManager {
    constructor() {
        super();
        this.statusElement = null;
        this.isInitialized = false;
        this.isVisible = false;
        this.updateInterval = null;
        this.currentStats = {};
        this.customStats = new Map();
        
        console.log('📊 StatusManager已初始化');
    }
    
    /**
     * 初始化状态元素
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        if (this.isInitialized) return;
        
        this.createStatusElement();
        this.bindEventBusEvents();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_STATUS_READY, {});
        
        console.log('✅ 状态管理器初始化完成');
    }
    
    /**
     * 绑定事件总线事件
     */
    bindEventBusEvents() {
        // 监听状态显示/隐藏事件
        eventBus.on(EVENTS.UI_STATUS_SHOW, () => this.showStatus());
        eventBus.on(EVENTS.UI_STATUS_HIDE, () => this.hideStatus());
        
        // 监听状态更新事件
        eventBus.on(EVENTS.STATUS_UPDATE, (data) => this.updateStatus(data));
        eventBus.on(EVENTS.STATUS_RESET, () => this.resetStatus());
    }
    
    /**
     * 创建状态显示元素
     */
    createStatusElement() {
        this.statusElement = document.createElement('div');
        this.statusElement.id = 'status-display';
        this.statusElement.style.cssText = `
            position: fixed;
            top: 80px;
            right: 20px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Courier New', monospace;
            font-size: 12px;
            min-width: 250px;
            max-width: 350px;
            z-index: 998;
            display: none;
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideInFromTop 0.3s ease-out;
        `;
        
        this.statusElement.innerHTML = `
            <div style="
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
                padding-bottom: 8px;
                border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            ">
                <h3 style="margin: 0; font-size: 14px; color: #fff;">📊 系统监控</h3>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                    opacity: 0.7;
                    transition: opacity 0.2s ease;
                " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">×</button>
            </div>
            
            <div id="performance-stats" style="line-height: 1.4;">
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">🎯 FPS:</span>
                    <span id="fps-value" style="color: #2ecc71; font-weight: bold;">--</span>
                </div>
                
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">⚡ 推理时间:</span>
                    <span id="inference-time" style="color: #f39c12; font-weight: bold;">--</span>
                </div>
                
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">🧠 内存使用:</span>
                    <span id="memory-usage" style="color: #e74c3c; font-weight: bold;">--</span>
                </div>
                
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">💾 缓存命中:</span>
                    <span id="cache-hit-rate" style="color: #9b59b6; font-weight: bold;">--</span>
                </div>
                
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">🎨 渲染时间:</span>
                    <span id="render-time" style="color: #1abc9c; font-weight: bold;">--</span>
                </div>
                
                <div class="stat-row" style="display: flex; justify-content: space-between; margin-bottom: 6px;">
                    <span style="color: #3498db;">🔄 滤波器状态:</span>
                    <span id="filter-status" style="color: #34495e; font-weight: bold;">--</span>
                </div>
            </div>
            
            <div style="
                margin-top: 12px;
                padding-top: 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.2);
                font-size: 10px;
                color: #bdc3c7;
                text-align: center;
            ">
                实时更新 • 按ESC隐藏
            </div>
        `;
        
        // 添加滑入动画样式
        if (!document.querySelector('#status-animation-style')) {
            const style = document.createElement('style');
            style.id = 'status-animation-style';
            style.textContent = `
                @keyframes slideInFromTop {
                    0% {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                    100% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                }
                
                @keyframes slideOutToTop {
                    0% {
                        transform: translateY(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(-20px);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(this.statusElement);
    }
    
    /**
     * 显示状态面板（接口方法）
     */
    showStatus() {
        if (!this.statusElement) {
            this.init();
        }
        
        this.statusElement.style.display = 'block';
        this.statusElement.style.animation = 'slideInFromTop 0.3s ease-out';
        this.isVisible = true;
        
        // 发布显示事件
        eventBus.emit(EVENTS.STATUS_SHOWN, {});
        
        console.log('📊 显示状态监控面板');
    }
    
    /**
     * 隐藏状态面板（接口方法）
     * @param {boolean} immediate - 是否立即隐藏
     */
    hideStatus(immediate = false) {
        if (!this.statusElement) return;
        
        if (immediate) {
            this.statusElement.style.display = 'none';
        } else {
            this.statusElement.style.animation = 'slideOutToTop 0.3s ease-out';
            
            setTimeout(() => {
                if (this.statusElement) {
                    this.statusElement.style.display = 'none';
                }
            }, 300);
        }
        
        this.isVisible = false;
        
        // 发布隐藏事件
        eventBus.emit(EVENTS.STATUS_HIDDEN, {});
        
        console.log('📊 隐藏状态监控面板');
    }
    
    /**
     * 更新状态信息（接口方法）
     * @param {Object} data - 状态数据
     */
    updateStatus(data) {
        this.updateStats(data);
        this.currentStats = { ...this.currentStats, ...data };
        
        // 发布状态更新事件
        eventBus.emit(EVENTS.STATUS_UPDATED, { data, currentStats: this.currentStats });
    }
    
    /**
     * 显示状态面板（向后兼容）
     */
    show() {
        this.showStatus();
    }
    
    /**
     * 隐藏状态面板（向后兼容）
     * @param {boolean} immediate - 是否立即隐藏
     */
    hide(immediate = false) {
        this.hideStatus(immediate);
    }
    
    /**
     * 切换状态面板显示（向后兼容）
     */
    toggle() {
        if (this.isVisible) {
            this.hideStatus();
        } else {
            this.showStatus();
        }
    }
    
    /**
     * 更新性能统计信息
     * @param {Object} stats - 性能统计数据
     */
    updateStats(stats = {}) {
        if (!this.statusElement || !this.isVisible) return;
        
        // 更新FPS
        if (stats.fps !== undefined) {
            const fpsElement = this.statusElement.querySelector('#fps-value');
            if (fpsElement) {
                const fps = Math.round(stats.fps);
                fpsElement.textContent = `${fps}`;
                
                // 根据FPS设置颜色
                if (fps >= 30) {
                    fpsElement.style.color = '#2ecc71'; // 绿色
                } else if (fps >= 20) {
                    fpsElement.style.color = '#f39c12'; // 橙色
                } else {
                    fpsElement.style.color = '#e74c3c'; // 红色
                }
            }
        }
        
        // 更新推理时间
        if (stats.inferenceTime !== undefined) {
            const inferenceElement = this.statusElement.querySelector('#inference-time');
            if (inferenceElement) {
                inferenceElement.textContent = `${Math.round(stats.inferenceTime)}ms`;
            }
        }
        
        // 更新内存使用
        if (stats.memoryUsage !== undefined) {
            const memoryElement = this.statusElement.querySelector('#memory-usage');
            if (memoryElement) {
                const memoryMB = Math.round(stats.memoryUsage / 1024 / 1024);
                memoryElement.textContent = `${memoryMB}MB`;
            }
        }
        
        // 更新缓存命中率
        if (stats.cacheHitRate !== undefined) {
            const cacheElement = this.statusElement.querySelector('#cache-hit-rate');
            if (cacheElement) {
                const hitRate = Math.round(stats.cacheHitRate * 100);
                cacheElement.textContent = `${hitRate}%`;
                
                // 根据命中率设置颜色
                if (hitRate >= 80) {
                    cacheElement.style.color = '#2ecc71'; // 绿色
                } else if (hitRate >= 60) {
                    cacheElement.style.color = '#f39c12'; // 橙色
                } else {
                    cacheElement.style.color = '#e74c3c'; // 红色
                }
            }
        }
        
        // 更新渲染时间
        if (stats.renderTime !== undefined) {
            const renderElement = this.statusElement.querySelector('#render-time');
            if (renderElement) {
                renderElement.textContent = `${Math.round(stats.renderTime)}ms`;
            }
        }
        
        // 更新滤波器状态
        if (stats.filterEnabled !== undefined) {
            const filterElement = this.statusElement.querySelector('#filter-status');
            if (filterElement) {
                if (stats.filterEnabled) {
                    filterElement.textContent = '✅ 启用';
                    filterElement.style.color = '#2ecc71';
                } else {
                    filterElement.textContent = '❌ 禁用';
                    filterElement.style.color = '#e74c3c';
                }
            }
        }
    }
    
    /**
     * 重置状态信息（接口方法）
     */
    resetStatus() {
        this.resetStats();
        this.currentStats = {};
        
        // 发布重置事件
        eventBus.emit(EVENTS.STATUS_RESET, {});
    }
    
    /**
     * 重置所有统计信息（向后兼容）
     */
    resetStats() {
        if (!this.statusElement) return;
        
        const statElements = {
            '#fps-value': '--',
            '#inference-time': '--',
            '#memory-usage': '--',
            '#cache-hit-rate': '--',
            '#render-time': '--',
            '#filter-status': '--'
        };
        
        Object.entries(statElements).forEach(([selector, value]) => {
            const element = this.statusElement.querySelector(selector);
            if (element) {
                element.textContent = value;
                element.style.color = '#bdc3c7'; // 默认颜色
            }
        });
        
        // 重置自定义统计项
        this.customStats.forEach((_, id) => {
            const element = this.statusElement.querySelector(`#${id}`);
            if (element) {
                element.textContent = '--';
                element.style.color = '#bdc3c7';
            }
        });
        
        console.log('📊 重置状态统计信息');
    }
    
    /**
     * 开始自动更新
     * @param {Function} updateCallback - 更新回调函数
     * @param {number} interval - 更新间隔（毫秒）
     */
    startAutoUpdate(updateCallback, interval = 1000) {
        this.stopAutoUpdate(); // 先停止之前的更新
        
        this.updateInterval = setInterval(() => {
            if (this.isVisible && updateCallback) {
                updateCallback();
            }
        }, interval);
        
        console.log('📊 开始自动更新状态信息');
    }
    
    /**
     * 停止自动更新
     */
    stopAutoUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }
    
    /**
     * 检查是否可见（接口方法）
     * @returns {boolean} 是否可见
     */
    isStatusVisible() {
        return this.isVisible;
    }
    
    /**
     * 获取当前状态数据（接口方法）
     * @returns {Object} 当前状态数据
     */
    getCurrentStatus() {
        return { ...this.currentStats };
    }
    
    /**
     * 获取模块状态（接口方法）
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.isVisible,
            hasAutoUpdate: !!this.updateInterval,
            statsCount: Object.keys(this.currentStats).length,
            customStatsCount: this.customStats.size
        };
    }
    
    /**
     * 重置模块（接口方法）
     */
    reset() {
        this.resetStatus();
        this.stopAutoUpdate();
        
        // 发布重置事件
        eventBus.emit(EVENTS.STATUS_MODULE_RESET, {});
    }
    
    /**
     * 销毁模块（接口方法）
     */
    destroy() {
        this.cleanup();
        
        // 发布销毁事件
        eventBus.emit(EVENTS.STATUS_DESTROYED, {});
    }
    
    /**
     * 检查是否可见（向后兼容）
     * @returns {boolean} 是否可见
     */
    getVisibility() {
        return this.isVisible;
    }
    
    /**
     * 添加自定义统计项
     * @param {string} label - 标签
     * @param {string} id - 元素ID
     * @param {string} color - 颜色
     */
    addCustomStat(label, id, color = '#3498db') {
        if (!this.statusElement) return;
        
        const statsContainer = this.statusElement.querySelector('#performance-stats');
        if (!statsContainer) return;
        
        const statRow = document.createElement('div');
        statRow.className = 'stat-row';
        statRow.style.cssText = 'display: flex; justify-content: space-between; margin-bottom: 6px;';
        
        statRow.innerHTML = `
            <span style="color: ${color};">${label}:</span>
            <span id="${id}" style="color: #bdc3c7; font-weight: bold;">--</span>
        `;
        
        statsContainer.appendChild(statRow);
        
        // 记录自定义统计项
        this.customStats.set(id, { label, color });
        
        console.log('📊 添加自定义统计项:', label);
    }
    
    /**
     * 更新自定义统计项
     * @param {string} id - 元素ID
     * @param {string} value - 值
     * @param {string} color - 颜色
     */
    updateCustomStat(id, value, color = null) {
        if (!this.statusElement) return;
        
        const element = this.statusElement.querySelector(`#${id}`);
        if (element) {
            element.textContent = value;
            if (color) {
                element.style.color = color;
            }
        }
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
        return 'StatusManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 清理状态管理器（向后兼容）
     */
    cleanup() {
        this.stopAutoUpdate();
        
        if (this.statusElement && this.statusElement.parentNode) {
            this.statusElement.parentNode.removeChild(this.statusElement);
        }
        
        this.statusElement = null;
        this.isInitialized = false;
        this.isVisible = false;
        this.currentStats = {};
        this.customStats.clear();
        
        console.log('🧹 StatusManager清理完成');
    }
}

// 创建全局状态管理器实例
export const statusManager = new StatusManager();