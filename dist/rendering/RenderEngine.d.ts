/**
 * 渲染引擎模块
 * 负责姿态检测结果的可视化渲染和UI更新
 */
import { PoseEstimationResult, AnalysisResult, Renderer, RenderEngine, RenderEngineConfig, ExtendedRenderData } from '../types/index.js';
/**
 * Canvas渲染引擎实现
 */
export declare class CanvasRenderEngine implements RenderEngine {
    private canvas;
    private ctx;
    private animationId;
    private renderer;
    private _isInitialized;
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
     * 清空画布
     */
    clear(): void;
    /**
     * 调整画布大小
     */
    resize(width: number, height: number): void;
    /**
     * 释放资源
     */
    dispose(): void;
    /**
     * 设置画布
     */
    private setupCanvas;
    /**
     * 渲染姿态数据
     */
    private renderPoses;
    /**
     * 渲染骨骼连接
     */
    private renderSkeleton;
    /**
     * 渲染关键点
     */
    private renderKeypoints;
    /**
     * 渲染边界框
     */
    private renderBoundingBox;
    /**
     * 渲染置信度信息
     */
    private renderConfidence;
    /**
     * 渲染分析结果
     */
    private renderAnalysis;
    /**
     * 渲染性能信息
     */
    private renderPerformance;
    /**
     * 渲染无检测结果
     */
    private renderNoDetection;
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
    /**
     * 渲染视频帧背景
     */
    private renderVideoFrame;
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