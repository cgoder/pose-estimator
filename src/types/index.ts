/**
 * 核心类型定义
 * 为整个应用提供 TypeScript 类型支持
 */

// ==================== 基础数据类型 ====================

/**
 * 2D 坐标点
 */
export interface Point2D {
  x: number;
  y: number;
}

/**
 * 3D 坐标点
 */
export interface Point3D extends Point2D {
  z: number;
}

/**
 * 姿态关键点
 */
export interface Keypoint {
  name: string;
  x: number;
  y: number;
  score: number;
}

/**
 * 边界框
 */
export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * 姿态检测结果
 */
export interface PoseResult {
  keypoints: Keypoint[];
  score: number;
  timestamp: number;
  box?: BoundingBox;
}

/**
 * 姿态估计结果（包含多个姿态）
 */
export interface PoseEstimationResult {
  poses: PoseResult[];
  timestamp: number;
}

/**
 * 单个姿态（兼容性别名）
 */
export interface Pose extends PoseResult {}

/**
 * 处理后的图像帧
 */
export interface ProcessedFrame {
  imageData: ImageData;
  width: number;
  height: number;
  timestamp: number;
}

// ==================== 数据源接口 ====================

/**
 * 数据源事件类型
 */
export type DataSourceEvent = 'frame' | 'error' | 'end' | 'ready';

/**
 * 数据源状态
 */
export type DataSourceStatus = 'idle' | 'loading' | 'ready' | 'running' | 'error' | 'ended';

/**
 * 数据源配置
 */
export interface DataSourceConfig {
  width?: number;
  height?: number;
  fps?: number;
  autoStart?: boolean;
}

/**
 * 数据源抽象接口
 */
export interface DataSource {
  readonly type: string;
  readonly status: DataSourceStatus;
  
  start(): Promise<void>;
  stop(): void;
  getFrame(): ImageData | null;
  getConfig(): DataSourceConfig;
  
  on(event: DataSourceEvent, callback: Function): void;
  off(event: DataSourceEvent, callback: Function): void;
  emit(event: DataSourceEvent, ...args: any[]): void;
}

// ==================== AI 推理接口 ====================

/**
 * 支持的模型类型
 */
export type ModelType = 'MoveNet' | 'PoseNet' | 'BlazePose';

/**
 * 模型配置
 */
export interface ModelConfig {
  type: ModelType;
  variant?: string;
  modelUrl?: string;
  inputResolution?: { width: number; height: number };
  scoreThreshold?: number;
}

/**
 * 推理引擎接口
 */
export interface PoseInference {
  readonly modelType: ModelType;
  readonly isLoaded: boolean;
  
  loadModel(config: ModelConfig): Promise<void>;
  detect(frame: ProcessedFrame): Promise<PoseResult>;
  dispose(): void;
}

// ==================== 分析引擎接口 ====================

/**
 * 运动学参数
 */
export interface KinematicsData {
  angles: { [joint: string]: number };
  velocities: { [joint: string]: number };
  accelerations: { [joint: string]: number };
}

/**
 * 重复次数统计结果
 */
export interface RepetitionResult {
  count: number;
  phase: 'up' | 'down' | 'hold';
  confidence: number;
}

/**
 * 姿态质量评估结果
 */
export interface PostureEvaluation {
  score: number;
  issues: string[];
  suggestions: string[];
}

/**
 * 跑姿分析结果
 */
export interface RunningGaitAnalysis {
  cadence: number;
  strideLength: number;
  groundContactTime: number;
  verticalOscillation: number;
  footStrike: 'forefoot' | 'midfoot' | 'heel';
}

/**
 * 综合分析结果
 */
export interface AnalysisResult {
  timestamp: number;
  exerciseType?: ExerciseType;
  repetitionCount?: number;
  currentPhase?: 'up' | 'down' | 'neutral' | 'hold';
  formFeedback?: string[];
  confidence?: number;
  movementMetrics?: Partial<MovementMetrics>;
  kinematics?: KinematicsData;
  repetition?: RepetitionResult;
  posture?: PostureEvaluation;
  runningGait?: RunningGaitAnalysis;
}

