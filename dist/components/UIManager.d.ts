/**
 * UI管理器类
 * 负责管理加载状态、错误显示、用户界面交互等
 */
export declare class UIManager {
    private loadingElement;
    private errorElement;
    private controlsElement;
    private statusElement;
    private filterPanelElement;
    private modelPanelElement;
    private isInitialized;
    private isMenuOpen;
    private menuPanel;
    private mainButton;
    private activeSubPanels;
    private panelCallbacks;
    constructor();
    /**
     * 初始化UI元素
     */
    init(): void;
    /**
     * 创建加载状态元素
     */
    createLoadingElement(): void;
    /**
     * 创建错误显示元素
     */
    createErrorElement(): void;
    /**
     * 创建控制面板元素 - 可收拢式菜单设计
     */
    createControlsElement(): void;
    /**
     * 切换子面板显示状态
     * @param {string} panelType - 面板类型 ('model', 'performance', 'filter')
     * @param {HTMLElement} menuItem - 对应的菜单项元素
     */
    toggleSubPanel(panelType: string, menuItem: HTMLElement): void;
    /**
     * 显示指定的子面板
     * @param {string} panelType - 面板类型
     */
    showSubPanel(panelType: string): void;
    /**
     * 隐藏指定的子面板
     * @param {string} panelType - 面板类型
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideSubPanel(panelType: string, immediate?: boolean): void;
    /**
     * 隐藏除指定面板外的所有其他子面板
     * @param {string} excludePanelType - 要排除的面板类型
     */
    hideOtherSubPanels(excludePanelType: string): void;
    /**
     * 隐藏所有子面板
     */
    hideAllSubPanels(): void;
    /**
     * 检查点击是否在子面板上
     * @param {HTMLElement} target - 点击目标元素
     * @returns {boolean} 是否在子面板上
     */
    isClickOnSubPanel(target: HTMLElement): boolean;
    /**
     * 重置所有子面板状态到初始状态
     */
    resetSubPanelStates(): void;
    /**
     * 更新菜单项的选中状态
     * @param {HTMLElement} menuItem - 菜单项元素
     * @param {boolean} isActive - 是否激活
     */
    updateMenuItemState(menuItem: HTMLElement, isActive: boolean): void;
    /**
     * 触发面板回调函数
     * @param {string} panelType - 面板类型
     * @param {boolean} enabled - 是否启用
     */
    triggerPanelCallback(panelType: string, enabled: boolean): void;
    /**
     * 创建状态显示元素
     */
    createStatusElement(): void;
    /**
     * 创建模型参数设置面板
     */
    createModelPanelElement(): void;
    /**
     * 创建One Euro Filter参数设置面板
     */
    createFilterPanelElement(): void;
    /**
     * 显示加载状态
     * @param {string} message - 加载消息
     * @param {string} progress - 进度信息（可选）
     */
    showLoading(message?: string, progress?: string): void;
    /**
     * 隐藏加载状态
     */
    hideLoading(): void;
    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     * @param {number} duration - 显示时长（毫秒），0表示不自动隐藏
     */
    showError(message: string, duration?: number): void;
    /**
     * 隐藏错误信息
     */
    hideError(): void;
    /**
     * 显示控制面板 - 新设计中控制图标始终显示
     */
    showControls(): void;
    /**
     * 隐藏控制面板 - 新设计中隐藏整个控制元素
     */
    hideControls(): void;
    /**
     * 切换控制面板显示状态
     */
    toggleControls(): void;
    /**
     * 切换控制菜单展开状态
     */
    toggleControlMenu(): void;
    /**
     * 更新状态显示
     * @param {Object} status - 状态信息
     */
    updateStatus(status: any): void;
    /**
     * 调整模型参数面板尺寸
     */
    _adjustModelPanelSize(): void;
    /**
     * 调整滤波器面板尺寸
     */
    _adjustFilterPanelSize(): void;
    /**
     * 动态调整状态显示元素大小
     * @private
     */
    _adjustStatusElementSize(): void;
    /**
     * 显示状态显示
     */
    showStatus(): void;
    /**
     * 隐藏状态显示
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideStatus(immediate?: boolean): void;
    /**
     * 显示模型参数面板
     */
    showModelPanel(): void;
    /**
     * 隐藏模型参数面板
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideModelPanel(immediate?: boolean): void;
    /**
     * 切换模型参数面板显示状态
     */
    toggleModelPanel(): void;
    /**
     * 显示滤波器参数面板
     */
    showFilterPanel(): void;
    /**
     * 隐藏滤波器参数面板
     * @param {boolean} immediate - 是否立即隐藏（跳过动画）
     */
    hideFilterPanel(immediate?: boolean): void;
    /**
     * 切换滤波器参数面板显示状态
     */
    toggleFilterPanel(): void;
    /**
     * 绑定模型参数面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindModelPanelEvents(callbacks?: any): void;
    /**
     * 更新模型参数面板状态
     * @param {Object} options - 选项状态
     */
    updateModelPanelState(options: any): void;
    /**
     * 绑定滤波器面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindFilterPanelEvents(callbacks?: any): void;
    /**
     * 更新滤波器面板参数显示
     * @param {Object} params - 滤波器参数
     */
    updateFilterPanelParams(params: any): void;
    /**
     * 更新滤波器控件的启用/禁用状态
     * @param {boolean} enabled - 是否启用
     */
    updateFilterControlsState(enabled: boolean): void;
    /**
     * 绑定控制面板事件
     * @param {Object} callbacks - 回调函数对象
     */
    bindControlEvents(callbacks?: any): void;
    /**
     * 更新控制面板状态
     * @param {Object} options - 选项状态
     */
    updateControlsState(options: any): void;
    /**
     * 显示成功消息
     * @param {string} message - 成功消息
     * @param {number} duration - 显示时长（毫秒）
     */
    showSuccess(message: string, duration?: number): void;
    /**
     * 添加键盘快捷键支持
     * @param {Object} shortcuts - 快捷键配置
     */
    addKeyboardShortcuts(shortcuts?: any): void;
    /**
     * 清理所有UI元素
     */
    cleanup(): void;
    /**
     * 获取当前UI状态
     * @returns {Object} UI状态信息
     */
    getUIState(): any;
}
export declare const uiManager: UIManager;
//# sourceMappingURL=UIManager.d.ts.map