/**
 * 姿态估计 Worker - 完整版本
 * 提供完整的姿态估计功能，包括多种模型支持和高级配置
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
interface Keypoint {
    x: number;
    y: number;
    score?: number;
    name?: string;
}
interface Pose {
    keypoints: Keypoint[];
    score?: number;
}
/**
 * 使用 Promise 包装的脚本加载函数
 */
declare function loadScriptFull(url: string): Promise<void>;
/**
 * 异步加载统一依赖配置
 */
declare function loadUnifiedDependencyConfigFull(): Promise<void>;
/**
 * 异步加载 CDN 依赖 - 使用统一配置
 */
declare function loadDependenciesSafelyFull(): Promise<void>;
/**
 * Worker状态
 */
declare let fullWorkerInitialized: boolean;
declare let fullDependenciesLoaded: boolean;
declare let isInitialized: boolean;
declare let model: any;
declare let modelType: string | null;
/**
 * 初始化Worker
 */
declare function initialize(): Promise<{
    success: boolean;
}>;
/**
 * 加载姿态估计模型
 */
declare function loadModel(modelTypeParam: string, config?: any): Promise<{
    success: boolean;
    modelType: string;
}>;
/**
 * 执行姿态估计推理
 */
declare function predict(imageData: ImageData): Promise<{
    result: any;
}>;
/**
 * 标准化关键点坐标
 */
declare function normalizeKeypoints(keypoints: Keypoint[]): Keypoint[];
//# sourceMappingURL=pose-worker.d.ts.map