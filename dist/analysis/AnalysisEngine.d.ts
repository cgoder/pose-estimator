/**
 * 分析引擎模块
 * 负责姿态数据的分析、运动学计算和健身动作识别
 */
import { EventBusImpl } from '../core/EventBus.js';
import { AnalysisResult, ExerciseType, MovementMetrics, AnalysisEngineConfig } from '../types/index.js';
/**
 * 分析引擎接口
 */
export interface AnalysisEngine {
    initialize(config: AnalysisEngineConfig): void;
    analyze(poses: any[]): AnalysisResult;
    setExerciseType(exerciseType: ExerciseType): void;
    reset(): void;
    getMetrics(): MovementMetrics;
    dispose(): void;
}
/**
 * 健身分析引擎实现
 */
export declare class FitnessAnalysisEngine implements AnalysisEngine {
    private eventBus;
    private currentExercise;
    private poseHistory;
    private repetitionCount;
    private currentPhase;
    private metrics;
    private config;
    private _isInitialized;
    private analyzers;
    private exerciseParameters;
    constructor(eventBusInstance?: EventBusImpl);
    get isInitialized(): boolean;
    addAnalyzer(analyzer: any): void;
    removeAnalyzer(type: string): void;
    setExercise(config: {
        type: string;
        parameters: Record<string, any>;
    }): void;
    /**
     * 为特定运动配置分析器
     */
    private configureAnalyzersForExercise;
    /**
      * 配置深蹲分析器
      */
    private configureSquatAnalyzer;
    /**
     * 配置俯卧撑分析器
     */
    private configurePushupAnalyzer;
    /**
     * 配置平板支撑分析器
     */
    private configurePlankAnalyzer;
    /**
     * 配置跑步分析器
     */
    private configureRunningAnalyzer;
    /**
     * 配置通用分析器
     */
    private configureGeneralAnalyzer;
    /**
     * 初始化分析引擎
     */
    initialize(config: AnalysisEngineConfig): void;
    /**
     * 分析姿态数据
     */
    analyze(poses: any[]): AnalysisResult;
    /**
     * 设置运动类型
     */
    setExerciseType(exerciseType: ExerciseType): void;
    /**
     * 重置分析状态
     */
    reset(): void;
    /**
     * 获取运动指标
     */
    getMetrics(): MovementMetrics;
    /**
     * 释放资源
     */
    dispose(): void;
    /**
     * 更新姿态历史
     */
    private updatePoseHistory;
    /**
     * 分析动作形式
     */
    private analyzeForm;
    /**
     * 深蹲动作分析
     */
    private analyzeSquatForm;
    /**
     * 俯卧撑动作分析
     */
    private analyzePushupForm;
    /**
     * 平板支撑分析
     */
    private analyzePlankForm;
    /**
     * 跑步姿态分析
     */
    private analyzeRunningForm;
    /**
     * 通用姿态分析
     */
    private analyzeGeneralForm;
    /**
     * 计算运动指标
     */
    private calculateMovementMetrics;
    /**
     * 更新重复次数
     */
    private updateRepetitionCount;
    /**
     * 更新深蹲计数
     */
    private updateSquatCount;
    /**
     * 更新俯卧撑计数
     */
    private updatePushupCount;
    /**
     * 查找关键点
     */
    private findKeypoint;
    /**
     * 计算角度
     */
    private calculateAngle;
    /**
     * 计算背部角度
     */
    private calculateBackAngle;
    /**
     * 检查身体对齐度
     */
    private checkBodyAlignment;
    /**
     * 点到直线距离
     */
    private pointToLineDistance;
    /**
     * 计算运动速度
     */
    private calculateVelocity;
    /**
     * 计算稳定性
     */
    private calculateStability;
    /**
     * 计算对称性
     */
    private calculateSymmetry;
    /**
     * 计算步频
     */
    private calculateCadence;
    /**
     * 分析着地方式
     */
    private analyzeFootStrike;
    /**
     * 计算身体前倾角度
     */
    private calculateBodyLean;
    /**
     * 计算置信度
     */
    private calculateConfidence;
    /**
     * 更新整体指标
     */
    private updateMetrics;
    /**
     * 初始化指标
     */
    private initializeMetrics;
}
/**
 * 分析引擎工厂
 */
export declare class AnalysisEngineFactory {
    static create(type: "fitness" | undefined, eventBus: EventBusImpl): AnalysisEngine;
}
//# sourceMappingURL=AnalysisEngine.d.ts.map