/**
 * 动态依赖加载管理器
 * 负责按需加载 TensorFlow.js 依赖，避免在主页面预加载
 */
export interface DependencyConfig {
    tensorflow: string;
    tensorflowWebGL: string;
    poseDetection: string;
}
export interface LoadingOptions {
    timeout?: number;
    retryCount?: number;
    retryDelay?: number;
}
/**
 * 动态依赖加载器
 */
export declare class DynamicDependencyLoader {
    private static instance;
    private isLoading;
    private isLoaded;
    private loadPromise;
    private readonly dependencies;
    private readonly fallbackDependencies;
    private constructor();
    /**
     * 获取单例实例
     */
    static getInstance(): DynamicDependencyLoader;
    /**
     * 检查依赖是否已加载
     */
    isDependenciesLoaded(): boolean;
    /**
     * 动态加载 TensorFlow.js 依赖
     */
    loadDependencies(options?: LoadingOptions): Promise<void>;
    /**
     * 执行实际的加载过程
     */
    private performLoad;
    /**
     * 加载脚本 - 修复：按正确顺序加载依赖
     */
    private loadScripts;
    /**
     * 等待 TensorFlow.js 核心库初始化完成
     */
    private waitForTensorFlowCore;
    /**
     * 等待 WebGL 后端初始化完成
     */
    private waitForWebGLBackend;
    /**
     * 加载单个脚本
     */
    private loadScript;
    /**
     * 验证依赖是否正确加载
     */
    private validateDependencies;
    /**
     * 延迟函数
     */
    private delay;
    /**
     * 获取加载状态
     */
    getLoadingStatus(): {
        isLoading: boolean;
        isLoaded: boolean;
        isDependenciesAvailable: boolean;
    };
    /**
     * 重置加载状态（用于测试）
     */
    reset(): void;
}
export declare const dynamicDependencyLoader: DynamicDependencyLoader;
//# sourceMappingURL=DynamicDependencyLoader.d.ts.map