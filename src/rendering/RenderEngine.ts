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

  // 性能优化相关
  private offscreenCanvas: OffscreenCanvas | null = null;
  private offscreenCtx: OffscreenCanvasRenderingContext2D | null = null;
  private lastRenderTime: number = 0;
  private renderThrottle: number = 16; // 约60fps
  private imageCache: Map<string, ImageBitmap> = new Map();

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

    // 初始化离屏Canvas用于双缓冲
    try {
      this.offscreenCanvas = new OffscreenCanvas(this.canvas.width, this.canvas.height);
      this.offscreenCtx = this.offscreenCanvas.getContext('2d');
      console.log('✅ 离屏Canvas初始化成功，启用双缓冲渲染');
    } catch (error) {
      console.warn('⚠️ 离屏Canvas不支持，使用单缓冲渲染:', error);
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

    this.setupCanvasContext(this.ctx);
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

    // 帧率控制
    const now = performance.now();
    if (now - this.lastRenderTime < this.renderThrottle) {
      return;
    }
    this.lastRenderTime = now;

    try {
      // 如果有设置的渲染器，使用渲染器
      if (this.renderer) {
        this.renderer.render(data);
        return;
      }

      // 选择渲染上下文（双缓冲或单缓冲）
      const renderCtx = this.offscreenCtx || this.ctx;
      const renderCanvas = this.offscreenCanvas || this.canvas;

      if (!renderCtx) return;

      // 保存当前上下文状态
      renderCtx.save();

      // 清空画布
      this.clearCanvas(renderCtx, renderCanvas);

      // 渲染视频帧背景
      if (data.frame && data.frame.imageData) {
        this.renderVideoFrameOptimized(data.frame.imageData, renderCtx, renderCanvas);
      }

      // 渲染姿态数据
      if (data.poses.length > 0) {
        this.renderPosesOptimized(data.poses, renderCtx);
      } else {
        this.renderNoDetection(renderCtx);
      }

      // 渲染分析结果
      if (data.analysis) {
        this.renderAnalysisOptimized(data.analysis, renderCtx, renderCanvas);
      }

      // 渲染性能信息
      if (data.performance && this.defaultConfig.showPerformance) {
        this.renderPerformanceOptimized(data.performance, renderCtx, renderCanvas);
      }

      // 恢复上下文状态
      renderCtx.restore();

      // 如果使用双缓冲，将离屏Canvas绘制到主Canvas
      if (this.offscreenCanvas && this.offscreenCtx) {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
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
    
    // 同时调整离屏Canvas尺寸
    if (this.offscreenCanvas) {
      this.offscreenCanvas.width = width;
      this.offscreenCanvas.height = height;
      if (this.offscreenCtx) {
        this.setupCanvasContext(this.offscreenCtx);
      }
    }
    
    if (this.ctx) {
      this.setupCanvasContext(this.ctx);
    }
    
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
    
    // 清理图像缓存
    this.imageCache.forEach(bitmap => {
      if (bitmap.close) {
        bitmap.close();
      }
    });
    this.imageCache.clear();
    
    // 清理离屏Canvas
    this.offscreenCanvas = null;
    this.offscreenCtx = null;
    
    this.canvas = null;
    this.ctx = null;
    this._isInitialized = false;
    eventBus.emit('render:disposed');
  }

  /**
   * 优化的清空画布方法
   */
  private clearCanvas(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, canvas: HTMLCanvasElement | OffscreenCanvas): void {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制背景
    if (this.defaultConfig.colors?.background) {
      ctx.fillStyle = this.defaultConfig.colors.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * 优化的视频帧渲染
   */
  private renderVideoFrameOptimized(imageData: ImageData, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, canvas: HTMLCanvasElement | OffscreenCanvas): void {
    try {
      // 调整canvas尺寸以匹配视频帧（仅在必要时）
      if (canvas.width !== imageData.width || canvas.height !== imageData.height) {
        canvas.width = imageData.width;
        canvas.height = imageData.height;
        this.setupCanvasContext(ctx);
        
        // 如果是离屏Canvas，也需要更新主Canvas尺寸
        if (this.offscreenCanvas && this.canvas) {
          this.canvas.width = imageData.width;
          this.canvas.height = imageData.height;
        }
      }

      // 直接绘制ImageData（最快的方式）
      ctx.putImageData(imageData, 0, 0);
      
    } catch (error) {
      console.warn('绘制视频帧失败:', error);
      // 如果绘制失败，至少绘制一个背景色
      ctx.fillStyle = this.defaultConfig.colors?.background || '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  /**
   * 优化的姿态渲染
   */
  private renderPosesOptimized(poses: Pose[], ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    // 批量设置样式以减少状态切换
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    poses.forEach((pose, index) => {
      // 渲染骨骼（先渲染，避免被关键点覆盖）
      if (this.defaultConfig.showSkeleton) {
        this.renderSkeletonOptimized(pose.keypoints, ctx);
      }

      // 渲染关键点
      if (this.defaultConfig.showKeypoints) {
        this.renderKeypointsOptimized(pose.keypoints, ctx);
      }

      // 渲染边界框
      if (this.defaultConfig.showBoundingBox && pose.box) {
        this.renderBoundingBoxOptimized(pose.box, ctx);
      }

      // 渲染置信度
      if (this.defaultConfig.showConfidence) {
        this.renderConfidenceOptimized(pose.score || 0, index, ctx);
      }
    });
  }

  /**
   * 优化的骨骼渲染
   */
  private renderSkeletonOptimized(keypoints: Keypoint[], ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const connections = this.getSkeletonConnections();
    
    // 批量开始路径
    ctx.beginPath();
    ctx.strokeStyle = this.defaultConfig.colors.skeleton;
    ctx.lineWidth = this.defaultConfig.skeletonLineWidth;

    for (const [startName, endName] of connections) {
      const startPoint = this.findKeypoint(keypoints, startName);
      const endPoint = this.findKeypoint(keypoints, endName);

      if (startPoint && endPoint && 
          startPoint.score > (this.defaultConfig.confidenceThreshold || 0.3) && 
          endPoint.score > (this.defaultConfig.confidenceThreshold || 0.3)) {
        
        ctx.moveTo(startPoint.x, startPoint.y);
        ctx.lineTo(endPoint.x, endPoint.y);
      }
    }
    
    // 批量绘制所有线条
    ctx.stroke();
  }

  /**
   * 优化的关键点渲染
   */
  private renderKeypointsOptimized(keypoints: Keypoint[], ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    // 按置信度分组关键点以减少样式切换
    const validKeypoints = keypoints.filter(kp => kp.score > (this.defaultConfig.confidenceThreshold || 0.3));
    
    if (validKeypoints.length === 0) return;

    // 批量绘制关键点
    ctx.beginPath();
    for (const keypoint of validKeypoints) {
      ctx.moveTo(keypoint.x + this.defaultConfig.keypointRadius, keypoint.y);
      ctx.arc(keypoint.x, keypoint.y, this.defaultConfig.keypointRadius, 0, 2 * Math.PI);
    }
    
    // 根据置信度设置颜色
    const avgConfidence = validKeypoints.reduce((sum, kp) => sum + kp.score, 0) / validKeypoints.length;
    const alpha = Math.min(1, avgConfidence * 1.5);
    ctx.fillStyle = this.hexToRgba(this.defaultConfig.colors.keypoint, alpha);
    ctx.fill();

    // 可选：渲染关键点标签（仅在需要时）
    if (this.defaultConfig.showConfidence && validKeypoints.length <= 5) { // 限制标签数量
      ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
      ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;
      
      for (const keypoint of validKeypoints) {
        ctx.fillText(
          `${(keypoint.score * 100).toFixed(0)}%`,
          keypoint.x + this.defaultConfig.keypointRadius + 2,
          keypoint.y - this.defaultConfig.keypointRadius
        );
      }
    }
  }

  /**
   * 优化的边界框渲染
   */
  private renderBoundingBoxOptimized(box: BoundingBox, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.strokeStyle = this.defaultConfig.colors.boundingBox || '#95E1D3';
    ctx.lineWidth = 2;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  /**
   * 优化的置信度渲染
   */
  private renderConfidenceOptimized(score: number, index: number, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;
    ctx.fillText(
      `姿态 ${index + 1}: ${(score * 100).toFixed(1)}%`,
      10,
      10 + index * 20
    );
  }

  /**
   * 优化的分析结果渲染
   */
  private renderAnalysisOptimized(analysisResult: AnalysisResult, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, _canvas: HTMLCanvasElement | OffscreenCanvas): void {
    const x = 10;
    let y = 40;
    const lineHeight = (this.defaultConfig.fontSize || 12) + 4;

    ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;

    // 批量准备文本内容
    const textLines: string[] = [];
    
    textLines.push(`分析时间: ${new Date(analysisResult.timestamp).toLocaleTimeString()}`);

    if (analysisResult.repetition) {
      textLines.push(`重复次数: ${analysisResult.repetition.count}`);
      textLines.push(`当前阶段: ${analysisResult.repetition.phase}`);
      textLines.push(`置信度: ${(analysisResult.repetition.confidence * 100).toFixed(1)}%`);
    }

    if (analysisResult.posture) {
      textLines.push(''); // 空行
      textLines.push('姿态评估:');
      textLines.push(`  评分: ${analysisResult.posture.score.toFixed(1)}`);
      
      if (analysisResult.posture.issues.length > 0) {
        textLines.push('  问题:');
        for (const issue of analysisResult.posture.issues.slice(0, 3)) {
          textLines.push(`    • ${issue}`);
        }
      }
    }

    if (analysisResult.runningGait) {
      textLines.push(''); // 空行
      textLines.push('跑姿分析:');
      textLines.push(`  步频: ${analysisResult.runningGait.cadence.toFixed(1)} spm`);
      textLines.push(`  步长: ${analysisResult.runningGait.strideLength.toFixed(2)} m`);
      textLines.push(`  触地时间: ${analysisResult.runningGait.groundContactTime.toFixed(0)} ms`);
    }

    // 批量绘制文本
    for (const line of textLines) {
      if (line === '') {
        y += lineHeight / 2; // 空行
      } else {
        ctx.fillText(line, x, y);
        y += lineHeight;
      }
    }
  }

  /**
   * 优化的性能信息渲染
   */
  private renderPerformanceOptimized(performance: PerformanceMetrics, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D, canvas: HTMLCanvasElement | OffscreenCanvas): void {
    const x = canvas.width - 200;
    let y = 20;
    const lineHeight = 20;

    ctx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;

    // 批量准备性能文本
    const perfLines = [
      '性能指标:',
      `  帧率: ${performance.frameRate.toFixed(1)} FPS`,
      `  推理时间: ${performance.inferenceTime.toFixed(1)} ms`,
      `  平均帧时间: ${performance.averageFrameTime.toFixed(1)} ms`
    ];

    if (performance.memoryUsage) {
      perfLines.push(`  内存使用: ${(performance.memoryUsage.used / 1024 / 1024).toFixed(1)} MB`);
    }

    if (performance.tensorflowMemory) {
      perfLines.push(`  TF内存: ${performance.tensorflowMemory.numTensors} 张量`);
    }

    // 批量绘制性能文本
    for (const line of perfLines) {
      ctx.fillText(line, x, y);
      y += lineHeight;
    }
  }

  /**
   * 设置Canvas上下文样式
   */
  private setupCanvasContext(ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.font = `${this.defaultConfig.fontSize}px ${this.defaultConfig.fontFamily}`;
  }

  /**
   * 渲染无检测状态
   */
  private renderNoDetection(ctx?: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): void {
    const renderCtx = ctx || this.ctx;
    if (!renderCtx || !this.canvas) return;

    renderCtx.fillStyle = this.defaultConfig.colors.text || '#FFFFFF';
    renderCtx.font = `${(this.defaultConfig.fontSize || 14) + 2}px ${this.defaultConfig.fontFamily}`;
    renderCtx.fillText('未检测到姿态', this.canvas.width / 2 - 60, this.canvas.height / 2);
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