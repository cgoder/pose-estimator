import { OneEuroFilterManager } from './OneEuroFilterManager.js';
/**
 * 姿态估计器主类
 * 负责摄像头管理、模型加载、姿态检测和渲染
 */
export declare class PoseEstimator {
    private canvas;
    private ctx;
    private video;
    private detector;
    isRunning: boolean;
    private animationId;
    private options;
    filterManager: OneEuroFilterManager;
    private stats;
    constructor(canvas: HTMLCanvasElement, options?: any);
    /**
     * 设置摄像头
     * @returns {Promise<void>}
     */
    _setupCamera(): Promise<void>;
    /**
     * 加载模型
     * @returns {Promise<void>}
     */
    _loadModel(): Promise<void>;
    /**
     * 姿态检测循环
     */
    _detectPoseInRealTime(): Promise<void>;
    /**
     * 绘制骨架连接
     * @param {Array} keypoints - 关键点数组
     */
    _drawSkeleton(keypoints: any[]): void;
    /**
     * 绘制关键点
     * @param {Array} keypoints - 关键点数组
     */
    _drawKeypoints(keypoints: any[]): void;
    /**
     * 开始姿态检测
     * @returns {Promise<void>}
     */
    start(): Promise<void>;
    /**
     * 停止姿态检测
     * @returns {Promise<void>}
     */
    stop(): Promise<void>;
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    cleanup(): Promise<void>;
    /**
     * 更新滤波器参数
     * @param {Object} params - 新的滤波器参数
     */
    updateFilterParameters(params: any): void;
    /**
     * 重置滤波器为默认参数
     */
    resetFilterToDefaults(): void;
    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus(): any;
    /**
     * 预加载模型
     * @returns {Promise<void>}
     */
    static preloadModels(): Promise<void>;
}
//# sourceMappingURL=PoseEstimator.d.ts.map