import { PerformanceReport } from './utils/performance.js';
declare global {
    interface Window {
        poseApp?: PoseEstimationApp;
        CONFIG?: any;
    }
}
/**
 * 主应用类
 * 负责协调各个模块的工作
 */
declare class PoseEstimationApp {
    private canvas;
    private poseEstimator;
    private isInitialized;
    private currentOptions;
    constructor();
    /**
     * 初始化应用
     * @returns {Promise<void>}
     */
    init(): Promise<void>;
    /**
     * 执行环境检查
     * @returns {Promise<void>}
     */
    performEnvironmentChecks(): Promise<void>;
    /**
     * 初始化Canvas
     */
    initCanvas(): void;
    /**
     * 初始化缓存管理器
     * @returns {Promise<void>}
     */
    initCacheManager(): Promise<void>;
    /**
     * 预加载模型
     * @returns {Promise<void>}
     */
    preloadModels(): Promise<void>;
    /**
     * 创建姿态估计器
     */
    createPoseEstimator(): void;
    /**
     * 初始化UI
     */
    initUI(): void;
    /**
     * 开始状态更新
     */
    startStatusUpdates(): void;
    /**
     * 更改模型类型
     * @param {string} modelType - 新的模型类型
     */
    changeModel(modelType: string): Promise<void>;
    /**
     * 切换骨架显示
     * @param {boolean} enabled - 是否启用
     */
    toggleSkeleton(enabled: boolean): void;
    /**
     * 切换关键点显示
     * @param {boolean} enabled - 是否启用
     */
    toggleKeypoints(enabled: boolean): void;
    /**
     * 切换系统监控面板显示
     * @param {boolean} enabled - 是否启用
     */
    togglePerformanceInfo(enabled: boolean): void;
    /**
     * 切换模型参数面板显示
     * @param {boolean} enabled - 是否启用
     */
    toggleModelPanel(enabled: boolean): void;
    /**
     * 切换滤波器
     * @param {boolean} enabled - 是否启用
     */
    toggleFilter(enabled: boolean): void;
    /**
     * 切换One Euro Filter参数面板显示
     * @param {boolean} enabled - 是否启用
     */
    toggleFilterPanel(enabled: boolean): void;
    /**
     * 应用滤波器预设
     * @param {string} presetName - 预设名称
     */
    applyFilterPreset(presetName: string): void;
    /**
     * 更新滤波器参数
     * @param {string} paramName - 参数名称
     * @param {number} value - 参数值
     */
    updateFilterParam(paramName: string, value: number): void;
    /**
     * 重置滤波器参数
     */
    resetFilterParams(): void;
    /**
     * 应用滤波器配置
     */
    applyFilterConfig(): void;
    /**
     * 重启应用
     */
    restart(): Promise<void>;
    /**
     * 清空缓存
     */
    clearCache(): Promise<void>;
    /**
     * 暂停/继续检测
     */
    togglePause(): Promise<void>;
    /**
     * 获取用户友好的错误消息
     * @param {unknown} error - 错误对象
     * @returns {string} 用户友好的错误消息
     */
    getErrorMessage(error: unknown): string;
    /**
     * 清理应用资源
     * @returns {Promise<void>}
     */
    cleanup(): Promise<void>;
    /**
     * 获取应用状态
     * @returns {Object} 应用状态信息
     */
    getAppStatus(): {
        isInitialized: boolean;
        currentOptions: {
            modelType: string;
            showSkeleton: boolean;
            showKeypoints: boolean;
            showPerformanceInfo: boolean;
            showModelPanel: boolean;
            showFilterPanel: boolean;
            enableFilter: boolean;
        };
        poseEstimator: any;
        ui: any;
        performance: PerformanceReport;
        cache: any;
    };
}
/**
 * 主函数 - 应用入口点
 */
declare function main(): Promise<void>;
export { PoseEstimationApp, main };
//# sourceMappingURL=main.d.ts.map