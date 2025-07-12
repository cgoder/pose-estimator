/**
 * 分析引擎模块
 * 负责姿态数据的分析、运动学计算和健身动作识别
 */

import { EventBusImpl, eventBus } from '../core/EventBus.js';
import { 
  PoseEstimationResult, 
  AnalysisResult, 
  ExerciseType, 
  MovementMetrics,
  Keypoint,
  AnalysisEngineConfig
} from '../types/index.js';

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
export class FitnessAnalysisEngine implements AnalysisEngine {
  private eventBus: EventBusImpl;
  private currentExercise: ExerciseType = 'general';
  private poseHistory: PoseEstimationResult[] = [];
  private repetitionCount = 0;
  private currentPhase: 'up' | 'down' | 'neutral' = 'neutral';
  private metrics: MovementMetrics = this.initializeMetrics();
  private config: AnalysisEngineConfig | null = null;
  private _isInitialized = false;
  private analyzers: Map<string, any> = new Map();
  private exerciseParameters: Record<string, any> = {};

  constructor(eventBusInstance?: EventBusImpl) {
    this.eventBus = eventBusInstance || eventBus;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  addAnalyzer(analyzer: any): void {
    this.analyzers.set(analyzer.type, analyzer);
  }

  removeAnalyzer(type: string): void {
    this.analyzers.delete(type);
  }

  setExercise(config: { type: string; parameters: Record<string, any> }): void {
    this.currentExercise = config.type as ExerciseType;
    this.exerciseParameters = config.parameters;
    
    // 使用运动参数配置分析器
    if (this.exerciseParameters) {
      this.configureAnalyzersForExercise(config.type as ExerciseType, this.exerciseParameters);
    }
    
    this.reset();
    console.log(`Exercise set to: ${config.type}`, this.exerciseParameters);
  }

  /**
   * 为特定运动配置分析器
   */
  private configureAnalyzersForExercise(exerciseType: ExerciseType, parameters: Record<string, any>): void {
    // 根据运动类型和参数配置分析器
    switch (exerciseType) {
      case 'squat':
        this.configureSquatAnalyzer(parameters);
        break;
      case 'pushup':
        this.configurePushupAnalyzer(parameters);
        break;
      case 'plank':
        this.configurePlankAnalyzer(parameters);
        break;
      case 'running':
        this.configureRunningAnalyzer(parameters);
        break;
      default:
        this.configureGeneralAnalyzer(parameters);
    }
  }

  /**
    * 配置深蹲分析器
    */
   private configureSquatAnalyzer(parameters: Record<string, any>): void {
     const analyzer = {
       type: 'squat',
       minDepthAngle: parameters['minDepthAngle'] || 90,
       maxDepthAngle: parameters['maxDepthAngle'] || 120,
       kneeAlignmentThreshold: parameters['kneeAlignmentThreshold'] || 0.8
     };
     this.analyzers.set('squat', analyzer);
   }
 
   /**
    * 配置俯卧撑分析器
    */
   private configurePushupAnalyzer(parameters: Record<string, any>): void {
     const analyzer = {
       type: 'pushup',
       minArmAngle: parameters['minArmAngle'] || 70,
       bodyAlignmentThreshold: parameters['bodyAlignmentThreshold'] || 15
     };
     this.analyzers.set('pushup', analyzer);
   }
 
   /**
    * 配置平板支撑分析器
    */
   private configurePlankAnalyzer(parameters: Record<string, any>): void {
     const analyzer = {
       type: 'plank',
       alignmentThreshold: parameters['alignmentThreshold'] || 10,
       hipPositionTolerance: parameters['hipPositionTolerance'] || 50
     };
     this.analyzers.set('plank', analyzer);
   }
 
   /**
    * 配置跑步分析器
    */
   private configureRunningAnalyzer(parameters: Record<string, any>): void {
     const analyzer = {
       type: 'running',
       targetCadence: parameters['targetCadence'] || 180,
       cadenceRange: parameters['cadenceRange'] || [160, 200],
       maxLeanAngle: parameters['maxLeanAngle'] || 8
     };
     this.analyzers.set('running', analyzer);
   }
 
   /**
    * 配置通用分析器
    */
   private configureGeneralAnalyzer(parameters: Record<string, any>): void {
     const analyzer = {
       type: 'general',
       confidenceThreshold: parameters['confidenceThreshold'] || 0.5,
       stabilityWindow: parameters['stabilityWindow'] || 5
     };
     this.analyzers.set('general', analyzer);
   }

  /**
   * 初始化分析引擎
   */
  initialize(config: AnalysisEngineConfig): void {
    this.config = config;
    this.currentExercise = this.config.exerciseType || 'general';
    this._isInitialized = true;
    
    // 根据配置启用相应的分析器
    if (this.config.enableKinematics) {
      this.addAnalyzer({ type: 'kinematics' });
    }
    
    if (this.config.enableRepetitionCounting) {
      this.addAnalyzer({ type: 'repetition' });
    }
    
    if (this.config.enablePostureEvaluation) {
      this.addAnalyzer({ type: 'posture' });
    }
    
    if (this.config.enableRunningGait) {
      this.addAnalyzer({ type: 'gait' });
    }
    
    this.reset();
    this.eventBus.emit('analysis:initialized', { config: this.config });
    console.log('Analysis engine initialized with config:', this.config);
  }

  /**
   * 分析姿态数据
   */
  analyze(poses: any[]): AnalysisResult {
    try {
      // 构建PoseEstimationResult
      const poseResult: PoseEstimationResult = {
        poses,
        inferenceTime: 0,
        modelType: 'MoveNet',
        timestamp: Date.now(),
        inputDimensions: {
          width: 640,
          height: 480
        }
      };

      // 更新姿态历史
      this.updatePoseHistory(poseResult);

      // 执行分析
      const analysisResult: AnalysisResult = {
        exerciseType: this.currentExercise,
        repetitionCount: this.repetitionCount,
        currentPhase: this.currentPhase,
        formFeedback: this.analyzeForm(poseResult),
        movementMetrics: this.calculateMovementMetrics(poseResult),
        timestamp: Date.now(),
        confidence: this.calculateConfidence(poseResult)
      };

      // 更新重复次数
      this.updateRepetitionCount(poseResult);

      // 更新整体指标
      this.updateMetrics(analysisResult);

      this.eventBus.emit('analysis:result', analysisResult);
      return analysisResult;

    } catch (error) {
      this.eventBus.emit('analysis:error', { 
        error: error instanceof Error ? error.message : '分析失败' 
      });
      throw error;
    }
  }

  /**
   * 设置运动类型
   */
  setExerciseType(exerciseType: ExerciseType): void {
    if (this.currentExercise !== exerciseType) {
      this.currentExercise = exerciseType;
      this.reset();
      this.eventBus.emit('analysis:exercise-changed', { exerciseType });
    }
  }

  /**
   * 重置分析状态
   */
  reset(): void {
    this.poseHistory = [];
    this.repetitionCount = 0;
    this.currentPhase = 'neutral';
    this.metrics = this.initializeMetrics();
    this.eventBus.emit('analysis:reset');
  }

  /**
   * 获取运动指标
   */
  getMetrics(): MovementMetrics {
    return { ...this.metrics };
  }

  /**
   * 释放资源
   */
  dispose(): void {
    this.reset();
    this.config = null;
    this.eventBus.emit('analysis:disposed');
  }

  /**
   * 更新姿态历史
   */
  private updatePoseHistory(poseResult: PoseEstimationResult): void {
    this.poseHistory.push(poseResult);
    
    // 保持历史记录在合理范围内（最近30帧）
    if (this.poseHistory.length > 30) {
      this.poseHistory.shift();
    }
  }

  /**
   * 分析动作形式
   */
  private analyzeForm(poseResult: PoseEstimationResult): string[] {
    const feedback: string[] = [];

    if (!poseResult.poses.length) {
      feedback.push('未检测到人体姿态');
      return feedback;
    }

    const pose = poseResult.poses[0];
    
    switch (this.currentExercise) {
      case 'squat':
        feedback.push(...this.analyzeSquatForm(pose));
        break;
      case 'pushup':
        feedback.push(...this.analyzePushupForm(pose));
        break;
      case 'plank':
        feedback.push(...this.analyzePlankForm(pose));
        break;
      case 'running':
        feedback.push(...this.analyzeRunningForm(pose));
        break;
      default:
        feedback.push(...this.analyzeGeneralForm(pose));
    }

    return feedback;
  }

  /**
   * 深蹲动作分析
   */
  private analyzeSquatForm(pose: any): string[] {
    const feedback: string[] = [];
    const keypoints = pose.keypoints;

    // 获取关键点
    const leftHip = this.findKeypoint(keypoints, 'left_hip');
    const rightHip = this.findKeypoint(keypoints, 'right_hip');
    const leftKnee = this.findKeypoint(keypoints, 'left_knee');
    const rightKnee = this.findKeypoint(keypoints, 'right_knee');
    const leftAnkle = this.findKeypoint(keypoints, 'left_ankle');
    const rightAnkle = this.findKeypoint(keypoints, 'right_ankle');

    if (!leftHip || !rightHip || !leftKnee || !rightKnee) {
      feedback.push('关键点检测不完整');
      return feedback;
    }

    // 计算膝盖角度
    const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
    const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);

    // 分析深蹲深度
    if (leftKneeAngle > 120 && rightKneeAngle > 120) {
      feedback.push('蹲得不够深，尝试蹲到大腿与地面平行');
    } else if (leftKneeAngle < 70 || rightKneeAngle < 70) {
      feedback.push('蹲得太深，注意保护膝盖');
    }

    // 检查膝盖是否内扣
    const hipWidth = Math.abs(leftHip.x - rightHip.x);
    const kneeWidth = Math.abs(leftKnee.x - rightKnee.x);
    
    if (kneeWidth < hipWidth * 0.8) {
      feedback.push('膝盖内扣，保持膝盖与脚尖方向一致');
    }

    // 检查背部姿态
    const backAngle = this.calculateBackAngle(pose);
    if (backAngle > 30) {
      feedback.push('背部过度前倾，保持挺胸收腹');
    }

    return feedback;
  }

