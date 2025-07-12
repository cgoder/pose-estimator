/**
 * 渲染引擎模块
 * 负责姿态检测结果的可视化渲染和UI更新
 */

import { eventBus } from '../core/EventBus.js';
import { 
  PoseEstimationResult, 
  AnalysisResult, 
  RenderConfig,
  RenderData,
  Renderer,
  RenderEngine,
  RenderEngineConfig,
  ExtendedRenderData,
  PerformanceMetrics,
  Keypoint,
  Pose,
  BoundingBox
} from '../types/index.js';

/**
 * Canvas渲染引擎实现
 */
export class CanvasRenderEngine implements RenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationId: number | null = null;
  private renderer: Renderer | null = null;
  private _isInitialized: boolean = false;

  // 默认配置
  private defaultConfig: RenderConfig = {
    showKeypoints: true,
    showSkeleton: true,
    showBoundingBox: false,
    showConfidence: true,
    showAnalysis: true,
    showPerformance: false,
    keypointRadius: 4,
    skeletonLineWidth: 2,
    confidenceThreshold: 0.3,
    colors: {
      keypoint: '#00ff00',
      skeleton: '#ff0000',
      confidence: '#FFE66D',
      boundingBox: '#0000ff',
      text: '#ffffff',
      background: 'rgba(0, 0, 0, 0.1)'
    },
    fontSize: 14,
    fontFamily: 'Arial, sans-serif'
  };



  /**
   * 检查是否已初始化
   */
  get isInitialized(): boolean {
    return this._isInitialized;
  }

  /**
   * 设置渲染器
   */
  setRenderer(renderer: Renderer): void {
    this.renderer = renderer;
  }

  /**
   * 初始化渲染引擎
   */
  initialize(config: RenderEngineConfig): void {
    this.canvas = config.canvas;
    this.ctx = this.canvas.getContext('2d');
    
    if (!this.ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }

    // 合并配置
    if (config) {
      this.defaultConfig = { 
        ...this.defaultConfig,
        showKeypoints: config.showKeypoints ?? this.defaultConfig.showKeypoints,
        showSkeleton: config.showSkeleton ?? this.defaultConfig.showSkeleton,
        showBoundingBox: config.showBoundingBox ?? this.defaultConfig.showBoundingBox,
        showConfidence: config.showConfidence ?? this.defaultConfig.showConfidence,
        showAnalysis: config.showAnalysis ?? this.defaultConfig.showAnalysis,
        showPerformance: config.showPerformance ?? this.defaultConfig.showPerformance
      };
    }

    this.setupCanvas();
    this._isInitialized = true;
    eventBus.emit('render:initialized');
  }

  /**
   * 渲染数据
   */
  render(data: ExtendedRenderData): void {
    if (!this.canvas || !this.ctx) {
      console.warn('渲染引擎未初始化');
      return;
    }

    try {
      // 如果有设置的渲染器，使用渲染器
      if (this.renderer) {
        this.renderer.render(data);
        return;
      }

      // 否则使用内置渲染逻辑
      // 清空画布
      this.clear();

      // 渲染视频帧背景
      if (data.frame && data.frame.imageData) {
        this.renderVideoFrame(data.frame.imageData);
      }

      // 渲染姿态数据
      if (data.poses.length > 0) {
        this.renderPoses(data.poses);
      } else {
        this.renderNoDetection();
      }

      // 渲染分析结果
      if (data.analysis) {
        this.renderAnalysis(data.analysis);
      }

      // 渲染性能信息
      if (data.performance && this.defaultConfig.showPerformance) {
        this.renderPerformance(data.performance);
      }

      eventBus.emit('render:frame', data);

    } catch (error) {
      eventBus.emit('render:error', { 
        error: error instanceof Error ? error.message : '渲染失败' 
      });
    }
  }

  /**
   * 渲染数据（兼容性方法）
   */
  renderPoseResult(poseResult: PoseEstimationResult, analysisResult?: AnalysisResult): void {
    const renderData: RenderData = {
      frame: {
        imageData: new ImageData(this.canvas?.width || 640, this.canvas?.height || 480),
        width: this.canvas?.width || 640,
        height: this.canvas?.height || 480,
        timestamp: Date.now()
      },
      poses: poseResult.poses,
      ...(analysisResult && { analysis: analysisResult }),
      config: {
        showKeypoints: this.defaultConfig.showKeypoints,
        showSkeleton: this.defaultConfig.showSkeleton,
        showConfidence: this.defaultConfig.showConfidence,
        showBoundingBox: this.defaultConfig.showBoundingBox,
        showAnalysis: this.defaultConfig.showAnalysis,
        showPerformance: this.defaultConfig.showPerformance,
        keypointRadius: this.defaultConfig.keypointRadius,
        skeletonLineWidth: this.defaultConfig.skeletonLineWidth,
        colors: this.defaultConfig.colors
      }
    };
    
    this.render(renderData);
  }

  /**
   * 更新配置
   */
  updateConfig(config: Partial<RenderEngineConfig>): void {
    this.defaultConfig = { 
      ...this.defaultConfig,
      showKeypoints: config.showKeypoints ?? this.defaultConfig.showKeypoints,
      showSkeleton: config.showSkeleton ?? this.defaultConfig.showSkeleton,
      showBoundingBox: config.showBoundingBox ?? this.defaultConfig.showBoundingBox,
      showConfidence: config.showConfidence ?? this.defaultConfig.showConfidence,
      showAnalysis: config.showAnalysis ?? this.defaultConfig.showAnalysis,
      showPerformance: config.showPerformance ?? this.defaultConfig.showPerformance
    };
    eventBus.emit('render:config-updated', this.defaultConfig);
  }

  /**
   * 清空画布
   */
  clear(): void {
    if (!this.canvas || !this.ctx) return;

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 绘制背景
    if (this.defaultConfig.colors?.background) {
      this.ctx.fillStyle = this.defaultConfig.colors.background;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  /**
   * 调整画布大小
   */
  resize(width: number, height: number): void {
    if (!this.canvas) return;

    this.canvas.width = width;
    this.canvas.height = height;
    this.setupCanvas();
    eventBus.emit('render:resized', { width, height });
  }

  /**
   * 释放资源
   */
  dispose(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    
    this.canvas = null;
    this.ctx = null;
    this._isInitialized = false;
    eventBus.emit('render:disposed');
  }

  /**
   * 设置画布
   */
  private setupCanvas(): void {
    if (!this.ctx) return;

    // 设置画布样式
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
    this.ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;
  }

  /**
   * 渲染姿态数据
   */
  private renderPoses(poses: Pose[]): void {
    if (!this.ctx) return;

    poses.forEach((pose, index) => {
      // 渲染关键点
      if (this.defaultConfig.showKeypoints) {
        this.renderKeypoints(pose.keypoints);
      }

      // 渲染骨骼
      if (this.defaultConfig.showSkeleton) {
        this.renderSkeleton(pose.keypoints);
      }

      // 渲染边界框
      if (this.defaultConfig.showBoundingBox && pose.box) {
        this.renderBoundingBox(pose.box);
      }

      // 渲染置信度
      if (this.defaultConfig.showConfidence) {
        this.renderConfidence(pose.score || 0, index);
      }
    });
  }

  /**
   * 渲染骨骼连接
   */
  private renderSkeleton(keypoints: Keypoint[]): void {
    if (!this.ctx) return;

    const connections = this.getSkeletonConnections();
    
    this.ctx.strokeStyle = this.defaultConfig.colors.skeleton;
    this.ctx.lineWidth = this.defaultConfig.skeletonLineWidth;

    for (const [startName, endName] of connections) {
      const startPoint = this.findKeypoint(keypoints, startName);
      const endPoint = this.findKeypoint(keypoints, endName);

      if (startPoint && endPoint && 
          startPoint.score > (this.defaultConfig.confidenceThreshold || 0.3) && 
          endPoint.score > (this.defaultConfig.confidenceThreshold || 0.3)) {
        
        this.ctx.beginPath();
        this.ctx.moveTo(startPoint.x, startPoint.y);
        this.ctx.lineTo(endPoint.x, endPoint.y);
        this.ctx.stroke();
      }
    }
  }

  /**
   * 渲染关键点
   */
  private renderKeypoints(keypoints: Keypoint[]): void {
    if (!this.ctx) return;

    for (const keypoint of keypoints) {
      if (keypoint.score > (this.defaultConfig.confidenceThreshold || 0.3)) {
        // 根据置信度调整颜色透明度
        const alpha = Math.min(1, keypoint.score * 1.5);
        this.ctx.fillStyle = this.hexToRgba(this.defaultConfig.colors.keypoint, alpha);
        
        this.ctx.beginPath();
        this.ctx.arc(keypoint.x, keypoint.y, this.defaultConfig.keypointRadius, 0, 2 * Math.PI);
        this.ctx.fill();

        // 渲染关键点标签
        if (this.defaultConfig.showConfidence) {
          this.ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
          this.ctx.fillText(
            `${keypoint.name}: ${(keypoint.score * 100).toFixed(0)}%`,
            keypoint.x + this.defaultConfig.keypointRadius + 2,
            keypoint.y - this.defaultConfig.keypointRadius
          );
        }
      }
    }
  }

  /**
   * 渲染边界框
   */
  private renderBoundingBox(box: BoundingBox): void {
    if (!this.ctx) return;

    this.ctx.strokeStyle = this.defaultConfig.colors.boundingBox || '#95E1D3';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  /**
   * 渲染置信度信息
   */
  private renderConfidence(score: number, index: number): void {
    if (!this.ctx) return;

    this.ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    this.ctx.fillText(
      `姿态 ${index + 1} 置信度: ${(score * 100).toFixed(1)}%`,
      10,
      10 + index * 20
    );
  }

  /**
   * 渲染分析结果
   */
  private renderAnalysis(analysisResult: AnalysisResult): void {
    if (!this.ctx || !this.canvas) return;

    const x = 10;
    let y = 40;
    const lineHeight = (this.defaultConfig.fontSize || 12) + 4;

    this.ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';

    // 渲染时间戳
    this.ctx.fillText(`分析时间: ${new Date(analysisResult.timestamp).toLocaleTimeString()}`, x, y);
    y += lineHeight;

    // 渲染重复次数
    if (analysisResult.repetition) {
      this.ctx.fillText(`重复次数: ${analysisResult.repetition.count}`, x, y);
      y += lineHeight;
      this.ctx.fillText(`当前阶段: ${analysisResult.repetition.phase}`, x, y);
      y += lineHeight;
      this.ctx.fillText(`置信度: ${(analysisResult.repetition.confidence * 100).toFixed(1)}%`, x, y);
      y += lineHeight;
    }

    // 渲染姿态评估
    if (analysisResult.posture) {
      y += 10; // 间距
      this.ctx.fillText('姿态评估:', x, y);
      y += lineHeight;
      this.ctx.fillText(`  评分: ${analysisResult.posture.score.toFixed(1)}`, x, y);
      y += lineHeight;
      
      if (analysisResult.posture.issues.length > 0) {
        this.ctx.fillText('  问题:', x, y);
        y += lineHeight;
        for (const issue of analysisResult.posture.issues.slice(0, 3)) {
          this.ctx.fillText(`    • ${issue}`, x, y);
          y += lineHeight;
        }
      }
    }

    // 渲染跑姿分析
    if (analysisResult.runningGait) {
      y += 10; // 间距
      this.ctx.fillText('跑姿分析:', x, y);
      y += lineHeight;
      this.ctx.fillText(`  步频: ${analysisResult.runningGait.cadence.toFixed(1)} spm`, x, y);
      y += lineHeight;
      this.ctx.fillText(`  步长: ${analysisResult.runningGait.strideLength.toFixed(2)} m`, x, y);
      y += lineHeight;
      this.ctx.fillText(`  触地时间: ${analysisResult.runningGait.groundContactTime.toFixed(0)} ms`, x, y);
      y += lineHeight;
    }
  }

  /**
   * 渲染性能信息
   */
  private renderPerformance(performance: PerformanceMetrics): void {
    if (!this.ctx || !this.canvas) return;

    const x = this.canvas.width - 200;
    let y = 20;
    const lineHeight = 20;

    // 设置文本样式
    this.ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    this.ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;

    // 渲染性能指标
    this.ctx.fillText('性能指标:', x, y);
    y += lineHeight;
    this.ctx.fillText(`  帧率: ${performance.frameRate.toFixed(1)} FPS`, x, y);
    y += lineHeight;
    this.ctx.fillText(`  推理时间: ${performance.inferenceTime.toFixed(1)} ms`, x, y);
    y += lineHeight;
    this.ctx.fillText(`  平均帧时间: ${performance.averageFrameTime.toFixed(1)} ms`, x, y);
    y += lineHeight;
    
    if (performance.memoryUsage) {
      this.ctx.fillText(`  内存使用: ${(performance.memoryUsage.used / 1024 / 1024).toFixed(1)} MB`, x, y);
      y += lineHeight;
    }
    
    if (performance.tensorflowMemory) {
      this.ctx.fillText(`  张量数量: ${performance.tensorflowMemory.numTensors}`, x, y);
      y += lineHeight;
    }
  }

  /**
   * 渲染无检测结果
   */
  private renderNoDetection(): void {
    if (!this.ctx || !this.canvas) return;

    const text = '未检测到人体姿态';
    const x = this.canvas.width / 2;
    const y = this.canvas.height / 2;

    this.ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(text, x, y);
    
    // 重置文本对齐
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'top';
  }

  /**
   * 获取骨骼连接定义
   */
  private getSkeletonConnections(): [string, string][] {
    return [
      // 头部
      ['left_ear', 'left_eye'],
      ['right_ear', 'right_eye'],
      ['left_eye', 'nose'],
      ['right_eye', 'nose'],
      
      // 躯干
      ['left_shoulder', 'right_shoulder'],
      ['left_shoulder', 'left_hip'],
      ['right_shoulder', 'right_hip'],
      ['left_hip', 'right_hip'],
      
      // 左臂
      ['left_shoulder', 'left_elbow'],
      ['left_elbow', 'left_wrist'],
      
      // 右臂
      ['right_shoulder', 'right_elbow'],
      ['right_elbow', 'right_wrist'],
      
      // 左腿
      ['left_hip', 'left_knee'],
      ['left_knee', 'left_ankle'],
      
      // 右腿
      ['right_hip', 'right_knee'],
      ['right_knee', 'right_ankle']
    ];
  }

  /**
   * 查找关键点
   */
  private findKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
    return keypoints.find(kp => kp.name === name) || null;
  }

  /**
   * 十六进制颜色转RGBA
   */
  private hexToRgba(hex: string, alpha: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  /**
   * 渲染视频帧背景
   */
  private renderVideoFrame(imageData: ImageData): void {
    if (!this.canvas || !this.ctx) return;

    try {
      // 调整canvas尺寸以匹配视频帧
      if (this.canvas.width !== imageData.width || this.canvas.height !== imageData.height) {
        this.canvas.width = imageData.width;
        this.canvas.height = imageData.height;
        this.setupCanvas();
      }

      // 绘制视频帧
      this.ctx.putImageData(imageData, 0, 0);
    } catch (error) {
      console.warn('绘制视频帧失败:', error);
      // 如果绘制失败，至少绘制一个背景色
      this.ctx.fillStyle = this.defaultConfig.colors?.background || '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }


}

/**
 * WebGL渲染引擎实现（高性能版本）
 */
export class WebGLRenderEngine implements RenderEngine {
  private canvas: HTMLCanvasElement | null = null;
  private gl: WebGLRenderingContext | null = null;
  private config: RenderConfig;
  private _isInitialized = false;

  constructor() {
    this.config = {
      showKeypoints: true,
      showSkeleton: true,
      showBoundingBox: false,
      showConfidence: true,
      showAnalysis: true,
      showPerformance: false,
      keypointRadius: 4,
      skeletonLineWidth: 2,
      confidenceThreshold: 0.3,
      colors: {
        keypoint: '#00ff00',
        skeleton: '#ff0000',
        confidence: '#FFE66D',
        boundingBox: '#0000ff',
        text: '#ffffff',
        background: 'rgba(0, 0, 0, 0.1)'
      },
      fontSize: 14,
      fontFamily: 'Arial, sans-serif'
    };
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  initialize(config: RenderEngineConfig): void {
    this.canvas = config.canvas;
    this.gl = this.canvas.getContext('webgl');
    
    if (!this.gl) {
      throw new Error('WebGL不受支持，回退到Canvas渲染');
    }

    // 更新配置
    if (config) {
      this.config = { 
        ...this.config, 
        showKeypoints: config.showKeypoints ?? this.config.showKeypoints,
        showSkeleton: config.showSkeleton ?? this.config.showSkeleton,
        showBoundingBox: config.showBoundingBox ?? this.config.showBoundingBox ?? false,
        showConfidence: config.showConfidence ?? this.config.showConfidence,
        showAnalysis: config.showAnalysis ?? this.config.showAnalysis ?? false,
        showPerformance: config.showPerformance ?? this.config.showPerformance ?? false
      };
    }

    this.setupWebGL();
    this._isInitialized = true;
    eventBus.emit('render:initialized');
  }

  render(_data: ExtendedRenderData): void {
    // WebGL渲染实现
    // 这里可以实现高性能的WebGL渲染逻辑
    console.log('WebGL渲染暂未实现，请使用Canvas渲染引擎');
  }

  /**
   * 渲染数据（兼容性方法）
   */
  renderPoseResult(poseResult: PoseEstimationResult, analysisResult?: AnalysisResult): void {
    const renderData: RenderData = {
      frame: {
        imageData: new ImageData(this.canvas?.width || 640, this.canvas?.height || 480),
        width: this.canvas?.width || 640,
        height: this.canvas?.height || 480,
        timestamp: Date.now()
      },
      poses: poseResult.poses,
      ...(analysisResult && { analysis: analysisResult }),
      config: {
        showKeypoints: this.config.showKeypoints,
        showSkeleton: this.config.showSkeleton,
        showConfidence: this.config.showConfidence,
        showBoundingBox: this.config.showBoundingBox,
        showAnalysis: this.config.showAnalysis,
        showPerformance: this.config.showPerformance,
        keypointRadius: this.config.keypointRadius,
        skeletonLineWidth: this.config.skeletonLineWidth,
        colors: this.config.colors
      }
    };
    
    this.render(renderData);
  }

  updateConfig(config: Partial<RenderEngineConfig>): void {
    // 更新内部配置
    this.config = { 
      ...this.config, 
      showKeypoints: config.showKeypoints ?? this.config.showKeypoints,
      showSkeleton: config.showSkeleton ?? this.config.showSkeleton,
      showBoundingBox: config.showBoundingBox ?? this.config.showBoundingBox ?? false,
      showConfidence: config.showConfidence ?? this.config.showConfidence,
      showAnalysis: config.showAnalysis ?? this.config.showAnalysis ?? false,
      showPerformance: config.showPerformance ?? this.config.showPerformance ?? false
    };
  }

  clear(): void {
    if (!this.gl) return;
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  resize(width: number, height: number): void {
    if (!this.canvas || !this.gl) return;
    
    this.canvas.width = width;
    this.canvas.height = height;
    this.gl.viewport(0, 0, width, height);
  }

  dispose(): void {
    this.canvas = null;
    this.gl = null;
    this._isInitialized = false;
    eventBus.emit('render:disposed');
  }

  private setupWebGL(): void {
    if (!this.gl) return;
    
    this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
    this.gl.enable(this.gl.BLEND);
    this.gl.blendFunc(this.gl.SRC_ALPHA, this.gl.ONE_MINUS_SRC_ALPHA);
  }
}

/**
 * 渲染引擎工厂
 */
export class RenderEngineFactory {
  static create(type: 'canvas' | 'webgl' = 'canvas'): RenderEngine {
    switch (type) {
      case 'canvas':
        return new CanvasRenderEngine();
      case 'webgl':
        return new WebGLRenderEngine();
      default:
        throw new Error(`不支持的渲染引擎类型: ${type}`);
    }
  }
}