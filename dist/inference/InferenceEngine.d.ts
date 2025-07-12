/**
 * AI推理引擎模块
 * 负责TensorFlow.js模型的加载、推理和结果处理
 */
import { InferenceEngine, InferenceEngineConfig, InferenceResult, ModelType } from '../types/index.js';
/**
 * TensorFlow.js推理引擎实现
 */
export declare class TensorFlowInferenceEngine implements InferenceEngine {
    private model;
    private _modelType;
    private config;
    private _isInitialized;
    constructor(workerManager?: any);
    get isInitialized(): boolean;
    get modelType(): ModelType | null;
    /**
     * 初始化推理引擎
     */
    initialize(config: InferenceEngineConfig): Promise<void>;
    /**
     * 执行姿态估计推理
     */
    predict(imageData: ImageData): Promise<InferenceResult>;
    /**
     * 加载MoveNet模型
     */
    private loadMoveNetModel;
    /**
     * 加载PoseNet模型
     */
    private loadPoseNetModel;
    /**
     * 加载BlazePose模型
     */
    private loadBlazePoseModel;
    /**
     * MoveNet推理
     */
    private predictMoveNet;
    /**
     * PoseNet推理
     */
    private predictPoseNet;
    /**
     * BlazePose推理
     */
    private predictBlazePose;
    /**
     * 预处理输入数据
     */
    private preprocessInput;
    /**
     * 后处理姿态结果
     */
    private postprocessPoses;
    /**
     * 标准化关键点坐标
     */
    private normalizeKeypoints;
    /**
     * 获取模型信息
     */
    getModelInfo(): {
        name: string;
        version: string;
        backend: string;
    } | null;
    /**
     * 释放模型资源
     */
    dispose(): void;
}
/**
 * 推理引擎工厂
 */
export declare class InferenceEngineFactory {
    static create(type?: 'tensorflow'): InferenceEngine;
}
//# sourceMappingURL=InferenceEngine.d.ts.map