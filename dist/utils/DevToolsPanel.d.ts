/**
 * 开发者工具面板
 * 提供实时监控、调试和诊断功能的可视化界面
 */
export interface DevToolsConfig {
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    theme: 'light' | 'dark' | 'auto';
    autoOpen: boolean;
    enableKeyboardShortcuts: boolean;
    enableNotifications: boolean;
}
export interface DevToolsPanelItem {
    id: string;
    title: string;
    icon: string;
    content: HTMLElement;
    isActive: boolean;
}
/**
 * 开发者工具面板管理器
 */
export declare class DevToolsPanel {
    private container;
    private panels;
    private config;
    private isVisible;
    private updateInterval;
    constructor(config?: Partial<DevToolsConfig>);
    /**
     * 初始化开发者工具
     */
    private init;
    /**
     * 创建容器
     */
    private createContainer;
    /**
     * 添加样式
     */
    private addStyles;
    /**
     * 创建面板
     */
    private createPanels;
    /**
     * 添加面板
     */
    private addPanel;
    /**
     * 激活面板
     */
    private activatePanel;
    /**
     * 创建监控面板
     */
    private createMonitorPanel;
    /**
     * 创建性能面板
     */
    private createPerformancePanel;
    /**
     * 创建 Workers 面板
     */
    private createWorkersPanel;
    /**
     * 创建日志面板
     */
    private createLogsPanel;
    /**
     * 创建质量检查面板
     */
    private createQualityPanel;
    /**
     * 设置事件监听器
     */
    private setupEventListeners;
    /**
     * 设置拖拽功能
     */
    private setupDragAndDrop;
    /**
     * 设置键盘快捷键
     */
    private setupKeyboardShortcuts;
    /**
     * 显示面板
     */
    show(): void;
    /**
     * 隐藏面板
     */
    hide(): void;
    /**
     * 切换显示状态
     */
    toggle(): void;
    /**
     * 最小化
     */
    minimize(): void;
    /**
     * 开始更新数据
     */
    private startUpdating;
    /**
     * 停止更新数据
     */
    private stopUpdating;
    /**
     * 更新所有面板
     */
    private updateAllPanels;
    /**
     * 更新系统状态
     */
    private updateSystemStatus;
    /**
     * 更新内存使用
     */
    private updateMemoryUsage;
    /**
     * 更新 Workers 状态
     */
    private updateWorkersStatus;
    /**
     * 更新性能统计
     */
    private updatePerformanceStats;
    /**
     * 更新健康状态
     */
    private updateHealthStatus;
    /**
     * 记录 Worker 错误
     */
    private logWorkerError;
    /**
     * 更新性能数据
     */
    private updatePerformanceData;
    /**
     * 更新质量状态
     */
    private updateQualityStatus;
    /**
     * 添加日志条目
     */
    private addLogEntry;
    /**
     * 运行质量检查
     */
    runQualityCheck(): Promise<void>;
    /**
     * 清除日志
     */
    clearLogs(): void;
    /**
     * 导出日志
     */
    exportLogs(): void;
}
declare global {
    interface Window {
        devTools: DevToolsPanel;
    }
}
/**
 * 初始化开发者工具
 */
export declare function initDevTools(config?: Partial<DevToolsConfig>): DevToolsPanel;
//# sourceMappingURL=DevToolsPanel.d.ts.map