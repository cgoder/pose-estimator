import { AppState, ModelType, AppConfig, RenderEngineConfig } from '../types/index.js';
/**
 * 重构后的主应用类
 * 采用事件驱动和状态管理的架构，集成新的模块化引擎
 */
export declare class PoseEstimationApp {
    private dataSource;
    private inferenceEngine;
    private analysisEngine;
    private renderEngine;
    private workerManager;
    private isInitialized;
    private isRunning;
    private config;
    private lastInferenceTime;
    private targetInferenceInterval;
    private frameSkipCount;
    private maxFrameSkip;
    private errorRecoveryAttempts;
    private readonly maxRecoveryAttempts;
    private readonly recoveryDelay;
    private qualityChecker;
    private performanceMonitor;
    /**
     * 智能错误恢复
     */
    private handleErrorWithRecovery;
    /**
     * 恢复推理引擎
     */
    private recoverInferenceEngine;
    /**
     * 恢复 Worker 管理器
     */
    private recoverWorkerManager;
    /**
     * 恢复数据源
     */
    private recoverDataSource;
    /**
     * 恢复渲染引擎
     */
    private recoverRenderEngine;
    constructor(config?: Partial<AppConfig>);
    /**
     * 合并默认配置
     */
    private mergeWithDefaultConfig;
    /**
     * 初始化应用
     */
    init(canvas?: HTMLCanvasElement): Promise<void>;
    /**
     * 设置数据源
     * @param type 数据源类型
     * @param options 选项
     */
    setDataSource(type: 'camera' | 'videoFile' | 'imageFile', options?: any): Promise<void>;
    /**
     * 启动应用
     */
    start(): Promise<void>;
    /**
     * 停止应用
     */
    stop(): void;
    /**
     * 重启应用
     */
    restart(): Promise<void>;
    /**
     * 切换AI模型
     * @param modelType 模型类型
     */
    switchModel(modelType: ModelType): Promise<void>;
    /**
     * 设置运动类型
     */
    setExercise(exerciseType: string, parameters?: Record<string, any>): void;
    /**
     * 更新渲染配置
     */
    updateRenderConfig(config: Partial<RenderEngineConfig>): void;
    /**
     * 获取应用状态
     */
    getAppStatus(): {
        isInitialized: boolean;
        isRunning: boolean;
        dataSourceType: string | null;
        state: AppState;
    };
    /**
     * 设置事件监听器
     */
    private setupEventListeners;
    /**
     * 绑定数据源事件
     */
    private bindDataSourceEvents;
    /**
     * 处理图像帧
     */
    private processFrame;
    /**
     * 更新性能指标
     */
    private updatePerformanceMetrics;
    /**
     * 智能推理控制 - 决定是否应该运行推理
     */
    private shouldRunInference;
    /**
     * 动态调整推理频率
     */
    private adjustInferenceFrequency;
    /**
     * 发送应用事件
     */
    private emitAppEvent;
    /**
     * 环境检查
     */
    private performEnvironmentChecks;
    /**
     * 初始化Worker管理器
     */
    private initializeWorkerManager;
    /**
     * 初始化推理引擎
     */
    private initializeInferenceEngine;
    /**
     * 初始化分析引擎
     */
    private initializeAnalysisEngine;
    /**
     * 初始化渲染引擎
     */
    private initializeRenderEngine;
    /**
     * 获取内存使用情况
     */
    private getMemoryUsage;
    /**
     * 清理资源
     */
    dispose(): Promise<void>;
}
export declare function createPoseEstimationApp(config?: Partial<AppConfig>): PoseEstimationApp;
export declare const poseApp: PoseEstimationApp;
//# sourceMappingURL=PoseEstimationApp.d.ts.map