  /**
   * 俯卧撑动作分析
   */
  private analyzePushupForm(pose: any): string[] {
    const feedback: string[] = [];
    const keypoints = pose.keypoints;

    const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
    const rightShoulder = this.findKeypoint(keypoints, 'right_shoulder');
    const leftElbow = this.findKeypoint(keypoints, 'left_elbow');
    const rightElbow = this.findKeypoint(keypoints, 'right_elbow');
    const leftHip = this.findKeypoint(keypoints, 'left_hip');

    if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) {
      feedback.push('上肢关键点检测不完整');
      return feedback;
    }

    // 检查身体是否保持直线
    const bodyAlignment = this.checkBodyAlignment([leftShoulder, leftHip, this.findKeypoint(keypoints, 'left_ankle')]);
    if (bodyAlignment > 15) {
      feedback.push('保持身体成一条直线，不要塌腰或撅臀');
    }

    // 检查手臂角度
    const leftArmAngle = this.calculateAngle(leftShoulder, leftElbow, this.findKeypoint(keypoints, 'left_wrist'));
    const rightArmAngle = this.calculateAngle(rightShoulder, rightElbow, this.findKeypoint(keypoints, 'right_wrist'));

    if (leftArmAngle < 70 || rightArmAngle < 70) {
      feedback.push('手臂弯曲不够，下降到胸部接近地面');
    }

