/**
 * 渲染引擎模块
 * 负责姿态检测结果的可视化渲染和UI更新
 */
import { PoseEstimationResult, AnalysisResult, Renderer, RenderEngine, RenderEngineConfig, ExtendedRenderData } from '../types/index.js';
import type { InputSourceType } from '../utils/IntelligentFrameRateController.js';
import { ScenarioType } from '../utils/IntelligentKeypointStabilizer.js';
/**
 * Canvas渲染引擎实现
 */
export declare class CanvasRenderEngine implements RenderEngine {
    private canvas;
    private ctx;
    private animationId;
    private renderer;
    private _isInitialized;
    private offscreenCanvas;
    private offscreenCtx;
    private imageCache;
    private currentInputSource;
    private stabilizationEnabled;
    private currentScenario;
    private defaultConfig;
    /**
     * 检查是否已初始化
     */
    get isInitialized(): boolean;
    /**
     * 设置渲染器
     */
    setRenderer(renderer: Renderer): void;
    /**
     * 初始化渲染引擎
     */
    initialize(config: RenderEngineConfig): void;
    /**
     * 渲染数据
     */
    render(data: ExtendedRenderData): void;
    /**
     * 渲染数据（兼容性方法）
     */
    renderPoseResult(poseResult: PoseEstimationResult, analysisResult?: AnalysisResult): void;
    /**
     * 更新配置
     */
    updateConfig(config: Partial<RenderEngineConfig>): void;
    /**
     * 设置输入源类型（用于智能帧率控制）
     */
    setInputSource(sourceType: InputSourceType): void;
    /**
     * 获取当前输入源类型
     */
    getCurrentInputSource(): InputSourceType;
    /**
     * 获取当前性能统计
     */
    getPerformanceStats(): {
        current: import("../utils/IntelligentFrameRateController.js").PerformanceMetrics | null;
        average: import("../utils/IntelligentFrameRateController.js").PerformanceMetrics | null;
        config: import("../utils/IntelligentFrameRateController.js").FrameRateConfig;
        deviceInfo: string;
    };
    /**
     * 重置性能统计
     */
    resetPerformanceStats(): void;
    /**
     * 应用关键点稳定
     */
    private applyKeypointStabilization;
    /**
     * 设置关键点稳定场景
     */
    setStabilizationScenario(scenario: ScenarioType): void;
    /**
     * 获取当前关键点稳定场景
     */
    getCurrentScenario(): ScenarioType;
    /**
     * 启用/禁用关键点稳定
     */
    setStabilizationEnabled(enabled: boolean): void;
    /**
     * 获取关键点稳定统计
     */
    getStabilizationStats(): any;
    /**
     * 清空画布
     */
    clear(): void;
    /**
     * 调整画布尺寸
     */
    resize(width: number, height: number): void;
    /**
     * 释放资源
     */
    dispose(): void;
    /**
     * 优化的清空画布方法
     */
    private clearCanvas;
    /**
     * 优化的视频帧渲染
     */
    private renderVideoFrameOptimized;
    /**
     * 优化的姿态渲染
     */
    private renderPosesOptimized;
    /**
     * 优化的骨骼渲染
     */
    private renderSkeletonOptimized;
    /**
     * 优化的关键点渲染
     */
    private renderKeypointsOptimized;
    /**
     * 优化的边界框渲染
     */
    private renderBoundingBoxOptimized;
    /**
     * 优化的置信度渲染
     */
    private renderConfidenceOptimized;
    /**
     * 优化的分析结果渲染
     */
    private renderAnalysisOptimized;
    /**
     * 优化的性能信息渲染
     */
    private renderPerformanceOptimized;
    /**
     * 设置Canvas上下文样式
     */
    private setupCanvasContext;
    /**
     * 获取骨骼连接定义
     */
    private getSkeletonConnections;
    /**
     * 查找关键点
     */
    private findKeypoint;
    /**
     * 十六进制颜色转RGBA
     */
    private hexToRgba;
}
/**
 * WebGL渲染引擎实现（高性能版本）
 */
export declare class WebGLRenderEngine implements RenderEngine {
    private canvas;
    private gl;
    private config;
    private _isInitialized;
    constructor();
    get isInitialized(): boolean;
    initialize(config: RenderEngineConfig): void;
    render(_data: ExtendedRenderData): void;
    /**
     * 渲染数据（兼容性方法）
     */
    renderPoseResult(poseResult: PoseEstimationResult, analysisResult?: AnalysisResult): void;
    updateConfig(config: Partial<RenderEngineConfig>): void;
    clear(): void;
    resize(width: number, height: number): void;
    dispose(): void;
    private setupWebGL;
}
/**
 * 渲染引擎工厂
 */
export declare class RenderEngineFactory {
    static create(type?: 'canvas' | 'webgl'): RenderEngine;
}
//# sourceMappingURL=RenderEngine.d.ts.map