/**
 * 分析器接口
 */
export interface Analyzer {
  readonly type: string;
  analyze(poses: PoseResult[]): AnalysisResult | null;
  reset(): void;
}

/**
 * 分析引擎接口
 */
export interface AnalysisEngine {
  readonly isInitialized: boolean;
  
  initialize(config: any): void;
  addAnalyzer(analyzer: Analyzer): void;
  removeAnalyzer(type: string): void;
  analyze(poses: PoseResult[]): AnalysisResult;
  setExercise(config: { type: string; parameters: Record<string, any> }): void;
  reset(): void;
  dispose(): void;
}

// ==================== 渲染系统接口 ====================

/**
 * 渲染配置
 */
export interface RenderConfig {
  showKeypoints: boolean;
  showSkeleton: boolean;
  showConfidence: boolean;
  showBoundingBox: boolean;
  showAnalysis: boolean;
  showPerformance: boolean;
  keypointRadius: number;
  skeletonLineWidth: number;
  confidenceThreshold?: number;
  fontSize?: number;
  fontFamily?: string;
  colors: {
    keypoint: string;
    skeleton: string;
    confidence: string;
    boundingBox?: string;
    text?: string;
    background?: string;
  };
}

/**
 * 渲染数据
 */
export interface RenderData {
  frame: ProcessedFrame;
  poses: PoseResult[];
  analysis?: AnalysisResult;
  config: RenderConfig;
}

/**
 * 渲染器接口
 */
export interface Renderer {
  readonly type: string;
  render(data: RenderData): void;
  clear(): void;
  resize(width: number, height: number): void;
}

/**
 * 渲染引擎接口
 */
// ==================== 渲染引擎接口 ====================

/**
 * 渲染引擎配置
 */
export interface RenderEngineConfig {
  canvas: HTMLCanvasElement;
  renderer?: 'canvas' | 'webgl';
  showKeypoints?: boolean;
  showSkeleton?: boolean;
  showBoundingBox?: boolean;
  showConfidence?: boolean;
  showAnalysis?: boolean;
  showPerformance?: boolean;
}

/**
 * 渲染数据扩展
 */
export interface ExtendedRenderData extends RenderData {
  performance?: PerformanceMetrics;
  ui?: {
    showControls: boolean;
    showStats: boolean;
    error?: string;
  };
}

/**
 * 渲染引擎接口
 */
export interface RenderEngine {
  readonly isInitialized: boolean;
  
