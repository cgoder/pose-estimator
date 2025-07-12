/**
 * AI推理引擎模块
 * 负责TensorFlow.js模型的加载、推理和结果处理
 */

import { eventBus } from '../core/EventBus.js';
import { dynamicDependencyLoader } from '../utils/DynamicDependencyLoader.js';
import { 
  InferenceEngine,
  InferenceEngineConfig,
  InferenceResult,
  ModelType
} from '../types/index.js';

/**
 * TensorFlow.js推理引擎实现
 */
export class TensorFlowInferenceEngine implements InferenceEngine {
  private model: any = null;
  private _modelType: ModelType | null = null;
  private config: InferenceEngineConfig | null = null;
  private _isInitialized = false;

  constructor(workerManager?: any) {
    // workerManager可能在未来使用
    if (workerManager) {
      console.log('Worker manager provided but not yet implemented');
    }
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get modelType(): ModelType | null {
    return this._modelType;
  }

  /**
   * 初始化推理引擎
   */
  async initialize(config: InferenceEngineConfig): Promise<void> {
    try {
      eventBus.emit('inference:loading', { modelType: config.modelType });
      
      this.config = config;
      this._modelType = config.modelType;

      // 首先确保 TensorFlow.js 依赖已加载
      console.log('🔄 检查 TensorFlow.js 依赖...');
      if (!dynamicDependencyLoader.isDependenciesLoaded()) {
        console.log('📦 动态加载 TensorFlow.js 依赖...');
        await dynamicDependencyLoader.loadDependencies({
          timeout: 30000,
          retryCount: 2,
          retryDelay: 1000
        });
      } else {
        console.log('✅ TensorFlow.js 依赖已可用');
      }

      // 根据模型类型加载对应的模型
      switch (config.modelType) {
        case 'MoveNet':
          this.model = await this.loadMoveNetModel();
          break;
        case 'PoseNet':
          this.model = await this.loadPoseNetModel();
          break;
        case 'BlazePose':
          this.model = await this.loadBlazePoseModel();
          break;
        default:
          throw new Error(`不支持的模型类型: ${config.modelType}`);
      }

      this._isInitialized = true;
      eventBus.emit('inference:loaded', { 
        modelType: config.modelType, 
        modelInfo: this.getModelInfo() 
      });

    } catch (error) {
      this._isInitialized = false;
      eventBus.emit('inference:error', { 
        error: error instanceof Error ? error.message : '模型加载失败',
        modelType: config.modelType 
      });
      throw error;
    }
  }

  /**
   * 执行姿态估计推理
   */
  async predict(imageData: ImageData): Promise<InferenceResult> {
    if (!this.isInitialized) {
      throw new Error('推理引擎尚未初始化');
    }

    try {
      const startTime = performance.now();
      
      // 预处理输入数据
      const processedInput = await this.preprocessInput(imageData);
      
      // 执行推理
      let poses: any[];
      switch (this._modelType) {
        case 'MoveNet':
          poses = await this.predictMoveNet(processedInput);
          break;
        case 'PoseNet':
          poses = await this.predictPoseNet(processedInput);
          break;
        case 'BlazePose':
          poses = await this.predictBlazePose(processedInput);
          break;
        default:
          throw new Error(`不支持的模型类型: ${this._modelType}`);
      }

      const inferenceTime = performance.now() - startTime;

      // 后处理结果
      const result: InferenceResult = {
        poses: this.postprocessPoses(poses),
        inferenceTime,
        modelType: this._modelType!,
        timestamp: Date.now(),
        inputDimensions: {
          width: imageData.width,
          height: imageData.height
        }
      };

      eventBus.emit('inference:result', result);
      return result;

    } catch (error) {
      eventBus.emit('inference:error', { 
        error: error instanceof Error ? error.message : '推理失败' 
      });
      throw error;
    }
  }

  /**
   * 加载MoveNet模型
   */
  private async loadMoveNetModel(): Promise<any> {
    // 使用poseDetection库加载MoveNet
    const detectorConfig = {
      modelType: (window as any).poseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
      ...this.config
    };
    
    return await (window as any).poseDetection.createDetector(
      (window as any).poseDetection.SupportedModels.MoveNet,
      detectorConfig
    );
  }

  /**
   * 加载PoseNet模型
   */
  private async loadPoseNetModel(): Promise<any> {
    const detectorConfig = {
      architecture: 'MobileNetV1',
      outputStride: 16,
      inputResolution: { width: 640, height: 480 },
      multiplier: 0.75,
      ...this.config
    };
    
    return await (window as any).poseDetection.createDetector(
      (window as any).poseDetection.SupportedModels.PoseNet,
      detectorConfig
    );
  }

  /**
   * 加载BlazePose模型
   */
  private async loadBlazePoseModel(): Promise<any> {
    const detectorConfig = {
      runtime: 'tfjs',
      enableSmoothing: true,
      modelType: 'full',
      ...this.config
    };
    
    return await (window as any).poseDetection.createDetector(
      (window as any).poseDetection.SupportedModels.BlazePose,
      detectorConfig
    );
  }

  /**
   * MoveNet推理
   */
  private async predictMoveNet(input: any): Promise<any[]> {
    return await this.model.estimatePoses(input);
  }

  /**
   * PoseNet推理
   */
  private async predictPoseNet(input: any): Promise<any[]> {
    return await this.model.estimatePoses(input);
  }

  /**
   * BlazePose推理
   */
  private async predictBlazePose(input: any): Promise<any[]> {
    return await this.model.estimatePoses(input);
  }

  /**
   * 预处理输入数据
   */
  private async preprocessInput(input: ImageData | HTMLVideoElement | HTMLImageElement): Promise<any> {
    // 根据输入类型进行预处理
    if (input instanceof ImageData) {
      // 将ImageData转换为Canvas
      const canvas = document.createElement('canvas');
      canvas.width = input.width;
      canvas.height = input.height;
      const ctx = canvas.getContext('2d')!;
      ctx.putImageData(input, 0, 0);
      return canvas;
    }
    
    return input; // HTMLVideoElement和HTMLImageElement可以直接使用
  }

  /**
   * 后处理姿态结果
   */
  private postprocessPoses(poses: any[]): any[] {
    return poses.map(pose => ({
      ...pose,
      // 添加置信度过滤
      keypoints: pose.keypoints?.filter((kp: any) => kp.score > 0.3) || [],
      // 标准化坐标
      normalizedKeypoints: this.normalizeKeypoints(pose.keypoints || [])
    }));
  }

  /**
   * 标准化关键点坐标
   */
  private normalizeKeypoints(keypoints: any[]): any[] {
    return keypoints.map(kp => ({
      ...kp,
      x: Math.max(0, Math.min(1, kp.x)),
      y: Math.max(0, Math.min(1, kp.y))
    }));
  }

  /**
   * 获取模型信息
   */
  getModelInfo(): { name: string; version: string; backend: string } | null {
    if (!this.isInitialized) {
      return null;
    }

    return {
      name: this._modelType as string || 'Unknown',
      version: '1.0.0', // 可以从模型中获取实际版本
      backend: (window as any).tf?.getBackend() || 'unknown'
    };
  }

  /**
   * 释放模型资源
   */
  dispose(): void {
    if (this.model && typeof this.model.dispose === 'function') {
      this.model.dispose();
    }
    
    this.model = null;
    this._modelType = null;
    this.config = null;
    this._isInitialized = false;
    
    eventBus.emit('inference:disposed');
  }
}

/**
 * 推理引擎工厂
 */
export class InferenceEngineFactory {
  static create(type: 'tensorflow' = 'tensorflow'): InferenceEngine {
    switch (type) {
      case 'tensorflow':
        return new TensorFlowInferenceEngine();
      default:
        throw new Error(`不支持的推理引擎类型: ${type}`);
    }
  }
}