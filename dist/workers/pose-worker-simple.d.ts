/**
 * 姿态估计 Worker - 简化版本
 * 提供基础的姿态估计功能，专注于性能和稳定性
 * 使用经典 Worker 脚本模式以支持 importScripts
 */
interface WorkerMessage {
    id?: string;
    type: 'initialize' | 'loadModel' | 'predict' | 'ping';
    payload?: any;
}
interface WorkerResponse {
    id?: string;
    type?: string;
    payload?: any;
    error?: string;
}
/**
 * 动态加载脚本的函数
 */
declare function loadScript(url: string): Promise<void>;
/**
 * 异步加载统一依赖配置
 */
declare function loadUnifiedDependencyConfig(): Promise<void>;
/**
 * 安全的依赖加载函数 - 使用统一配置
 */
declare function loadDependenciesSafely(): Promise<void>;
declare let workerInitialized: boolean;
declare let dependenciesLoaded: boolean;
declare let poseModel: any;
declare let currentModelType: string | null;
/**
 * 初始化 Worker
 */
declare function initializeWorker(): Promise<{
    success: boolean;
    info: any;
}>;
/**
 * 加载姿态估计模型
 */
declare function loadPoseModel(modelTypeParam: string, config?: any): Promise<{
    success: boolean;
    modelType: string;
}>;
/**
 * 执行姿态预测
 */
declare function predictPose(imageData: ImageData): Promise<any>;
//# sourceMappingURL=pose-worker-simple.d.ts.map