  initialize(config: RenderEngineConfig): void;
  render(data: ExtendedRenderData): void;
  updateConfig(config: Partial<RenderEngineConfig>): void;
  clear(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

// ==================== 状态管理接口 ====================

/**
 * 应用状态
 */
export interface AppState {
  // 数据源状态
  dataSource: {
    type: string | null;
    status: DataSourceStatus;
    config: DataSourceConfig | null;
  };
  
  // AI 模型状态
  model: {
    type: ModelType | null;
    isLoaded: boolean;
    loadingProgress: number;
    config: ModelConfig | null;
  };
  
  // 分析状态
  analysis: {
    isRunning: boolean;
    currentPose: Keypoint[] | null;
    repetitionCount: number;
    currentExercise: string | null;
    quality: {
      score: number;
      feedback: string[];
    };
  };
  
  // 渲染状态
  render: {
    showKeypoints: boolean;
    showSkeleton: boolean;
    showBoundingBox: boolean;
  };
  
  // 性能状态
  performance: {
    inferenceTime: number;
    totalTime: number;
    memoryUsage: number;
    frameRate: number;
  };
  
  // UI 状态
  ui: {
    showControls: boolean;
    showStats: boolean;
    showPerformance: boolean;
    isLoading: boolean;
    error: string | null;
  };
  
  // 索引签名，支持动态属性访问
  [key: string]: any;
}

/**
 * 状态变更回调
 */
export type StateChangeCallback = (state: AppState, prevState: AppState) => void;

/**
 * 状态管理器接口
 */
export interface StateManager {
  getState(): AppState;
  setState(state: Partial<AppState>): void;
  subscribe(callback: StateChangeCallback): () => void;
  reset(): void;
}

// ==================== 事件系统接口 ====================

/**
 * 事件回调函数
 */
export type EventCallback = (...args: any[]) => void;

/**
 * 事件总线接口
 */
export interface EventBus {
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
  emit(event: string, ...args: any[]): void;
  once(event: string, callback: EventCallback): void;
  clear(): void;
}

// ==================== 性能监控接口 ====================

/**
 * 性能指标
 */
export interface PerformanceMetrics {
  frameRate: number;
  averageFrameTime: number;
  inferenceTime: number;
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  };
  tensorflowMemory?: {
    numTensors: number;
    numDataBuffers: number;
    numBytes: number;
  };
  cacheHitRate: number;
  totalFrames: number;
  droppedFrames: number;
}

/**
 * 性能监控器接口
 */
export interface PerformanceMonitor {
  start(): void;
  stop(): void;
  frameStart(): number;
  frameEnd(startTime: number): void;
  getMetrics(): PerformanceMetrics;
  reset(): void;
}

// ==================== 工厂接口 ====================

/**
 * 数据源工厂接口
 */
export interface DataSourceFactory {
  createCameraSource(config?: DataSourceConfig): DataSource;
  createVideoFileSource(file: File, config?: DataSourceConfig): DataSource;
  createImageFileSource(files: File[], config?: DataSourceConfig): DataSource;
  createStreamSource(url: string, config?: DataSourceConfig): DataSource;
}

/**
 * 推理引擎工厂接口
 */
export interface InferenceFactory {
  createInference(modelType: ModelType): PoseInference;
}

/**
 * 分析器工厂接口
 */
export interface AnalyzerFactory {
  createKinematicsAnalyzer(): Analyzer;
  createRepetitionCounter(): Analyzer;
  createPostureEvaluator(): Analyzer;
  createRunningGaitAnalyzer(): Analyzer;
}

/**
 * 渲染器工厂接口
 */
export interface RendererFactory {
  createCanvasRenderer(canvas: HTMLCanvasElement): Renderer;
  createWebGLRenderer(canvas: HTMLCanvasElement): Renderer;
  createOffscreenRenderer(canvas: OffscreenCanvas): Renderer;
}

// ==================== 推理引擎接口 ====================

/**
 * 推理引擎配置
 */
export interface InferenceEngineConfig {
  type: ModelType;
  modelType: ModelType;
  backend?: 'webgl' | 'cpu' | 'wasm';
  enableWorker?: boolean;
  scoreThreshold?: number;
  maxPoses?: number;
}

/**
 * 推理结果
 */
export interface InferenceResult {
  poses: PoseResult[];
  inferenceTime: number;
  modelType: ModelType;
  timestamp: number;
  inputDimensions: {
    width: number;
    height: number;
  };
}

/**
 * 推理引擎接口
 */
export interface InferenceEngine {
  readonly isInitialized: boolean;
  readonly modelType: ModelType | null;
  
  initialize(config: InferenceEngineConfig): Promise<void>;
  predict(imageData: ImageData): Promise<InferenceResult>;
  dispose(): void;
}

// ==================== 分析引擎接口扩展 ====================

/**
 * 运动类型
 */
export type ExerciseType = 'squat' | 'pushup' | 'plank' | 'running' | 'general' | 'custom';

/**
 * 运动指标
 */
export interface MovementMetrics {
  velocity: number;
  stability: number;
  symmetry: number;
  averageConfidence: number;
  totalFrames: number;
  validFrames: number;
}

/**
 * 运动配置
 */
export interface ExerciseConfig {
  type: ExerciseType;
  parameters: Record<string, any>;
}

/**
 * 分析引擎配置
 */
export interface AnalysisEngineConfig {
  exerciseType?: ExerciseType;
  exercises: ExerciseConfig[];
  enableKinematics: boolean;
  enableRepetitionCounting: boolean;
  enablePostureEvaluation: boolean;
  enableRunningGait: boolean;
}

/**
 * 扩展的分析引擎接口
 */
export interface AnalysisEngine {
  readonly isInitialized: boolean;
  
