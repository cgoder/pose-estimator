/**
 * UI管理器类
 * 负责管理加载状态、错误显示、用户界面交互等
 */
export class UIManager {
    constructor() {
        this.loadingElement = null;
        this.errorElement = null;
        this.controlsElement = null;
        this.statusElement = null;
        this.filterPanelElement = null;
        this.modelPanelElement = null;
        this.isInitialized = false;
        this.isMenuOpen = false;
        this.menuPanel = null;
        this.mainButton = null;
        this.activeSubPanels = new Set();
        this.panelCallbacks = null;
        console.log('🎨 UIManager已初始化');
    }
    /**
     * 初始化UI元素
     */
    init() {
        if (this.isInitialized)
            return;
        this.createLoadingElement();
        this.createErrorElement();
        this.createControlsElement();
        this.createStatusElement();
        this.createModelPanelElement();
        this.createFilterPanelElement();
        this.isInitialized = true;
        console.log('✅ UI元素初始化完成');
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
        const style = document.createElement('style');
        style.textContent = `
            @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(this.loadingElement);
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
        `;
        document.body.appendChild(this.errorElement);
    }
    /**
     * 创建控制面板元素 - 可收拢式菜单设计
     */
    createControlsElement() {
        // 创建主控制图标
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
        const mainButton = document.createElement('button');
        mainButton.id = 'main-control-btn';
        mainButton.style.cssText = `
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
        mainButton.innerHTML = '⚙️';
        mainButton.title = '控制面板';
        // 菜单面板
        const menuPanel = document.createElement('div');
        menuPanel.id = 'control-menu';
        menuPanel.style.cssText = `
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
        menuPanel.innerHTML = `
            <div style="margin-bottom: 15px; padding-bottom: 10px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);">
                <h3 style="margin: 0; font-size: 14px; color: #fff;">🎛️ 控制面板</h3>
            </div>
            
            <!-- 主菜单选项 -->
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
        this.controlsElement.appendChild(mainButton);
        this.controlsElement.appendChild(menuPanel);
        // 绑定主按钮点击事件
        mainButton.addEventListener('click', () => {
            this.toggleControlMenu();
        });
        // 绑定菜单项事件
        const menuItems = menuPanel.querySelectorAll('.menu-item');
        menuItems.forEach(item => {
            // 悬停效果
            item.addEventListener('mouseenter', () => {
                item.style.background = 'rgba(255, 255, 255, 0.1)';
                item.style.borderColor = 'rgba(52, 152, 219, 0.5)';
                const arrow = item.querySelector('.menu-arrow');
                if (arrow)
                    arrow.style.opacity = '1';
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
                if (panelType) {
                    this.toggleSubPanel(panelType, item);
                }
            });
        });
        // 点击外部关闭菜单
        document.addEventListener('click', (e) => {
            if (this.controlsElement && e.target &&
                !this.controlsElement.contains(e.target) &&
                !this.isClickOnSubPanel(e.target) &&
                this.isMenuOpen) {
                this.toggleControlMenu();
            }
        });
        document.body.appendChild(this.controlsElement);
        // 存储菜单状态
        this.isMenuOpen = false;
        this.menuPanel = menuPanel;
        this.mainButton = mainButton;
        this.activeSubPanels = new Set(); // 跟踪当前激活的子面板
    }
    /**
     * 切换子面板显示状态
     * @param {string} panelType - 面板类型 ('model', 'performance', 'filter')
     * @param {HTMLElement} menuItem - 对应的菜单项元素
     */
    toggleSubPanel(panelType, menuItem) {
        const isActive = this.activeSubPanels.has(panelType);
        if (isActive) {
            // 隐藏当前面板
            this.hideSubPanel(panelType);
            this.updateMenuItemState(menuItem, false);
            this.activeSubPanels.delete(panelType);
            this.triggerPanelCallback(panelType, false);
        }
        else {
            // 先关闭所有其他子面板（同一时间只允许一个子面板）
            this.hideOtherSubPanels(panelType);
            // 显示当前面板
            this.showSubPanel(panelType);
            this.updateMenuItemState(menuItem, true);
            this.activeSubPanels.clear();
            this.activeSubPanels.add(panelType);
            this.triggerPanelCallback(panelType, true);
        }
    }
    /**
     * 显示指定的子面板
     * @param {string} panelType - 面板类型
     */
    showSubPanel(panelType) {
        switch (panelType) {
            case 'model':
                this.showModelPanel();
                break;
            case 'performance':
                this.showStatus();
                break;
            case 'filter':
                this.showFilterPanel();
                break;
        }
    }
    /**
     * 隐藏指定的子面板
     * @param {string} panelType - 面板类型
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideSubPanel(panelType, immediate = false) {
        switch (panelType) {
            case 'model':
                this.hideModelPanel(immediate);
                break;
            case 'performance':
                this.hideStatus(immediate);
                break;
            case 'filter':
                this.hideFilterPanel(immediate);
                break;
        }
    }
    /**
     * 隐藏除指定面板外的所有其他子面板
     * @param {string} excludePanelType - 要排除的面板类型
     */
    hideOtherSubPanels(excludePanelType) {
        const allPanelTypes = ['model', 'performance', 'filter'];
        allPanelTypes.forEach(panelType => {
            if (panelType !== excludePanelType) {
                // 使用立即隐藏避免动画时序冲突
                this.hideSubPanel(panelType, true);
                this.activeSubPanels.delete(panelType);
                this.triggerPanelCallback(panelType, false);
            }
        });
        // 更新除当前面板外的所有菜单项状态
        if (this.controlsElement) {
            const menuItems = this.controlsElement.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                const panelType = item.getAttribute('data-panel');
                if (panelType !== excludePanelType) {
                    this.updateMenuItemState(item, false);
                }
            });
        }
    }
    /**
     * 隐藏所有子面板
     */
    hideAllSubPanels() {
        // 隐藏所有子面板
        this.hideModelPanel();
        this.hideStatus();
        this.hideFilterPanel();
        // 更新所有菜单项状态
        if (this.controlsElement) {
            const menuItems = this.controlsElement.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                this.updateMenuItemState(item, false);
            });
        }
        // 清空激活的子面板集合
        this.activeSubPanels.clear();
        // 触发所有面板的关闭回调
        ['model', 'performance', 'filter'].forEach(panelType => {
            this.triggerPanelCallback(panelType, false);
        });
    }
    /**
     * 检查点击是否在子面板上
     * @param {HTMLElement} target - 点击目标元素
     * @returns {boolean} 是否在子面板上
     */
    isClickOnSubPanel(target) {
        if (!target)
            return false;
        // 检查是否点击在模型面板上
        if (this.modelPanelElement &&
            (this.modelPanelElement.contains(target) || this.modelPanelElement === target)) {
            return true;
        }
        // 检查是否点击在状态面板上
        if (this.statusElement &&
            (this.statusElement.contains(target) || this.statusElement === target)) {
            return true;
        }
        // 检查是否点击在滤波器面板上
        if (this.filterPanelElement &&
            (this.filterPanelElement.contains(target) || this.filterPanelElement === target)) {
            return true;
        }
        // 检查是否点击在任何具有特定ID或类名的子面板相关元素上
        const element = target.closest ? target.closest('#model-panel, #status-display, #filter-panel') : null;
        if (element) {
            return true;
        }
        return false;
    }
    /**
     * 重置所有子面板状态到初始状态
     */
    resetSubPanelStates() {
        // 隐藏所有子面板（如果有显示的话）
        this.hideModelPanel();
        this.hideStatus();
        this.hideFilterPanel();
        // 重置所有菜单项到未选中状态
        if (this.controlsElement) {
            const menuItems = this.controlsElement.querySelectorAll('.menu-item');
            menuItems.forEach(item => {
                this.updateMenuItemState(item, false);
            });
        }
        // 清空激活的子面板集合
        this.activeSubPanels.clear();
    }
    /**
     * 更新菜单项的选中状态
     * @param {HTMLElement} menuItem - 菜单项元素
     * @param {boolean} isActive - 是否激活
     */
    updateMenuItemState(menuItem, isActive) {
        const arrow = menuItem.querySelector('.menu-arrow');
        if (isActive) {
            menuItem.classList.add('active');
            menuItem.style.background = 'rgba(52, 152, 219, 0.2)';
            menuItem.style.borderColor = 'rgba(52, 152, 219, 0.8)';
            if (arrow) {
                arrow.style.transform = 'rotate(90deg)';
                arrow.style.opacity = '1';
                arrow.style.color = '#3498db';
            }
        }
        else {
            menuItem.classList.remove('active');
            menuItem.style.background = 'rgba(255, 255, 255, 0.05)';
            menuItem.style.borderColor = 'transparent';
            if (arrow) {
                arrow.style.transform = 'rotate(0deg)';
                arrow.style.opacity = '0.7';
                arrow.style.color = 'inherit';
            }
        }
    }
    /**
     * 触发面板回调函数
     * @param {string} panelType - 面板类型
     * @param {boolean} enabled - 是否启用
     */
    triggerPanelCallback(panelType, enabled) {
        if (!this.panelCallbacks)
            return;
        switch (panelType) {
            case 'model':
                if (this.panelCallbacks.onModelPanelToggle) {
                    this.panelCallbacks.onModelPanelToggle(enabled);
                }
                break;
            case 'performance':
                if (this.panelCallbacks.onPerformanceToggle) {
                    this.panelCallbacks.onPerformanceToggle(enabled);
                }
                break;
            case 'filter':
                if (this.panelCallbacks.onFilterPanelToggle) {
                    this.panelCallbacks.onFilterPanelToggle(enabled);
                }
                break;
        }
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
            left: 280px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 998;
            display: none;
            min-width: 300px;
            max-width: 450px;
            white-space: pre-line;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(52, 152, 219, 0.3);
            backdrop-filter: blur(15px);
            resize: both;
            overflow: auto;
            transform: translateX(-10px);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        // 添加标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            font-weight: bold;
            font-size: 12px;
        `;
        titleBar.innerHTML = `
            <span>📊 系统监控</span>
            <button id="toggle-status-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 14px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 3px;
                opacity: 0.7;
            " title="最小化/展开">−</button>
        `;
        this.statusElement.appendChild(titleBar);
        // 添加内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'status-content';
        contentArea.style.cssText = `
            transition: all 0.3s ease;
        `;
        this.statusElement.appendChild(contentArea);
        // 绑定最小化/展开事件
        const toggleBtn = titleBar.querySelector('#toggle-status-btn');
        let isMinimized = false;
        toggleBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            contentArea.style.display = isMinimized ? 'none' : 'block';
            toggleBtn.textContent = isMinimized ? '+' : '−';
            if (isMinimized) {
                // 折叠状态：只显示标题栏
                this.statusElement.style.width = '200px';
                this.statusElement.style.height = 'auto';
                this.statusElement.style.minWidth = '200px';
                this.statusElement.style.maxWidth = '200px';
                this.statusElement.style.resize = 'none';
            }
            else {
                // 展开状态：恢复正常大小和调整功能
                this.statusElement.style.minWidth = '280px';
                this.statusElement.style.maxWidth = '450px';
                this.statusElement.style.resize = 'both';
                // 重新计算合适的尺寸
                this._adjustStatusElementSize();
            }
        });
        // 阻止子面板内的点击事件冒泡到document
        this.statusElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.body.appendChild(this.statusElement);
    }
    /**
     * 创建模型参数设置面板
     */
    createModelPanelElement() {
        this.modelPanelElement = document.createElement('div');
        this.modelPanelElement.id = 'model-panel';
        this.modelPanelElement.style.cssText = `
            position: fixed;
            top: 20px;
            left: 280px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 998;
            display: none;
            min-width: 300px;
            max-width: 400px;
            white-space: nowrap;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(52, 152, 219, 0.3);
            backdrop-filter: blur(15px);
            resize: both;
            overflow: auto;
            transform: translateX(-10px);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        // 添加标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            font-weight: bold;
            font-size: 12px;
        `;
        titleBar.innerHTML = `
            <span>🤖 模型参数</span>
            <button id="toggle-model-panel-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 14px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 3px;
                opacity: 0.7;
            " title="最小化/展开">−</button>
        `;
        this.modelPanelElement.appendChild(titleBar);
        // 添加内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'model-panel-content';
        contentArea.style.cssText = `
            transition: all 0.3s ease;
            white-space: normal;
        `;
        contentArea.innerHTML = `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <label style="display: block; margin-bottom: 4px; font-size: 10px; color: #ccc;">模型类型:</label>
                <select id="model-select" style="
                    width: 100%;
                    padding: 4px;
                    background: rgba(40, 40, 40, 0.95);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                    font-size: 10px;
                    cursor: pointer;
                ">
                    <option value="MoveNet" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">MoveNet (推荐)</option>
                    <option value="PoseNet" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">PoseNet</option>
                </select>
            </div>
            
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="margin-bottom: 6px; font-size: 10px; color: #ccc;">显示选项:</div>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #fff; cursor: pointer; margin-bottom: 6px;">
                    <input type="checkbox" id="show-skeleton" checked style="
                        width: 16px;
                        height: 16px;
                        accent-color: #27ae60;
                        cursor: pointer;
                    ">
                    <span>显示骨架</span>
                </label>
                <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #fff; cursor: pointer; margin-bottom: 6px;">
                    <input type="checkbox" id="show-keypoints" checked style="
                        width: 16px;
                        height: 16px;
                        accent-color: #27ae60;
                        cursor: pointer;
                    ">
                    <span>显示关键点</span>
                </label>
            </div>
            
            <div style="margin-bottom: 0; padding-top: 8px; border-top: 1px solid rgba(255, 255, 255, 0.1);">
                <div style="margin-bottom: 8px; font-size: 10px; color: #ccc;">操作:</div>
                <div style="display: flex; gap: 8px; flex-wrap: wrap;">
                    <button id="restart-model-btn" style="
                        flex: 1;
                        min-width: 80px;
                        padding: 6px 8px;
                        background: rgba(52, 152, 219, 0.8);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 10px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " title="重新启动检测引擎">
                        🔄 重启检测
                    </button>
                    <button id="clear-cache-model-btn" style="
                        flex: 1;
                        min-width: 80px;
                        padding: 6px 8px;
                        background: rgba(231, 76, 60, 0.8);
                        color: white;
                        border: none;
                        border-radius: 4px;
                        font-size: 10px;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    " title="清空模型缓存">
                        🗑️ 清空缓存
                    </button>
                </div>
            </div>
        `;
        this.modelPanelElement.appendChild(contentArea);
        // 绑定折叠/展开事件
        const toggleBtn = titleBar.querySelector('#toggle-model-panel-btn');
        let isMinimized = false;
        toggleBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            contentArea.style.display = isMinimized ? 'none' : 'block';
            toggleBtn.textContent = isMinimized ? '+' : '−';
            if (isMinimized) {
                // 折叠状态：只显示标题栏
                this.modelPanelElement.style.width = '200px';
                this.modelPanelElement.style.height = 'auto';
                this.modelPanelElement.style.minWidth = '200px';
                this.modelPanelElement.style.maxWidth = '200px';
                this.modelPanelElement.style.resize = 'none';
            }
            else {
                // 展开状态：恢复正常大小和调整功能
                this.modelPanelElement.style.minWidth = '280px';
                this.modelPanelElement.style.maxWidth = '380px';
                this.modelPanelElement.style.resize = 'both';
                // 重新计算合适的尺寸
                this._adjustModelPanelSize();
            }
        });
        // 阻止子面板内的点击事件冒泡到document
        this.modelPanelElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.body.appendChild(this.modelPanelElement);
    }
    /**
     * 创建One Euro Filter参数设置面板
     */
    createFilterPanelElement() {
        this.filterPanelElement = document.createElement('div');
        this.filterPanelElement.id = 'filter-panel';
        this.filterPanelElement.style.cssText = `
            position: fixed;
            top: 120px;
            left: 280px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 15px;
            border-radius: 8px;
            font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
            font-size: 12px;
            line-height: 1.4;
            z-index: 998;
            display: none;
            min-width: 320px;
            max-width: 420px;
            white-space: nowrap;
            box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
            border: 2px solid rgba(52, 152, 219, 0.3);
            backdrop-filter: blur(15px);
            resize: both;
            overflow: auto;
            transform: translateX(-10px);
            opacity: 0;
            transition: all 0.3s ease;
        `;
        // 添加标题栏
        const titleBar = document.createElement('div');
        titleBar.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.2);
            font-weight: bold;
            font-size: 12px;
        `;
        titleBar.innerHTML = `
            <span>🎛️ One Euro Filter 参数设置</span>
            <button id="toggle-filter-panel-btn" style="
                background: none;
                border: none;
                color: white;
                font-size: 14px;
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 3px;
                opacity: 0.7;
            " title="最小化/展开">−</button>
        `;
        this.filterPanelElement.appendChild(titleBar);
        // 添加内容区域
        const contentArea = document.createElement('div');
        contentArea.id = 'filter-panel-content';
        contentArea.style.cssText = `
            transition: all 0.3s ease;
            white-space: normal;
        `;
        contentArea.innerHTML = `
            <div style="margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255, 255, 255, 0.1);">
                <label style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: #fff; cursor: pointer;">
                    <input type="checkbox" id="enable-filter-checkbox" checked style="
                        width: 16px;
                        height: 16px;
                        accent-color: #27ae60;
                        cursor: pointer;
                    ">
                    <span>启用滤波器</span>
                </label>
            </div>
            
            <div id="filter-controls" style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-size: 10px; color: #ccc;">预设配置:</label>
                <select id="filter-preset" style="
                    width: 100%;
                    padding: 4px;
                    background: rgba(40, 40, 40, 0.95);
                    color: white;
                    border: 1px solid rgba(255, 255, 255, 0.3);
                    border-radius: 3px;
                    font-size: 10px;
                    cursor: pointer;
                ">
                    <option value="default" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">默认 (Default)</option>
                    <option value="smooth" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">平滑 (Smooth)</option>
                    <option value="responsive" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">响应 (Responsive)</option>
                    <option value="stable" style="background: rgba(40, 40, 40, 0.95); color: white; padding: 4px;">稳定 (Stable)</option>
                </select>
            </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 2px; font-size: 10px; color: #ccc;">频率 (Hz):</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="frequency-slider" min="1" max="120" value="30" style="flex: 1; height: 4px;">
                        <span id="frequency-value" style="min-width: 30px; font-size: 10px;">30</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 2px; font-size: 10px; color: #ccc;">最小截止频率:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="minCutoff-slider" min="0.001" max="10" step="0.001" value="1" style="flex: 1; height: 4px;">
                        <span id="minCutoff-value" style="min-width: 40px; font-size: 10px;">1.000</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 10px;">
                    <label style="display: block; margin-bottom: 2px; font-size: 10px; color: #ccc;">Beta 系数:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="beta-slider" min="0" max="10" step="0.001" value="0.007" style="flex: 1; height: 4px;">
                        <span id="beta-value" style="min-width: 40px; font-size: 10px;">0.007</span>
                    </div>
                </div>
                
                <div style="margin-bottom: 12px;">
                    <label style="display: block; margin-bottom: 2px; font-size: 10px; color: #ccc;">导数截止频率:</label>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <input type="range" id="dCutoff-slider" min="0.001" max="10" step="0.001" value="1" style="flex: 1; height: 4px;">
                        <span id="dCutoff-value" style="min-width: 40px; font-size: 10px;">1.000</span>
                    </div>
                </div>
                
                <div style="display: flex; gap: 6px; margin-top: 8px;">
                    <button id="reset-filter-params" style="
                        flex: 1;
                        padding: 4px 8px;
                        background: #e74c3c;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                    ">重置</button>
                    <button id="apply-filter-config" style="
                        flex: 1;
                        padding: 4px 8px;
                        background: #3498db;
                        color: white;
                        border: none;
                        border-radius: 3px;
                        cursor: pointer;
                        font-size: 10px;
                    ">应用</button>
                </div>
            </div>
        `;
        this.filterPanelElement.appendChild(contentArea);
        // 绑定折叠/展开事件
        const toggleBtn = titleBar.querySelector('#toggle-filter-panel-btn');
        let isMinimized = false;
        toggleBtn.addEventListener('click', () => {
            isMinimized = !isMinimized;
            contentArea.style.display = isMinimized ? 'none' : 'block';
            toggleBtn.textContent = isMinimized ? '+' : '−';
            if (isMinimized) {
                // 折叠状态：只显示标题栏
                this.filterPanelElement.style.width = '250px';
                this.filterPanelElement.style.height = 'auto';
                this.filterPanelElement.style.minWidth = '250px';
                this.filterPanelElement.style.maxWidth = '250px';
                this.filterPanelElement.style.resize = 'none';
            }
            else {
                // 展开状态：恢复正常大小和调整功能
                this.filterPanelElement.style.minWidth = '300px';
                this.filterPanelElement.style.maxWidth = '400px';
                this.filterPanelElement.style.resize = 'both';
                // 重新计算合适的尺寸
                this._adjustFilterPanelSize();
            }
        });
        // 阻止子面板内的点击事件冒泡到document
        this.filterPanelElement.addEventListener('click', (e) => {
            e.stopPropagation();
        });
        document.body.appendChild(this.filterPanelElement);
        // 添加下拉选择框的样式优化
        const style = document.createElement('style');
        style.textContent = `
            #filter-preset {
                appearance: none;
                -webkit-appearance: none;
                -moz-appearance: none;
                background-image: url('data:image/svg+xml;utf8,<svg fill="white" height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg"><path d="M7 10l5 5 5-5z"/></svg>');
                background-repeat: no-repeat;
                background-position: right 4px center;
                background-size: 12px;
                padding-right: 20px;
            }
            #filter-preset option {
                background: rgba(40, 40, 40, 0.95) !important;
                color: white !important;
                padding: 4px !important;
            }
            #filter-preset:focus {
                outline: 1px solid rgba(255, 255, 255, 0.5);
                background: rgba(50, 50, 50, 0.95);
            }
        `;
        document.head.appendChild(style);
        // 绑定滤波器面板事件
        this.bindFilterPanelEvents();
    }
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {string} progress - 进度信息（可选）
     */
    showLoading(message = '正在加载...', progress = '') {
        if (!this.loadingElement)
            this.createLoadingElement();
        const textElement = this.loadingElement.querySelector('#loading-text');
        const progressElement = this.loadingElement.querySelector('#loading-progress');
        if (textElement)
            textElement.textContent = message;
        if (progressElement)
            progressElement.textContent = progress;
        this.loadingElement.style.display = 'block';
        console.log('📱 显示加载状态:', message);
    }
    /**
     * 隐藏加载状态
     */
    hideLoading() {
        if (this.loadingElement) {
            this.loadingElement.style.display = 'none';
        }
        console.log('📱 隐藏加载状态');
    }
    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     * @param {number} duration - 显示时长（毫秒），0表示不自动隐藏
     */
    showError(message, duration = 5000) {
        if (!this.errorElement)
            this.createErrorElement();
        this.errorElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; margin-right: 10px;">${message}</div>
                <button onclick="this.parentElement.parentElement.style.display='none'" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>
        `;
        this.errorElement.style.display = 'block';
        if (duration > 0) {
            setTimeout(() => {
                if (this.errorElement) {
                    this.errorElement.style.display = 'none';
                }
            }, duration);
        }
        console.error('📱 显示错误:', message);
    }
    /**
     * 隐藏错误信息
     */
    hideError() {
        if (this.errorElement) {
            this.errorElement.style.display = 'none';
        }
    }
    /**
     * 显示控制面板 - 新设计中控制图标始终显示
     */
    showControls() {
        if (!this.controlsElement)
            this.createControlsElement();
        this.controlsElement.style.display = 'block';
    }
    /**
     * 隐藏控制面板 - 新设计中隐藏整个控制元素
     */
    hideControls() {
        if (this.controlsElement) {
            // 先关闭菜单
            if (this.menuPanel && this.mainButton) {
                this.menuPanel.style.opacity = '0';
                this.menuPanel.style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    this.menuPanel.style.display = 'none';
                }, 300);
                this.mainButton.style.background = 'rgba(0, 0, 0, 0.8)';
                this.mainButton.style.transform = 'rotate(0deg)';
                this.isMenuOpen = false;
            }
            // 隐藏整个控制面板
            this.controlsElement.style.display = 'none';
        }
    }
    /**
     * 切换控制面板显示状态
     */
    toggleControls() {
        if (!this.controlsElement) {
            this.showControls();
        }
        else {
            const isVisible = this.controlsElement.style.display !== 'none';
            if (isVisible) {
                this.hideControls();
            }
            else {
                this.showControls();
            }
        }
    }
    /**
     * 切换控制菜单展开状态
     */
    toggleControlMenu() {
        if (!this.controlsElement || !this.menuPanel || !this.mainButton)
            return;
        this.isMenuOpen = !this.isMenuOpen;
        if (this.isMenuOpen) {
            // 展开主面板时，重置所有子面板状态
            this.resetSubPanelStates();
            this.menuPanel.style.display = 'block';
            setTimeout(() => {
                this.menuPanel.style.opacity = '1';
                this.menuPanel.style.transform = 'translateX(0)';
            }, 10);
            this.mainButton.style.background = 'rgba(52, 152, 219, 0.8)';
            this.mainButton.style.transform = 'rotate(90deg)';
        }
        else {
            // 收起主面板时，关闭所有子面板
            this.hideAllSubPanels();
            this.menuPanel.style.opacity = '0';
            this.menuPanel.style.transform = 'translateX(-10px)';
            setTimeout(() => {
                this.menuPanel.style.display = 'none';
            }, 300);
            this.mainButton.style.background = 'rgba(0, 0, 0, 0.8)';
            this.mainButton.style.transform = 'rotate(0deg)';
        }
    }
    /**
     * 更新状态显示
     * @param {Object} status - 状态信息
     */
    updateStatus(status) {
        if (!this.statusElement)
            this.createStatusElement();
        // 构建基础状态信息
        let statusText = `
状态: ${status.isRunning ? '运行中' : '已停止'}
视频: ${status.hasVideo ? '已连接' : '未连接'}
模型: ${status.hasDetector ? '已加载' : '未加载'}
画布: ${status.canvasSize.width}x${status.canvasSize.height}
FPS: ${status.performance?.frameRate?.toFixed(1) || 'N/A'}
内存缓存: ${status.cache?.memoryCacheSize || 0}个模型
缓存命中率: ${status.cache?.hitRate || 0}%
滤波器: ${status.filter?.enabled ? '启用' : '禁用'}`;
        // 添加One Euro Filter参数信息
        if (status.filter?.enabled && status.filter?.parameters) {
            const params = status.filter.parameters;
            statusText += `

--- One Euro Filter 参数 ---
频率 (Hz): ${params.frequency}
最小截止频率: ${params.minCutoff.toFixed(3)}
Beta 系数: ${params.beta.toFixed(3)}
导数截止频率: ${params.dCutoff.toFixed(3)}
活跃滤波器数: ${status.filter?.filterCount || 0}`;
        }
        // 添加性能详细信息
        if (status.performance) {
            statusText += `

--- 性能监控 ---
平均帧时间: ${status.performance.averageFrameTime?.toFixed(1) || 'N/A'}ms
推理时间: ${status.performance.inferenceTime?.toFixed(1) || 'N/A'}ms
丢帧率: ${status.performance.frameDropRate || 0}%
总帧数: ${status.performance.totalFrames || 0}`;
            if (status.performance.tensorflowMemory) {
                const tfMem = status.performance.tensorflowMemory;
                statusText += `

--- TensorFlow 内存 ---
张量数量: ${tfMem.numTensors}
数据缓冲区: ${tfMem.numDataBuffers}
内存使用: ${tfMem.numBytes}MB`;
            }
        }
        const contentArea = this.statusElement.querySelector('#status-content') || this.statusElement;
        contentArea.textContent = statusText.trim();
        // 只有在面板当前可见时才调整大小
        if (this.statusElement.style.display !== 'none') {
            this._adjustStatusElementSize();
        }
    }
    /**
     * 调整模型参数面板尺寸
     */
    _adjustModelPanelSize() {
        if (!this.modelPanelElement)
            return;
        const contentArea = this.modelPanelElement.querySelector('#model-panel-content');
        if (!contentArea)
            return;
        // 检查是否处于折叠状态
        const isMinimized = contentArea.style.display === 'none';
        if (isMinimized) {
            // 折叠状态下不调整尺寸，保持折叠样式
            return;
        }
        // 临时设置为自动宽度以测量内容
        this.modelPanelElement.style.width = 'auto';
        this.modelPanelElement.style.height = 'auto';
        // 获取内容的实际尺寸
        const rect = this.modelPanelElement.getBoundingClientRect();
        // 计算合适的宽度和高度
        const minWidth = 280;
        const maxWidth = Math.min(350, window.innerWidth - 60);
        const optimalWidth = Math.max(minWidth, Math.min(maxWidth, rect.width + 20));
        const minHeight = 150;
        const maxHeight = Math.min(300, window.innerHeight - 100);
        const optimalHeight = Math.max(minHeight, Math.min(maxHeight, rect.height + 20));
        // 应用计算出的尺寸
        this.modelPanelElement.style.width = optimalWidth + 'px';
        this.modelPanelElement.style.height = optimalHeight + 'px';
        // 确保不超出屏幕边界
        const modelRect = this.modelPanelElement.getBoundingClientRect();
        if (modelRect.right > window.innerWidth) {
            this.modelPanelElement.style.left = (window.innerWidth - modelRect.width - 20) + 'px';
        }
        if (modelRect.bottom > window.innerHeight) {
            this.modelPanelElement.style.bottom = '20px';
            this.modelPanelElement.style.top = 'auto';
        }
    }
    /**
     * 调整滤波器面板尺寸
     */
    _adjustFilterPanelSize() {
        if (!this.filterPanelElement)
            return;
        const contentArea = this.filterPanelElement.querySelector('#filter-panel-content');
        if (!contentArea)
            return;
        // 检查是否处于折叠状态
        const isMinimized = contentArea.style.display === 'none';
        if (isMinimized) {
            // 折叠状态下不调整尺寸，保持折叠样式
            return;
        }
        // 临时设置为自动宽度以测量内容
        this.filterPanelElement.style.width = 'auto';
        this.filterPanelElement.style.height = 'auto';
        // 获取内容的实际尺寸
        const rect = this.filterPanelElement.getBoundingClientRect();
        // 计算合适的宽度和高度
        const minWidth = 300;
        const maxWidth = Math.min(400, window.innerWidth - 60);
        const optimalWidth = Math.max(minWidth, Math.min(maxWidth, rect.width + 20));
        const optimalHeight = Math.min(window.innerHeight - 100, rect.height + 20);
        // 应用计算出的尺寸
        this.filterPanelElement.style.width = optimalWidth + 'px';
        this.filterPanelElement.style.height = optimalHeight + 'px';
        // 确保不超出屏幕边界
        const panelRect = this.filterPanelElement.getBoundingClientRect();
        if (panelRect.right > window.innerWidth) {
            this.filterPanelElement.style.right = '20px';
            this.filterPanelElement.style.left = 'auto';
        }
        if (panelRect.bottom > window.innerHeight) {
            this.filterPanelElement.style.top = (window.innerHeight - panelRect.height - 20) + 'px';
        }
    }
    /**
     * 动态调整状态显示元素大小
     * @private
     */
    _adjustStatusElementSize() {
        if (!this.statusElement)
            return;
        const contentArea = this.statusElement.querySelector('#status-content');
        if (!contentArea)
            return;
        // 检查是否处于折叠状态
        const isMinimized = contentArea.style.display === 'none';
        if (isMinimized) {
            // 折叠状态下不调整尺寸，保持折叠样式
            return;
        }
        // 临时设置为自动宽度以测量内容
        this.statusElement.style.width = 'auto';
        this.statusElement.style.height = 'auto';
        // 获取内容的实际尺寸
        const rect = this.statusElement.getBoundingClientRect();
        const lines = (contentArea.textContent || '').split('\n').length;
        // 计算合适的宽度和高度
        const minWidth = 280;
        const maxWidth = Math.min(450, window.innerWidth - 60);
        const optimalWidth = Math.max(minWidth, Math.min(maxWidth, rect.width + 20));
        const lineHeight = 16; // 估算行高
        const padding = 60; // 标题栏和内边距
        const optimalHeight = Math.min(window.innerHeight - 100, lines * lineHeight + padding);
        // 应用计算出的尺寸
        this.statusElement.style.width = optimalWidth + 'px';
        this.statusElement.style.height = optimalHeight + 'px';
        // 确保不超出屏幕边界
        const statusRect = this.statusElement.getBoundingClientRect();
        if (statusRect.right > window.innerWidth) {
            this.statusElement.style.left = (window.innerWidth - statusRect.width - 20) + 'px';
        }
        if (statusRect.bottom > window.innerHeight) {
            this.statusElement.style.bottom = '20px';
            this.statusElement.style.top = 'auto';
        }
    }
    /**
     * 显示状态显示
     */
    showStatus() {
        if (!this.statusElement)
            this.createStatusElement();
        // 重置样式状态，确保从正确的初始状态开始
        this.statusElement.style.display = 'block';
        this.statusElement.style.opacity = '0';
        this.statusElement.style.transform = 'translateX(-10px)';
        // 添加显示动画
        setTimeout(() => {
            this.statusElement.style.opacity = '1';
            this.statusElement.style.transform = 'translateX(0)';
        }, 10);
    }
    /**
     * 隐藏状态显示
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideStatus(immediate = false) {
        if (this.statusElement) {
            if (immediate) {
                // 立即隐藏，跳过动画
                this.statusElement.style.display = 'none';
                this.statusElement.style.opacity = '0';
                this.statusElement.style.transform = 'translateX(-10px)';
            }
            else {
                // 添加隐藏动画
                this.statusElement.style.opacity = '0';
                this.statusElement.style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    this.statusElement.style.display = 'none';
                }, 300);
            }
        }
    }
    /**
     * 显示模型参数面板
     */
    showModelPanel() {
        if (!this.modelPanelElement)
            this.createModelPanelElement();
        // 重置样式状态，确保从正确的初始状态开始
        this.modelPanelElement.style.display = 'block';
        this.modelPanelElement.style.opacity = '0';
        this.modelPanelElement.style.transform = 'translateX(-10px)';
        // 添加显示动画
        setTimeout(() => {
            this.modelPanelElement.style.opacity = '1';
            this.modelPanelElement.style.transform = 'translateX(0)';
        }, 10);
        this._adjustModelPanelSize();
    }
    /**
     * 隐藏模型参数面板
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideModelPanel(immediate = false) {
        if (this.modelPanelElement) {
            if (immediate) {
                // 立即隐藏，跳过动画
                this.modelPanelElement.style.display = 'none';
                this.modelPanelElement.style.opacity = '0';
                this.modelPanelElement.style.transform = 'translateX(-10px)';
            }
            else {
                // 添加隐藏动画
                this.modelPanelElement.style.opacity = '0';
                this.modelPanelElement.style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    this.modelPanelElement.style.display = 'none';
                }, 300);
            }
        }
    }
    /**
     * 切换模型参数面板显示状态
     */
    toggleModelPanel() {
        if (!this.modelPanelElement) {
            this.showModelPanel();
        }
        else {
            const isVisible = this.modelPanelElement.style.display !== 'none';
            if (isVisible) {
                this.hideModelPanel();
            }
            else {
                this.showModelPanel();
            }
        }
    }
    /**
     * 显示滤波器参数面板
     */
    showFilterPanel() {
        if (!this.filterPanelElement)
            this.createFilterPanelElement();
        // 重置样式状态，确保从正确的初始状态开始
        this.filterPanelElement.style.display = 'block';
        this.filterPanelElement.style.opacity = '0';
        this.filterPanelElement.style.transform = 'translateX(-10px)';
        // 添加显示动画
        setTimeout(() => {
            this.filterPanelElement.style.opacity = '1';
            this.filterPanelElement.style.transform = 'translateX(0)';
        }, 10);
        this._adjustFilterPanelSize();
        // 设置初始状态：启用滤波器复选框默认选中，控件默认启用
        const enableCheckbox = this.filterPanelElement.querySelector('#enable-filter-checkbox');
        if (enableCheckbox && !enableCheckbox.hasAttribute('data-initialized')) {
            enableCheckbox.checked = true;
            enableCheckbox.setAttribute('data-initialized', 'true');
            this.updateFilterControlsState(true);
        }
    }
    /**
     * 隐藏滤波器参数面板
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideFilterPanel(immediate = false) {
        if (this.filterPanelElement) {
            if (immediate) {
                // 立即隐藏，跳过动画
                this.filterPanelElement.style.display = 'none';
                this.filterPanelElement.style.opacity = '0';
                this.filterPanelElement.style.transform = 'translateX(-10px)';
            }
            else {
                // 添加隐藏动画
                this.filterPanelElement.style.opacity = '0';
                this.filterPanelElement.style.transform = 'translateX(-10px)';
                setTimeout(() => {
                    this.filterPanelElement.style.display = 'none';
                }, 300);
            }
        }
    }
    /**
     * 切换滤波器参数面板显示状态
     */
    toggleFilterPanel() {
        if (!this.filterPanelElement) {
            this.showFilterPanel();
        }
        else {
            const isVisible = this.filterPanelElement.style.display !== 'none';
            if (isVisible) {
                this.hideFilterPanel();
            }
            else {
                this.showFilterPanel();
            }
        }
    }
    /**
     * 绑定模型参数面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindModelPanelEvents(callbacks = {}) {
        if (!this.modelPanelElement)
            return;
        // 模型选择
        const modelSelect = this.modelPanelElement.querySelector('#model-select');
        if (modelSelect && callbacks.onModelChange) {
            modelSelect.addEventListener('change', (e) => {
                callbacks.onModelChange(e.target.value);
            });
        }
        // 显示选项复选框
        const checkboxes = {
            '#show-skeleton': callbacks.onSkeletonToggle,
            '#show-keypoints': callbacks.onKeypointsToggle
        };
        Object.entries(checkboxes).forEach(([selector, callback]) => {
            const element = this.modelPanelElement.querySelector(selector);
            if (element && callback) {
                element.addEventListener('change', (e) => {
                    callback(e.target.checked);
                });
            }
        });
        // 重启检测按钮
        const restartBtn = this.modelPanelElement.querySelector('#restart-model-btn');
        if (restartBtn && callbacks.onRestart) {
            restartBtn.addEventListener('click', callbacks.onRestart);
            // 添加悬停效果
            restartBtn.addEventListener('mouseenter', () => {
                restartBtn.style.background = 'rgba(52, 152, 219, 1)';
            });
            restartBtn.addEventListener('mouseleave', () => {
                restartBtn.style.background = 'rgba(52, 152, 219, 0.8)';
            });
        }
        // 清空缓存按钮
        const clearCacheBtn = this.modelPanelElement.querySelector('#clear-cache-model-btn');
        if (clearCacheBtn && callbacks.onClearCache) {
            clearCacheBtn.addEventListener('click', callbacks.onClearCache);
            // 添加悬停效果
            clearCacheBtn.addEventListener('mouseenter', () => {
                clearCacheBtn.style.background = 'rgba(231, 76, 60, 1)';
            });
            clearCacheBtn.addEventListener('mouseleave', () => {
                clearCacheBtn.style.background = 'rgba(231, 76, 60, 0.8)';
            });
        }
    }
    /**
     * 更新模型参数面板状态
     * @param {Object} options - 选项状态
     */
    updateModelPanelState(options) {
        if (!this.modelPanelElement)
            return;
        const modelSelect = this.modelPanelElement.querySelector('#model-select');
        if (modelSelect && options.modelType) {
            modelSelect.value = options.modelType;
        }
        const checkboxes = {
            '#show-skeleton': options.showSkeleton,
            '#show-keypoints': options.showKeypoints
        };
        Object.entries(checkboxes).forEach(([selector, value]) => {
            const element = this.modelPanelElement.querySelector(selector);
            if (element && typeof value === 'boolean') {
                element.checked = value;
            }
        });
    }
    /**
     * 绑定滤波器面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindFilterPanelEvents(callbacks = {}) {
        if (!this.filterPanelElement)
            return;
        // 启用滤波器复选框
        const enableCheckbox = this.filterPanelElement.querySelector('#enable-filter-checkbox');
        if (enableCheckbox) {
            enableCheckbox.addEventListener('change', (e) => {
                const isEnabled = e.target.checked;
                this.updateFilterControlsState(isEnabled);
                if (callbacks.onFilterToggle) {
                    callbacks.onFilterToggle(isEnabled);
                }
            });
        }
        // 预设选择
        const presetSelect = this.filterPanelElement.querySelector('#filter-preset');
        if (presetSelect && callbacks.onPresetChange) {
            presetSelect.addEventListener('change', (e) => {
                callbacks.onPresetChange(e.target.value);
            });
        }
        // 参数滑块
        const sliders = {
            '#frequency-slider': { callback: callbacks.onFrequencyChange, valueElement: '#frequency-value' },
            '#minCutoff-slider': { callback: callbacks.onMinCutoffChange, valueElement: '#minCutoff-value' },
            '#beta-slider': { callback: callbacks.onBetaChange, valueElement: '#beta-value' },
            '#dCutoff-slider': { callback: callbacks.onDCutoffChange, valueElement: '#dCutoff-value' }
        };
        Object.entries(sliders).forEach(([selector, config]) => {
            const slider = this.filterPanelElement.querySelector(selector);
            const valueElement = this.filterPanelElement.querySelector(config.valueElement);
            if (slider && config.callback) {
                slider.addEventListener('input', (e) => {
                    const target = e.target;
                    const value = parseFloat(target.value);
                    if (valueElement) {
                        if (selector === '#frequency-slider') {
                            valueElement.textContent = Math.round(value).toString();
                        }
                        else {
                            valueElement.textContent = value.toFixed(3);
                        }
                    }
                    config.callback(value);
                });
            }
        });
        // 重置按钮
        const resetBtn = this.filterPanelElement.querySelector('#reset-filter-params');
        if (resetBtn && callbacks.onReset) {
            resetBtn.addEventListener('click', callbacks.onReset);
        }
        // 应用按钮
        const applyBtn = this.filterPanelElement.querySelector('#apply-filter-config');
        if (applyBtn && callbacks.onApply) {
            applyBtn.addEventListener('click', callbacks.onApply);
        }
    }
    /**
     * 更新滤波器面板参数显示
     * @param {Object} params - 滤波器参数
     */
    updateFilterPanelParams(params) {
        if (!this.filterPanelElement)
            return;
        // 更新滑块值和显示
        const updates = {
            '#frequency-slider': { value: params.frequency, display: '#frequency-value', format: (v) => Math.round(v) },
            '#minCutoff-slider': { value: params.minCutoff, display: '#minCutoff-value', format: (v) => v.toFixed(3) },
            '#beta-slider': { value: params.beta, display: '#beta-value', format: (v) => v.toFixed(3) },
            '#dCutoff-slider': { value: params.dCutoff, display: '#dCutoff-value', format: (v) => v.toFixed(3) }
        };
        Object.entries(updates).forEach(([selector, config]) => {
            const slider = this.filterPanelElement.querySelector(selector);
            const display = this.filterPanelElement.querySelector(config.display);
            if (slider && config.value !== undefined) {
                slider.value = config.value.toString();
            }
            if (display && config.value !== undefined) {
                display.textContent = config.format(config.value).toString();
            }
        });
    }
    /**
     * 更新滤波器控件的启用/禁用状态
     * @param {boolean} enabled - 是否启用
     */
    updateFilterControlsState(enabled) {
        if (!this.filterPanelElement)
            return;
        const filterControls = this.filterPanelElement.querySelector('#filter-controls');
        if (filterControls) {
            // 控制整个控件容器的透明度和指针事件
            filterControls.style.opacity = enabled ? '1' : '0.5';
            filterControls.style.pointerEvents = enabled ? 'auto' : 'none';
            // 禁用所有输入控件
            const inputs = filterControls.querySelectorAll('input, select, button');
            inputs.forEach(input => {
                input.disabled = !enabled;
            });
        }
    }
    /**
     * 绑定控制面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindControlEvents(callbacks = {}) {
        if (!this.controlsElement)
            return;
        // 存储回调函数供toggleSubPanel使用
        this.panelCallbacks = callbacks;
        console.log('🎛️ 控制面板事件已绑定 - 使用主菜单-子菜单交互模式');
    }
    /**
     * 更新控制面板状态
     * @param {Object} options - 选项状态
     */
    updateControlsState(options) {
        if (!this.controlsElement || !this.menuPanel)
            return;
        // 更新菜单项状态
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
                }
                else {
                    this.activeSubPanels.delete(panelType);
                    this.updateMenuItemState(menuItem, false);
                }
            }
        });
    }
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showSuccess(message, duration = 3000) {
        const successElement = document.createElement('div');
        successElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #27ae60;
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 400px;
            z-index: 1002;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            animation: slideIn 0.3s ease-out;
        `;
        successElement.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex: 1; margin-right: 10px;">✅ ${message}</div>
                <button onclick="this.parentElement.parentElement.remove()" style="
                    background: none;
                    border: none;
                    color: white;
                    font-size: 16px;
                    cursor: pointer;
                    padding: 0;
                    line-height: 1;
                ">×</button>
            </div>
        `;
        document.body.appendChild(successElement);
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.remove();
            }
        }, duration);
        console.log('📱 显示成功消息:', message);
    }
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
                return;
            }
        });
        console.log('⌨️ 键盘快捷键已启用: Ctrl+H(控制面板), Ctrl+R(重启), Space(暂停), ESC(隐藏)');
    }
    /**
     * 清理所有UI元素
     */
    cleanup() {
        const elements = [
            this.loadingElement,
            this.errorElement,
            this.controlsElement,
            this.statusElement,
            this.modelPanelElement,
            this.filterPanelElement
        ];
        elements.forEach(element => {
            if (element && element.parentNode) {
                element.parentNode.removeChild(element);
            }
        });
        this.loadingElement = null;
        this.errorElement = null;
        this.controlsElement = null;
        this.statusElement = null;
        this.filterPanelElement = null;
        this.isInitialized = false;
        console.log('🧹 UI元素清理完成');
    }
    /**
     * 获取当前UI状态
     * @returns {Object} UI状态信息
     */
    getUIState() {
        return {
            isInitialized: this.isInitialized,
            loadingVisible: this.loadingElement?.style.display !== 'none',
            errorVisible: this.errorElement?.style.display !== 'none',
            controlsVisible: this.controlsElement?.style.display !== 'none',
            statusVisible: this.statusElement?.style.display !== 'none',
            filterPanelVisible: this.filterPanelElement?.style.display !== 'none'
        };
    }
}
// 创建全局UI管理器实例
export const uiManager = new UIManager();
//# sourceMappingURL=UIManager.js.map