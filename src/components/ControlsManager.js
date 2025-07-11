import { CONFIG } from '../utils/constants.js';
import { IControlsManager } from '../interfaces/components/IControlsManager.js';
import { eventBus, EVENTS } from '../utils/EventBus.js';

/**
 * 控制面板管理器
 * 负责管理主控制面板和菜单交互
 */
export class ControlsManager extends IControlsManager {
    constructor() {
        super();
        this.controlsElement = null;
        this.menuPanel = null;
        this.mainButton = null;
        this.isInitialized = false;
        this.isMenuOpen = false;
        this.activeSubPanels = new Set();
        this.panelCallbacks = {};
        this.currentState = {
            isVisible: true,
            isMenuOpen: false,
            activePanels: []
        };
        
        console.log('🎛️ ControlsManager已初始化');
    }
    
    /**
     * 初始化模块（IBaseModule接口方法）
     * @param {Object} config - 配置对象
     * @param {Object} dependencies - 依赖对象
     * @returns {Promise<void>}
     */
    async init(config = {}, dependencies = {}) {
        if (this.isInitialized) return;
        
        this.createControlsElement();
        this.bindEvents();
        this.bindEventBusEvents();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_CONTROLS_READY, {});
        
        console.log('✅ 控制面板管理器初始化完成');
    }
    
    /**
     * 初始化控制面板（向后兼容）
     */
    initControls() {
        if (this.isInitialized) return;
        
        this.createControlsElement();
        this.bindEvents();
        this.bindEventBusEvents();
        this.isInitialized = true;
        
        // 发布初始化完成事件
        eventBus.emit(EVENTS.UI_CONTROLS_READY, {});
        
        console.log('✅ 控制面板管理器初始化完成');
    }
    
    /**
     * 绑定事件总线事件
     */
    bindEventBusEvents() {
        // 监听控制面板显示/隐藏事件
        eventBus.on(EVENTS.UI_CONTROLS_SHOW, () => this.showControls());
        eventBus.on(EVENTS.UI_CONTROLS_HIDE, () => this.hideControls());
        
        // 监听面板切换事件
        eventBus.on(EVENTS.CONTROLS_TOGGLE_MODEL, () => this.togglePanel('model'));
        eventBus.on(EVENTS.CONTROLS_TOGGLE_PERFORMANCE, () => this.togglePanel('performance'));
        eventBus.on(EVENTS.CONTROLS_TOGGLE_FILTER, () => this.togglePanel('filter'));
    }
    
    /**
     * 创建控制面板元素
     */
    createControlsElement() {
        // 创建主控制容器
        this.controlsElement = document.createElement('div');
        this.controlsElement.id = 'controls-panel';
        this.controlsElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 20px;
            z-index: 999;
            font-family: Arial, sans-serif;
        `;
        
        // 主控制图标按钮
        this.mainButton = document.createElement('button');
        this.mainButton.id = 'main-control-btn';
        this.mainButton.style.cssText = `
            width: 50px;
            height: 50px;
            background: rgba(0, 0, 0, 0.8);
            color: white;
            border: none;
            border-radius: 50%;
            cursor: pointer;
            font-size: 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: all 0.3s ease;
            backdrop-filter: blur(10px);
            border: 2px solid rgba(255, 255, 255, 0.1);
        `;
        this.mainButton.innerHTML = '⚙️';
        this.mainButton.title = '控制面板';
        
        // 菜单面板
        this.menuPanel = document.createElement('div');
        this.menuPanel.id = 'control-menu';
        this.menuPanel.style.cssText = `
            position: absolute;
            top: 0;
            left: 60px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-size: 12px;
            min-width: 200px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            backdrop-filter: blur(10px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            display: none;
            opacity: 0;
            transform: translateX(-10px);
            transition: all 0.3s ease;
        `;
        
        this.menuPanel.innerHTML = `
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                <h3 style="margin: 0; font-size: 14px; color: #fff;">🎛️ 控制面板</h3>
            </div>
            
            <div class="main-menu-section">
                <div class="menu-item" data-panel="model" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                ">
                    <span style="display: flex; align-items: center;">
                        <span style="margin-right: 8px;">🤖</span>
                        <span>模型参数</span>
                    </span>
                    <span class="menu-arrow" style="
                        font-size: 10px;
                        transition: transform 0.2s ease;
                        opacity: 0.7;
                    ">▶</span>
                </div>
                
                <div class="menu-item" data-panel="performance" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                ">
                    <span style="display: flex; align-items: center;">
                        <span style="margin-right: 8px;">📊</span>
                        <span>系统监控</span>
                    </span>
                    <span class="menu-arrow" style="
                        font-size: 10px;
                        transition: transform 0.2s ease;
                        opacity: 0.7;
                    ">▶</span>
                </div>
                
                <div class="menu-item" data-panel="filter" style="
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    padding: 8px 12px;
                    margin-bottom: 4px;
                    background: rgba(255, 255, 255, 0.05);
                    border-radius: 6px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    border: 1px solid transparent;
                ">
                    <span style="display: flex; align-items: center;">
                        <span style="margin-right: 8px;">⚙️</span>
                        <span>滤波器参数</span>
                    </span>
                    <span class="menu-arrow" style="
                        font-size: 10px;
                        transition: transform 0.2s ease;
                        opacity: 0.7;
                    ">▶</span>
                </div>
            </div>
        `;
        
        // 组装元素
        this.controlsElement.appendChild(this.mainButton);
        this.controlsElement.appendChild(this.menuPanel);
        document.body.appendChild(this.controlsElement);
    }
    
    /**
     * 绑定事件
     */
    bindEvents() {
        // 主按钮点击事件
        this.mainButton.addEventListener('click', () => {
            this.toggleControlMenu();
        });
        
        // 菜单项事件
        const menuItems = this.menuPanel.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            // 悬停效果
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255, 255, 255, 0.1)';
                item.style.borderColor = 'rgba(52, 152, 219, 0.5)';
                const arrow = item.querySelector('.menu-arrow');
                if (arrow) arrow.style.opacity = '1';
            });
            
            item.addEventListener('mouseleave', () => {
                if (!item.classList.contains('active')) {
                    item.style.background = 'rgba(255, 255, 255, 0.05)';
                    item.style.borderColor = 'transparent';
                }
                const arrow = item.querySelector('.menu-arrow');
                if (arrow && !item.classList.contains('active')) {
                    arrow.style.opacity = '0.7';
                }
            });
            
            // 点击事件
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                const panelType = item.getAttribute('data-panel');
                this.toggleSubPanel(panelType, item);
            });
        });
        
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (!this.controlsElement.contains(e.target) && 
                !this.isClickOnSubPanel(e.target) && 
                this.isMenuOpen) {
                this.toggleControlMenu();
            }
        });
        
        // 键盘快捷键
        this.addKeyboardShortcuts();
    }
    
    /**
     * 切换控制菜单显示状态
     */
    toggleControlMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.currentState.isMenuOpen = this.isMenuOpen;
        
        if (this.isMenuOpen) {
            this.menuPanel.style.display = 'block';
            // 强制重绘以确保动画生效
            this.menuPanel.offsetHeight;
            this.menuPanel.style.opacity = '1';
            this.menuPanel.style.transform = 'translateX(0)';
            
            this.mainButton.style.background = 'rgba(52, 152, 219, 0.8)';
            this.mainButton.style.transform = 'rotate(90deg)';
            
            // 发布菜单打开事件
            eventBus.emit(EVENTS.CONTROLS_MENU_OPENED, {});
        } else {
            this.menuPanel.style.opacity = '0';
            this.menuPanel.style.transform = 'translateX(-10px)';
            
            setTimeout(() => {
                if (!this.isMenuOpen) {
                    this.menuPanel.style.display = 'none';
                }
            }, 300);
            
            this.mainButton.style.background = 'rgba(0, 0, 0, 0.8)';
            this.mainButton.style.transform = 'rotate(0deg)';
            
            // 发布菜单关闭事件
            eventBus.emit(EVENTS.CONTROLS_MENU_CLOSED, {});
        }
        
        console.log('🎛️ 控制菜单', this.isMenuOpen ? '打开' : '关闭');
    }
    
    /**
     * 切换子面板显示状态
     * @param {string} panelType - 面板类型
     * @param {HTMLElement} menuItem - 菜单项元素
     */
    toggleSubPanel(panelType, menuItem) {
        const isActive = this.activeSubPanels.has(panelType);
        
        if (isActive) {
            // 隐藏当前面板
            this.activeSubPanels.delete(panelType);
            this.updateMenuItemState(menuItem, false);
            this.triggerPanelCallback(panelType, false);
            
            // 发布面板隐藏事件
            eventBus.emit(`controls:panel:${panelType}:hidden`, { panelType });
        } else {
            // 先关闭所有其他子面板
            this.hideOtherSubPanels(panelType);
            
            // 显示当前面板
            this.activeSubPanels.clear();
            this.activeSubPanels.add(panelType);
            this.updateMenuItemState(menuItem, true);
            this.triggerPanelCallback(panelType, true);
            
            // 发布面板显示事件
            eventBus.emit(`controls:panel:${panelType}:shown`, { panelType });
        }
        
        // 更新状态
        this.currentState.activePanels = Array.from(this.activeSubPanels);
    }
    
    /**
     * 隐藏除指定面板外的所有其他子面板
     * @param {string} excludePanelType - 要排除的面板类型
     */
    hideOtherSubPanels(excludePanelType) {
        const allPanelTypes = ['model', 'performance', 'filter'];
        
        allPanelTypes.forEach(panelType => {
            if (panelType !== excludePanelType) {
                this.activeSubPanels.delete(panelType);
                this.triggerPanelCallback(panelType, false);
            }
        });
        
        // 更新菜单项状态
        const menuItems = this.menuPanel.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            const panelType = item.getAttribute('data-panel');
            if (panelType !== excludePanelType) {
                this.updateMenuItemState(item, false);
            }
        });
    }
    
    /**
     * 更新菜单项状态
     * @param {HTMLElement} menuItem - 菜单项元素
     * @param {boolean} active - 是否激活
     */
    updateMenuItemState(menuItem, active) {
        if (active) {
            menuItem.classList.add('active');
            menuItem.style.background = 'rgba(52, 152, 219, 0.3)';
            menuItem.style.borderColor = 'rgba(52, 152, 219, 0.8)';
            
            const arrow = menuItem.querySelector('.menu-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(90deg)';
                arrow.style.opacity = '1';
            }
        } else {
            menuItem.classList.remove('active');
            menuItem.style.background = 'rgba(255, 255, 255, 0.05)';
            menuItem.style.borderColor = 'transparent';
            
            const arrow = menuItem.querySelector('.menu-arrow');
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
                arrow.style.opacity = '0.7';
            }
        }
    }
    
    /**
     * 触发面板回调
     * @param {string} panelType - 面板类型
     * @param {boolean} show - 是否显示
     */
    triggerPanelCallback(panelType, show) {
        const callbackMap = {
            'model': 'onToggleModelPanel',
            'performance': 'onTogglePerformanceInfo',
            'filter': 'onToggleFilterPanel'
        };
        
        const callbackName = callbackMap[panelType];
        if (this.panelCallbacks[callbackName]) {
            this.panelCallbacks[callbackName](show);
        }
    }
    
    /**
     * 检查点击是否在子面板上
     * @param {HTMLElement} target - 点击目标
     * @returns {boolean} 是否在子面板上
     */
    isClickOnSubPanel(target) {
        const subPanelIds = ['model-panel', 'status-display', 'filter-panel'];
        
        for (const id of subPanelIds) {
            const panel = document.getElementById(id);
            if (panel && panel.contains(target)) {
                return true;
            }
        }
        
        return false;
    }
    
    /**
     * 绑定控制面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindControlEvents(callbacks = {}) {
        this.panelCallbacks = callbacks;
        console.log('🎛️ 控制面板事件已绑定');
    }
    
    /**
     * 更新控制面板状态
     * @param {Object} options - 选项状态
     */
    updateControlsState(options) {
        if (!this.menuPanel) return;
        
        const panelStates = {
            'model': options.showModelPanel,
            'performance': options.showPerformanceInfo,
            'filter': options.showFilterPanel
        };
        
        Object.entries(panelStates).forEach(([panelType, isEnabled]) => {
            const menuItem = this.menuPanel.querySelector(`[data-panel="${panelType}"]`);
            if (menuItem && typeof isEnabled === 'boolean') {
                if (isEnabled) {
                    this.activeSubPanels.add(panelType);
                    this.updateMenuItemState(menuItem, true);
                } else {
                    this.activeSubPanels.delete(panelType);
                    this.updateMenuItemState(menuItem, false);
                }
            }
        });
    }
    
    /**
     * 显示控制面板（接口方法）
     */
    showControls() {
        if (this.controlsElement) {
            this.controlsElement.style.display = 'block';
            this.currentState.isVisible = true;
            
            // 发布显示事件
            eventBus.emit(EVENTS.CONTROLS_SHOWN, {});
        }
    }
    
    /**
     * 隐藏控制面板（接口方法）
     */
    hideControls() {
        if (this.controlsElement) {
            this.controlsElement.style.display = 'none';
            this.currentState.isVisible = false;
            
            // 发布隐藏事件
            eventBus.emit(EVENTS.CONTROLS_HIDDEN, {});
        }
        
        // 同时隐藏菜单
        if (this.isMenuOpen) {
            this.toggleControlMenu();
        }
    }
    
    /**
     * 切换面板显示状态（接口方法）
     * @param {string} panelType - 面板类型
     */
    togglePanel(panelType) {
        const menuItem = this.menuPanel?.querySelector(`[data-panel="${panelType}"]`);
        if (menuItem) {
            this.toggleSubPanel(panelType, menuItem);
        }
    }
    
    /**
     * 显示控制面板（向后兼容）
     */
    show() {
        this.showControls();
    }
    
    /**
     * 隐藏控制面板（向后兼容）
     */
    hide() {
        this.hideControls();
    }
    
    /**
     * 切换控制面板显示状态（向后兼容）
     */
    toggle() {
        if (this.currentState.isVisible) {
            this.hideControls();
        } else {
            this.showControls();
        }
    }
    
    /**
     * 添加键盘快捷键
     */
    addKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + H: 切换控制面板
            if ((e.ctrlKey || e.metaKey) && e.key === 'h') {
                e.preventDefault();
                this.toggle();
                return;
            }
            
            // ESC: 隐藏菜单
            if (e.key === 'Escape' && this.isMenuOpen) {
                this.toggleControlMenu();
                return;
            }
        });
    }
    
    /**
     * 检查是否可见
     * @returns {boolean} 是否可见
     */
    isVisible() {
        return this.controlsElement && this.controlsElement.style.display !== 'none';
    }
    
    /**
     * 获取活动面板列表（接口方法）
     * @returns {Array} 活动面板列表
     */
    getActivePanels() {
        return Array.from(this.activeSubPanels);
    }
    
    /**
     * 获取模块状态（接口方法）
     * @returns {Object} 模块状态
     */
    getState() {
        return {
            isInitialized: this.isInitialized,
            isVisible: this.currentState.isVisible,
            isMenuOpen: this.currentState.isMenuOpen,
            activePanels: this.currentState.activePanels,
            panelCount: this.activeSubPanels.size
        };
    }
    
    /**
     * 重置模块（接口方法）
     */
    reset() {
        // 隐藏所有面板
        this.activeSubPanels.clear();
        this.currentState.activePanels = [];
        
        // 关闭菜单
        if (this.isMenuOpen) {
            this.toggleControlMenu();
        }
        
        // 重置菜单项状态
        if (this.menuPanel) {
            const menuItems = this.menuPanel.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                this.updateMenuItemState(item, false);
            });
        }
        
        // 发布重置事件
        eventBus.emit(EVENTS.CONTROLS_RESET, {});
    }
    
    /**
     * 销毁模块（接口方法）
     */
    destroy() {
        this.cleanup();
        
        // 发布销毁事件
        eventBus.emit(EVENTS.CONTROLS_DESTROYED, {});
    }
    
    // ==================== IBaseModule 接口方法 ====================
    
    /**
     * 获取模块状态（IBaseModule接口方法）
     * @returns {string} 模块状态
     */
    getStatus() {
        if (!this.isInitialized) return 'uninitialized';
        return this.currentState.isVisible ? 'active' : 'inactive';
    }
    
    /**
     * 获取模块名称（IBaseModule接口方法）
     * @returns {string} 模块名称
     */
    getName() {
        return 'ControlsManager';
    }
    
    /**
     * 获取模块版本（IBaseModule接口方法）
     * @returns {string} 模块版本
     */
    getVersion() {
        return '1.0.0';
    }
    
    /**
     * 清理控制面板（向后兼容）
     */
    cleanup() {
        if (this.controlsElement && this.controlsElement.parentNode) {
            this.controlsElement.parentNode.removeChild(this.controlsElement);
        }
        
        this.controlsElement = null;
        this.menuPanel = null;
        this.mainButton = null;
        this.isInitialized = false;
        this.isMenuOpen = false;
        this.activeSubPanels.clear();
        this.panelCallbacks = {};
        this.currentState = {
            isVisible: true,
            isMenuOpen: false,
            activePanels: []
        };
        
        console.log('🧹 ControlsManager清理完成');
    }
}

// 创建全局控制面板管理器实例
export const controlsManager = new ControlsManager();