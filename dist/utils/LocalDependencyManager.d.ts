/**
 * 本地 TensorFlow.js 依赖管理器
 * 避免依赖外部 CDN，提供更可靠的依赖加载方案
 */
export interface LocalDependencyConfig {
    useLocalFallback: boolean;
    cdnTimeout: number;
    retryAttempts: number;
    enableCaching: boolean;
}
export interface DependencyInfo {
    name: string;
    version: string;
    url: string;
    fallbackUrl?: string;
    isLoaded: boolean;
    loadTime?: number;
}
/**
 * 本地依赖管理器
 */
export declare class LocalDependencyManager {
    private config;
    private dependencies;
    private loadPromises;
    constructor(config?: Partial<LocalDependencyConfig>);
    /**
     * 初始化依赖信息
     */
    private initializeDependencies;
    /**
     * 加载所有依赖
     */
    loadAllDependencies(): Promise<void>;
    /**
     * 加载单个依赖
     */
    loadDependency(name: string): Promise<void>;
    /**
     * 执行实际的加载操作
     */
    private performLoad;
    /**
     * 获取加载方法列表
     */
    private getLoadMethods;
    /**
     * 尝试加载方法
     */
    private tryLoadMethod;
    /**
     * 检查依赖是否已加载
     */
    isDependencyLoaded(name: string): boolean;
    /**
     * 获取所有依赖状态
     */
    getDependencyStatus(): Map<string, DependencyInfo>;
    /**
     * 生成 Worker 兼容的加载脚本
     */
    generateWorkerScript(): string;
    /**
     * 创建本地依赖文件
     */
    createLocalDependencies(): Promise<void>;
    /**
     * 下载并保存本地文件
     */
    private downloadAndSaveLocal;
}
export declare const localDependencyManager: LocalDependencyManager;
//# sourceMappingURL=LocalDependencyManager.d.ts.map