  initialize(config: AnalysisEngineConfig): void;
  analyze(poses: PoseResult[]): AnalysisResult;
  setExercise(exercise: ExerciseConfig): void;
  reset(): void;
  dispose(): void;
}

// ==================== 渲染引擎接口 ====================

/**
 * 渲染引擎配置
 */
export interface RenderEngineConfig {
  canvas: HTMLCanvasElement;
  renderer?: 'canvas' | 'webgl';
  showKeypoints?: boolean;
  showSkeleton?: boolean;
  showBoundingBox?: boolean;
  showConfidence?: boolean;
  showAnalysis?: boolean;
  showPerformance?: boolean;
}

/**
 * 渲染数据扩展
 */
export interface ExtendedRenderData extends RenderData {
  performance?: PerformanceMetrics;
  ui?: {
    showControls: boolean;
    showStats: boolean;
    error?: string;
  };
}

/**
 * 渲染引擎接口
 */
export interface RenderEngine {
  readonly isInitialized: boolean;
  
  initialize(config: RenderEngineConfig): void;
  render(data: ExtendedRenderData): void;
  updateConfig(config: Partial<RenderEngineConfig>): void;
  clear(): void;
  resize(width: number, height: number): void;
  dispose(): void;
}

// ==================== Web Workers 接口 ====================

/**
 * Worker消息类型
 */
export type WorkerMessageType = 'initialize' | 'loadModel' | 'predict' | 'response' | 'error' | 'event';

/**
 * Worker消息
 */
export interface WorkerMessage {
  id?: string;
  type: WorkerMessageType;
  payload?: any;
  error?: string;
}

/**
 * Worker响应
 */
export interface WorkerResponse {
  id: string;
  type: 'response' | 'error';
  payload?: any;
  error?: string;
}

/**
 * Worker事件
 */
export interface WorkerEvent {
  eventType: string;
  data: any;
}

/**
 * 姿态估计模型类型
 */
export type PoseEstimationModel = 'MoveNet' | 'PoseNet' | 'BlazePose';

/**
 * 姿态估计结果（兼容性类型）
 */
export interface PoseEstimationResult {
  poses: PoseResult[];
  inferenceTime: number;
  timestamp: number;
  modelType: ModelType;
  inputDimensions: {
    width: number;
    height: number;
  };
}

/**
 * Worker管理器接口
 */
export interface WorkerManager {
  readonly isSupported: boolean;
  readonly isInitialized: boolean;
  
  initialize(): Promise<void>;
  loadModel(modelType: ModelType, config?: ModelConfig): Promise<void>;
  predict(imageData: ImageData): Promise<PoseEstimationResult>;
  dispose(): void;
  
  on(event: string, callback: EventCallback): void;
  off(event: string, callback: EventCallback): void;
}

// ==================== 主应用接口扩展 ====================

/**
 * 应用配置
 */
export interface AppConfig {
  dataSource: {
    type: 'camera' | 'video' | 'image' | 'stream';
    config: DataSourceConfig;
  };
  inference: InferenceEngineConfig;
  analysis: AnalysisEngineConfig;
  render: RenderEngineConfig;
  performance: {
    enableMonitoring: boolean;
    targetFPS: number;
  };
  ui: {
    showControls: boolean;
    showStats: boolean;
    showPerformance: boolean;
  };
}

/**
 * 应用事件类型
 */
export type AppEventType = 
  | 'initialized'
  | 'data-source-ready'
  | 'model-loaded'
  | 'inference-complete'
  | 'analysis-complete'
  | 'render-complete'
  | 'error'
  | 'performance-update';

/**
 * 应用事件数据
 */
export interface AppEventData {
  type: AppEventType;
  timestamp: number;
  data?: any;
  error?: Error;
}