    return feedback;
  }

  /**
   * 平板支撑分析
   */
  private analyzePlankForm(pose: any): string[] {
    const feedback: string[] = [];
    const keypoints = pose.keypoints;

    const leftShoulder = this.findKeypoint(keypoints, 'left_shoulder');
    const leftHip = this.findKeypoint(keypoints, 'left_hip');
    const leftAnkle = this.findKeypoint(keypoints, 'left_ankle');

    if (!leftShoulder || !leftHip || !leftAnkle) {
      feedback.push('关键点检测不完整');
      return feedback;
    }

    // 检查身体直线度
    const alignment = this.checkBodyAlignment([leftShoulder, leftHip, leftAnkle]);
    
    if (alignment > 10) {
      if (leftHip.y > leftShoulder.y + 50) {
        feedback.push('臀部过高，降低臀部保持身体直线');
      } else if (leftHip.y < leftShoulder.y - 50) {
        feedback.push('臀部过低，抬高臀部保持身体直线');
      }
    } else {
      feedback.push('平板支撑姿态良好');
    }

    return feedback;
  }

  /**
   * 跑步姿态分析
   */
  private analyzeRunningForm(pose: any): string[] {
    const feedback: string[] = [];
    
    if (this.poseHistory.length < 5) {
      return ['正在分析跑步姿态...'];
    }

    // 分析步频
    const cadence = this.calculateCadence();
    if (cadence < 160) {
      feedback.push('步频偏低，尝试增加步频到170-180步/分钟');
    } else if (cadence > 200) {
      feedback.push('步频过高，适当放慢步频');
    }

    // 分析着地方式
    const footStrike = this.analyzeFootStrike(pose);
    if (footStrike === 'heel') {
      feedback.push('尽量避免脚跟着地，尝试前脚掌或中足着地');
    }

    // 分析身体前倾
    const leanAngle = this.calculateBodyLean(pose);
    if (leanAngle < 2) {
      feedback.push('身体略微前倾有助于推进');
    } else if (leanAngle > 8) {
      feedback.push('身体前倾过度，保持自然直立');
    }

    return feedback;
  }

  /**
   * 通用姿态分析
   */
  private analyzeGeneralForm(pose: any): string[] {
    const feedback: string[] = [];
    
    // 检查姿态置信度
    const avgConfidence = pose.keypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / pose.keypoints.length;
    
    if (avgConfidence < 0.5) {
      feedback.push('姿态检测质量较低，请调整光线或摄像头位置');
    } else if (avgConfidence > 0.8) {
      feedback.push('姿态检测质量良好');
    }

    return feedback;
  }

  /**
   * 计算运动指标
   */
  private calculateMovementMetrics(poseResult: PoseEstimationResult): Partial<MovementMetrics> {
    const metrics: Partial<MovementMetrics> = {};

    if (this.poseHistory.length < 2) {
      return metrics;
    }

    const currentPose = poseResult.poses[0];
    const previousPoseResult = this.poseHistory[this.poseHistory.length - 2];
    const previousPose = previousPoseResult?.poses[0];

    if (!currentPose || !previousPose) {
      return metrics;
    }

    // 计算运动速度
    metrics.velocity = this.calculateVelocity(currentPose, previousPose);

    // 计算稳定性
    metrics.stability = this.calculateStability();

    // 计算对称性
    metrics.symmetry = this.calculateSymmetry(currentPose);

    return metrics;
  }

  /**
   * 更新重复次数
   */
  private updateRepetitionCount(poseResult: PoseEstimationResult): void {
    if (!poseResult.poses.length) return;

    const pose = poseResult.poses[0];
    
    switch (this.currentExercise) {
      case 'squat':
        this.updateSquatCount(pose);
        break;
      case 'pushup':
        this.updatePushupCount(pose);
        break;
      // 其他运动类型...
    }
  }

  /**
   * 更新深蹲计数
   */
  private updateSquatCount(pose: any): void {
    const leftKnee = this.findKeypoint(pose.keypoints, 'left_knee');
    const rightKnee = this.findKeypoint(pose.keypoints, 'right_knee');
    const leftHip = this.findKeypoint(pose.keypoints, 'left_hip');
    const rightHip = this.findKeypoint(pose.keypoints, 'right_hip');

    if (!leftKnee || !rightKnee || !leftHip || !rightHip) return;

    // 简单的深蹲检测逻辑
    const avgKneeY = (leftKnee.y + rightKnee.y) / 2;
    const avgHipY = (leftHip.y + rightHip.y) / 2;
    
    const isSquatting = avgKneeY > avgHipY + 30; // 膝盖低于臀部

    if (isSquatting && this.currentPhase !== 'down') {
      this.currentPhase = 'down';
    } else if (!isSquatting && this.currentPhase === 'down') {
      this.currentPhase = 'up';
      this.repetitionCount++;
      this.eventBus.emit('analysis:repetition', { 
        count: this.repetitionCount, 
        exercise: this.currentExercise 
      });
    }
  }

  /**
   * 更新俯卧撑计数
   */
  private updatePushupCount(pose: any): void {
    const leftElbow = this.findKeypoint(pose.keypoints, 'left_elbow');
    const rightElbow = this.findKeypoint(pose.keypoints, 'right_elbow');
    const leftShoulder = this.findKeypoint(pose.keypoints, 'left_shoulder');
    const rightShoulder = this.findKeypoint(pose.keypoints, 'right_shoulder');

    if (!leftElbow || !rightElbow || !leftShoulder || !rightShoulder) return;

    // 计算肘部相对于肩部的位置
    const avgElbowY = (leftElbow.y + rightElbow.y) / 2;
    const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
    
    const isPushingDown = avgElbowY > avgShoulderY + 20;

    if (isPushingDown && this.currentPhase !== 'down') {
      this.currentPhase = 'down';
    } else if (!isPushingDown && this.currentPhase === 'down') {
      this.currentPhase = 'up';
      this.repetitionCount++;
      this.eventBus.emit('analysis:repetition', { 
        count: this.repetitionCount, 
        exercise: this.currentExercise 
      });
    }
  }

  // 辅助方法

  /**
   * 查找关键点
   */
  private findKeypoint(keypoints: Keypoint[], name: string): Keypoint | null {
    return keypoints.find(kp => kp.name === name) || null;
  }

  /**
   * 计算角度
   */
  private calculateAngle(point1: Keypoint | null, point2: Keypoint | null, point3: Keypoint | null): number {
    if (!point1 || !point2 || !point3) return 0;

    const vector1 = { x: point1.x - point2.x, y: point1.y - point2.y };
    const vector2 = { x: point3.x - point2.x, y: point3.y - point2.y };

    const dot = vector1.x * vector2.x + vector1.y * vector2.y;
    const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
    const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);

    const cos = dot / (mag1 * mag2);
    return Math.acos(Math.max(-1, Math.min(1, cos))) * (180 / Math.PI);
  }

  /**
   * 计算背部角度
   */
  private calculateBackAngle(pose: any): number {
    const leftShoulder = this.findKeypoint(pose.keypoints, 'left_shoulder');
    const leftHip = this.findKeypoint(pose.keypoints, 'left_hip');
    
    if (!leftShoulder || !leftHip) return 0;

    const angle = Math.atan2(leftShoulder.y - leftHip.y, leftShoulder.x - leftHip.x);
    return Math.abs(angle * (180 / Math.PI) - 90);
  }

  /**
   * 检查身体对齐度
   */
  private checkBodyAlignment(points: (Keypoint | null)[]): number {
    const validPoints = points.filter(p => p !== null) as Keypoint[];
    if (validPoints.length < 2) return 0;

    // 计算点到直线的平均距离
    const first = validPoints[0];
    const last = validPoints[validPoints.length - 1];
    
    let totalDeviation = 0;
    for (let i = 1; i < validPoints.length - 1; i++) {
      const point = validPoints[i];
      if (point && first && last) {
        const deviation = this.pointToLineDistance(point, first, last);
        totalDeviation += deviation;
      }
    }

    return totalDeviation / (validPoints.length - 2);
  }

  /**
   * 点到直线距离
   */
  private pointToLineDistance(point: Keypoint, lineStart: Keypoint, lineEnd: Keypoint): number {
    const A = lineEnd.y - lineStart.y;
    const B = lineStart.x - lineEnd.x;
    const C = lineEnd.x * lineStart.y - lineStart.x * lineEnd.y;
    
    return Math.abs(A * point.x + B * point.y + C) / Math.sqrt(A * A + B * B);
  }

  /**
   * 计算运动速度
   */
  private calculateVelocity(currentPose: any, previousPose: any): number {
    if (!currentPose.keypoints || !previousPose.keypoints) return 0;

    let totalMovement = 0;
    let validPoints = 0;

    for (const currentKp of currentPose.keypoints) {
      const previousKp = previousPose.keypoints.find((kp: any) => kp.name === currentKp.name);
      if (previousKp) {
        const distance = Math.sqrt(
          Math.pow(currentKp.x - previousKp.x, 2) + 
          Math.pow(currentKp.y - previousKp.y, 2)
        );
        totalMovement += distance;
        validPoints++;
      }
    }

    return validPoints > 0 ? totalMovement / validPoints : 0;
  }

  /**
   * 计算稳定性
   */
  private calculateStability(): number {
    if (this.poseHistory.length < 5) return 0;

    const recentPoses = this.poseHistory.slice(-5);
    let totalVariation = 0;
    let validComparisons = 0;

    for (let i = 1; i < recentPoses.length; i++) {
      const currentPose = recentPoses[i]?.poses[0];
      const previousPose = recentPoses[i-1]?.poses[0];
      
      if (currentPose && previousPose) {
        const variation = this.calculateVelocity(currentPose, previousPose);
        totalVariation += variation;
        validComparisons++;
      }
    }

    const avgVariation = validComparisons > 0 ? totalVariation / validComparisons : 0;
    return Math.max(0, 100 - avgVariation * 10); // 转换为0-100的稳定性分数
  }

  /**
   * 计算对称性
   */
  private calculateSymmetry(pose: any): number {
    const leftShoulder = this.findKeypoint(pose.keypoints, 'left_shoulder');
    const rightShoulder = this.findKeypoint(pose.keypoints, 'right_shoulder');
    const leftHip = this.findKeypoint(pose.keypoints, 'left_hip');
    const rightHip = this.findKeypoint(pose.keypoints, 'right_hip');

    if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return 0;

    // 计算左右对称性
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    const hipDiff = Math.abs(leftHip.y - rightHip.y);
    
    const avgDiff = (shoulderDiff + hipDiff) / 2;
    return Math.max(0, 100 - avgDiff); // 转换为0-100的对称性分数
  }

  /**
   * 计算步频
   */
  private calculateCadence(): number {
    // 简化的步频计算，实际实现需要更复杂的算法
    if (this.poseHistory.length < 10) return 0;

    // 检测脚部运动周期
    const footMovements = this.poseHistory.map(pose => {
      const leftAnkle = this.findKeypoint(pose.poses[0]?.keypoints || [], 'left_ankle');
      const rightAnkle = this.findKeypoint(pose.poses[0]?.keypoints || [], 'right_ankle');
      return {
        left: leftAnkle?.y || 0,
        right: rightAnkle?.y || 0,
        timestamp: pose.timestamp
      };
    });

    // 简化计算：基于脚部垂直运动的频率
    let steps = 0;
    for (let i = 1; i < footMovements.length - 1; i++) {
      const prev = footMovements[i - 1];
      const curr = footMovements[i];
      const next = footMovements[i + 1];

      // 检测左脚步伐
      if (prev && curr && next && curr.left < prev.left && curr.left < next.left) {
        steps++;
      }
      // 检测右脚步伐
      if (prev && curr && next && curr.right < prev.right && curr.right < next.right) {
        steps++;
      }
    }

    const firstMovement = footMovements[0];
    const lastMovement = footMovements[footMovements.length - 1];
    if (!firstMovement || !lastMovement) return 0;
    
    const timeSpan = (lastMovement.timestamp - firstMovement.timestamp) / 1000;
    return timeSpan > 0 ? (steps / timeSpan) * 60 : 0; // 步/分钟
  }

  /**
   * 分析着地方式
   */
  private analyzeFootStrike(pose: any): 'heel' | 'midfoot' | 'forefoot' {
    // 简化的着地分析
    const leftAnkle = this.findKeypoint(pose.keypoints, 'left_ankle');
    const leftToe = this.findKeypoint(pose.keypoints, 'left_big_toe');
    
    if (!leftAnkle || !leftToe) return 'midfoot';

    const angleDiff = leftToe.y - leftAnkle.y;
    
    if (angleDiff > 10) return 'heel';
    if (angleDiff < -10) return 'forefoot';
    return 'midfoot';
  }

  /**
   * 计算身体前倾角度
   */
  private calculateBodyLean(pose: any): number {
    const head = this.findKeypoint(pose.keypoints, 'nose');
    const hip = this.findKeypoint(pose.keypoints, 'left_hip');
    
    if (!head || !hip) return 0;

    const angle = Math.atan2(head.x - hip.x, hip.y - head.y);
    return Math.abs(angle * (180 / Math.PI));
  }

  /**
   * 计算置信度
   */
  private calculateConfidence(poseResult: PoseEstimationResult): number {
    if (!poseResult.poses.length) return 0;

    const pose = poseResult.poses[0];
    if (!pose?.keypoints) return 0;
    
    const avgScore = pose.keypoints.reduce((sum: number, kp: any) => sum + kp.score, 0) / pose.keypoints.length;
    
    return Math.round(avgScore * 100);
  }

  /**
   * 更新整体指标
   */
  private updateMetrics(analysisResult: AnalysisResult): void {
    this.metrics.totalFrames = (this.metrics.totalFrames || 0) + 1;
    this.metrics.validFrames = (this.metrics.validFrames || 0) + (analysisResult.confidence && analysisResult.confidence > 50 ? 1 : 0);
    this.metrics.averageConfidence = (this.metrics.averageConfidence + (analysisResult.confidence || 0)) / 2;
    
    if (analysisResult.movementMetrics?.velocity !== undefined) {
      this.metrics.velocity = analysisResult.movementMetrics.velocity;
    }
    if (analysisResult.movementMetrics?.stability !== undefined) {
      this.metrics.stability = analysisResult.movementMetrics.stability;
    }
    if (analysisResult.movementMetrics?.symmetry !== undefined) {
      this.metrics.symmetry = analysisResult.movementMetrics.symmetry;
    }
  }

  /**
   * 初始化指标
   */
  private initializeMetrics(): MovementMetrics {
    return {
      velocity: 0,
      stability: 0,
      symmetry: 0,
      averageConfidence: 0,
      totalFrames: 0,
      validFrames: 0
    };
  }
}

/**
 * 分析引擎工厂
 */
export class AnalysisEngineFactory {
  static create(type: 'fitness' = 'fitness', eventBus: EventBusImpl): AnalysisEngine {
    switch (type) {
      case 'fitness':
        return new FitnessAnalysisEngine(eventBus);
      default:
        throw new Error(`不支持的分析引擎类型: ${type}`);
    }
  }
}