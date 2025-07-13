/**
 * 重构后的UI控制器
 * 负责UI交互和应用控制
 */
export declare class UIController {
    private container;
    private statusPanel;
    constructor(containerId?: string);
    /**
     * 创建UI界面
     */
    private createUI;
    /**
     * 绑定UI事件
     */
    private bindUIEvents;
    /**
     * 设置应用事件监听器
     */
    private setupEventListeners;
    /**
     * 处理数据源选择
     */
    private handleDataSourceSelection;
    /**
     * 处理文件选择
     */
    private handleFileSelection;
    /**
     * 处理文件输入变更
     */
    private handleFileInputChange;
    /**
     * 处理模型选择
     */
    private handleModelSelection;
    /**
     * 更新数据源按钮状态
     */
    private updateDataSourceButtons;
    /**
     * 更新模型按钮状态
     */
    private updateModelButtons;
    /**
     * 处理开始按钮
     */
    private handleStart;
    /**
     * 处理停止按钮
     */
    private handleStop;
    /**
     * 处理重启按钮
     */
    private handleRestart;
    /**
     * 更新状态显示
     */
    private updateStatus;
    /**
     * 更新应用状态
     */
    private updateAppState;
    /**
     * 更新数据源显示
     */
    private updateDataSource;
    /**
     * 更新当前模型显示
     */
    private updateCurrentModel;
    /**
     * 更新控制按钮状态
     */
    private updateControlButtons;
    /**
     * 启用开始按钮
     */
    private enableStartButton;
    /**
     * 显示加载状态
     */
    private showLoading;
    /**
     * 隐藏加载状态
     */
    private hideLoading;
    /**
     * 显示错误信息
     */
    private showError;
    /**
     * 根据状态更新UI
     */
    private updateUIFromState;
    /**
     * 初始化默认状态
     */
    private initializeDefaultStates;
    /**
     * 添加样式
     */
    private addStyles;
    /**
     * 初始化应用
     */
    initializeApp(): Promise<void>;
}
//# sourceMappingURL=UIController.d.ts.map