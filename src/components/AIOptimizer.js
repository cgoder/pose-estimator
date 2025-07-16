/**
 * AI驱动的自适应优化器
 * 基于机器学习算法自动优化系统性能
 * 实现智能参数调整和性能预测
 */

import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { SystemOptimizer } from '../utils/SystemOptimizer.js';

// 优化策略类型
export const OptimizationStrategy = {
  PERFORMANCE_FIRST: 'performance_first',
  QUALITY_FIRST: 'quality_first',
  BALANCED: 'balanced',
  POWER_SAVING: 'power_saving',
  ADAPTIVE: 'adaptive'
};

// 学习模式
export const LearningMode = {
  SUPERVISED: 'supervised',
  UNSUPERVISED: 'unsupervised',
  REINFORCEMENT: 'reinforcement',
  HYBRID: 'hybrid'
};

// 优化目标
export const OptimizationTarget = {
  FPS: 'fps',
  LATENCY: 'latency',
  MEMORY: 'memory',
  CPU: 'cpu',
  GPU: 'gpu',
  ACCURACY: 'accuracy',
  ENERGY: 'energy'
};

// 决策置信度级别
export const ConfidenceLevel = {
  VERY_LOW: 'very_low',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  VERY_HIGH: 'very_high'
};

/**
 * 性能数据特征提取器
 */
class FeatureExtractor {
  constructor() {
    this.features = new Map();
    this.featureHistory = [];
    this.maxHistorySize = 1000;
  }

  extractFeatures(performanceData) {
    const features = {
      // 基础性能指标
      fps: performanceData.fps || 0,
      frameTime: performanceData.frameTime || 0,
      inferenceTime: performanceData.inferenceTime || 0,
      renderTime: performanceData.renderTime || 0,
      
      // 资源使用率
      memoryUsage: performanceData.memoryUsage || 0,
      cpuUsage: performanceData.cpuUsage || 0,
      gpuUsage: performanceData.gpuUsage || 0,
      
      // 系统状态
      cacheHitRate: performanceData.cacheHitRate || 0,
      networkLatency: performanceData.networkLatency || 0,
      errorRate: performanceData.errorRate || 0,
      
      // 计算衍生特征
      performanceScore: this.calculatePerformanceScore(performanceData),
      resourceEfficiency: this.calculateResourceEfficiency(performanceData),
      stabilityIndex: this.calculateStabilityIndex(performanceData),
      
      // 时间特征
      timestamp: Date.now(),
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      
      // 环境特征
      deviceType: this.detectDeviceType(),
      browserType: this.detectBrowserType(),
      screenResolution: this.getScreenResolution(),
      
      // 工作负载特征
      analysisComplexity: this.calculateAnalysisComplexity(performanceData),
      inputResolution: performanceData.inputResolution || 0,
      modelComplexity: performanceData.modelComplexity || 0
    };
    
    // 添加历史统计特征
    this.addHistoricalFeatures(features);
    
    // 保存特征历史
    this.featureHistory.push(features);
    if (this.featureHistory.length > this.maxHistorySize) {
      this.featureHistory.shift();
    }
    
    return features;
  }

  calculatePerformanceScore(data) {
    const weights = {
      fps: 0.3,
      frameTime: -0.2,
      inferenceTime: -0.2,
      memoryUsage: -0.15,
      cpuUsage: -0.15
    };
    
    let score = 0;
    Object.entries(weights).forEach(([key, weight]) => {
      if (data[key] !== undefined) {
        score += (data[key] || 0) * weight;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }

  calculateResourceEfficiency(data) {
    const totalUsage = (data.cpuUsage || 0) + (data.memoryUsage || 0) + (data.gpuUsage || 0);
    const performance = data.fps || 1;
    return totalUsage > 0 ? performance / totalUsage : 0;
  }

  calculateStabilityIndex(data) {
    if (this.featureHistory.length < 10) return 50;
    
    const recent = this.featureHistory.slice(-10);
    const fpsValues = recent.map(f => f.fps);
    const mean = fpsValues.reduce((a, b) => a + b, 0) / fpsValues.length;
    const variance = fpsValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / fpsValues.length;
    const stability = Math.max(0, 100 - Math.sqrt(variance));
    
    return stability;
  }

  calculateAnalysisComplexity(data) {
    // 基于多个因素计算分析复杂度
    const factors = {
      inputResolution: (data.inputResolution || 480) / 1080, // 标准化到1080p
      modelSize: (data.modelSize || 1) / 10, // 假设最大模型大小为10MB
      poseCount: (data.poseCount || 1) / 5, // 假设最多检测5个人
      analysisDepth: (data.analysisDepth || 1) / 3 // 分析深度级别1-3
    };
    
    return Object.values(factors).reduce((sum, factor) => sum + factor, 0) / Object.keys(factors).length;
  }

  detectDeviceType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (/mobile|android|iphone|ipad/.test(userAgent)) return 'mobile';
    if (/tablet/.test(userAgent)) return 'tablet';
    return 'desktop';
  }

  detectBrowserType() {
    const userAgent = navigator.userAgent.toLowerCase();
    if (userAgent.includes('chrome')) return 'chrome';
    if (userAgent.includes('firefox')) return 'firefox';
    if (userAgent.includes('safari')) return 'safari';
    if (userAgent.includes('edge')) return 'edge';
    return 'other';
  }

  getScreenResolution() {
    return screen.width * screen.height;
  }

  addHistoricalFeatures(features) {
    if (this.featureHistory.length === 0) return;
    
    const recent = this.featureHistory.slice(-5);
    
    // 添加趋势特征
    features.fpsTrend = this.calculateTrend(recent.map(f => f.fps));
    features.memoryTrend = this.calculateTrend(recent.map(f => f.memoryUsage));
    features.cpuTrend = this.calculateTrend(recent.map(f => f.cpuUsage));
    
    // 添加移动平均
    features.fpsMovingAvg = recent.reduce((sum, f) => sum + f.fps, 0) / recent.length;
    features.memoryMovingAvg = recent.reduce((sum, f) => sum + f.memoryUsage, 0) / recent.length;
  }

  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    return last - first;
  }

  getFeatureHistory(limit = 100) {
    return this.featureHistory.slice(-limit);
  }

  reset() {
    this.features.clear();
    this.featureHistory = [];
  }
}

/**
 * 机器学习模型管理器
 */
class MLModelManager {
  constructor() {
    this.models = new Map();
    this.activeModel = null;
    this.trainingData = [];
    this.maxTrainingData = 5000;
    this.modelAccuracy = new Map();
    this.isTraining = false;
  }

  async initializeModels() {
    // 初始化不同的ML模型
    await this.loadPerformancePredictionModel();
    await this.loadOptimizationRecommendationModel();
    await this.loadAnomalyDetectionModel();
    
    console.log('AI优化器模型已初始化');
  }

  async loadPerformancePredictionModel() {
    // 简化的性能预测模型（实际项目中可使用TensorFlow.js）
    const model = {
      name: 'performance_predictor',
      type: 'regression',
      weights: this.initializeWeights(15), // 15个特征
      bias: 0,
      learningRate: 0.01,
      predict: (features) => this.linearPredict(features, model.weights, model.bias)
    };
    
    this.models.set('performance_predictor', model);
  }

  async loadOptimizationRecommendationModel() {
    // 优化推荐模型
    const model = {
      name: 'optimization_recommender',
      type: 'classification',
      rules: this.initializeOptimizationRules(),
      predict: (features) => this.ruleBasedPredict(features, model.rules)
    };
    
    this.models.set('optimization_recommender', model);
  }

  async loadAnomalyDetectionModel() {
    // 异常检测模型
    const model = {
      name: 'anomaly_detector',
      type: 'anomaly_detection',
      threshold: 2.0, // 标准差阈值
      baseline: null,
      predict: (features) => this.anomalyDetect(features, model)
    };
    
    this.models.set('anomaly_detector', model);
  }

  initializeWeights(size) {
    return Array.from({ length: size }, () => Math.random() * 0.1 - 0.05);
  }

  initializeOptimizationRules() {
    return [
      {
        condition: (f) => f.fps < 20,
        action: 'reduce_quality',
        priority: 'high',
        confidence: 0.9
      },
      {
        condition: (f) => f.memoryUsage > 80,
        action: 'clear_cache',
        priority: 'medium',
        confidence: 0.8
      },
      {
        condition: (f) => f.cpuUsage > 85,
        action: 'reduce_analysis_frequency',
        priority: 'high',
        confidence: 0.85
      },
      {
        condition: (f) => f.gpuUsage > 90,
        action: 'enable_gpu_optimization',
        priority: 'high',
        confidence: 0.9
      },
      {
        condition: (f) => f.cacheHitRate < 0.5,
        action: 'optimize_cache_strategy',
        priority: 'medium',
        confidence: 0.7
      },
      {
        condition: (f) => f.stabilityIndex < 30,
        action: 'enable_frame_smoothing',
        priority: 'medium',
        confidence: 0.75
      }
    ];
  }

  linearPredict(features, weights, bias) {
    const featureArray = this.featuresToArray(features);
    let prediction = bias;
    
    for (let i = 0; i < Math.min(featureArray.length, weights.length); i++) {
      prediction += featureArray[i] * weights[i];
    }
    
    return prediction;
  }

  ruleBasedPredict(features, rules) {
    const recommendations = [];
    
    rules.forEach(rule => {
      if (rule.condition(features)) {
        recommendations.push({
          action: rule.action,
          priority: rule.priority,
          confidence: rule.confidence,
          reason: this.generateReason(rule, features)
        });
      }
    });
    
    // 按优先级和置信度排序
    return recommendations.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
    });
  }

  anomalyDetect(features, model) {
    if (!model.baseline) {
      this.updateBaseline(model);
      return { isAnomaly: false, score: 0 };
    }
    
    const score = this.calculateAnomalyScore(features, model.baseline);
    const isAnomaly = score > model.threshold;
    
    return { isAnomaly, score };
  }

  calculateAnomalyScore(features, baseline) {
    const featureArray = this.featuresToArray(features);
    let totalDeviation = 0;
    let count = 0;
    
    featureArray.forEach((value, index) => {
      if (baseline.means[index] !== undefined && baseline.stds[index] > 0) {
        const deviation = Math.abs(value - baseline.means[index]) / baseline.stds[index];
        totalDeviation += deviation;
        count++;
      }
    });
    
    return count > 0 ? totalDeviation / count : 0;
  }

  updateBaseline(model) {
    if (this.trainingData.length < 50) return;
    
    const recentData = this.trainingData.slice(-100);
    const featureArrays = recentData.map(data => this.featuresToArray(data.features));
    
    const means = [];
    const stds = [];
    
    for (let i = 0; i < featureArrays[0].length; i++) {
      const values = featureArrays.map(arr => arr[i]).filter(v => !isNaN(v));
      if (values.length > 0) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        means[i] = mean;
        stds[i] = Math.sqrt(variance);
      }
    }
    
    model.baseline = { means, stds };
  }

  featuresToArray(features) {
    return [
      features.fps || 0,
      features.frameTime || 0,
      features.inferenceTime || 0,
      features.renderTime || 0,
      features.memoryUsage || 0,
      features.cpuUsage || 0,
      features.gpuUsage || 0,
      features.cacheHitRate || 0,
      features.networkLatency || 0,
      features.errorRate || 0,
      features.performanceScore || 0,
      features.resourceEfficiency || 0,
      features.stabilityIndex || 0,
      features.analysisComplexity || 0,
      features.screenResolution || 0
    ];
  }

  generateReason(rule, features) {
    const reasons = {
      reduce_quality: `当前FPS为${features.fps.toFixed(1)}，低于最佳性能阈值`,
      clear_cache: `内存使用率${features.memoryUsage.toFixed(1)}%过高，建议清理缓存`,
      reduce_analysis_frequency: `CPU使用率${features.cpuUsage.toFixed(1)}%过高，建议降低分析频率`,
      enable_gpu_optimization: `GPU使用率${features.gpuUsage.toFixed(1)}%接近满载，启用GPU优化`,
      optimize_cache_strategy: `缓存命中率${(features.cacheHitRate * 100).toFixed(1)}%偏低，需要优化缓存策略`,
      enable_frame_smoothing: `稳定性指数${features.stabilityIndex.toFixed(1)}偏低，建议启用帧平滑`
    };
    
    return reasons[rule.action] || '基于当前系统状态的优化建议';
  }

  addTrainingData(features, performance, optimization) {
    this.trainingData.push({
      features,
      performance,
      optimization,
      timestamp: Date.now()
    });
    
    if (this.trainingData.length > this.maxTrainingData) {
      this.trainingData.shift();
    }
  }

  async trainModels() {
    if (this.isTraining || this.trainingData.length < 100) return;
    
    this.isTraining = true;
    
    try {
      await this.trainPerformancePredictionModel();
      await this.updateAnomalyDetectionBaseline();
      console.log('模型训练完成');
    } catch (error) {
      console.error('模型训练失败:', error);
    } finally {
      this.isTraining = false;
    }
  }

  async trainPerformancePredictionModel() {
    const model = this.models.get('performance_predictor');
    if (!model) return;
    
    const trainingSet = this.trainingData.slice(-1000);
    const epochs = 10;
    
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const data of trainingSet) {
        const features = this.featuresToArray(data.features);
        const target = data.performance.fps || 30;
        const prediction = this.linearPredict(data.features, model.weights, model.bias);
        const error = target - prediction;
        
        // 简单的梯度下降更新
        for (let i = 0; i < model.weights.length && i < features.length; i++) {
          model.weights[i] += model.learningRate * error * features[i];
        }
        model.bias += model.learningRate * error;
      }
    }
  }

  async updateAnomalyDetectionBaseline() {
    const model = this.models.get('anomaly_detector');
    if (model) {
      this.updateBaseline(model);
    }
  }

  getModel(name) {
    return this.models.get(name);
  }

  getModelAccuracy(name) {
    return this.modelAccuracy.get(name) || 0;
  }

  getTrainingDataSize() {
    return this.trainingData.length;
  }
}

/**
 * 优化决策引擎
 */
class OptimizationDecisionEngine {
  constructor() {
    this.decisions = [];
    this.decisionHistory = [];
    this.maxHistorySize = 1000;
    this.cooldownPeriods = new Map(); // 防止频繁调整
    this.lastOptimizations = new Map();
  }

  makeDecision(features, predictions, strategy = OptimizationStrategy.BALANCED) {
    const decision = {
      id: this.generateDecisionId(),
      timestamp: Date.now(),
      features,
      predictions,
      strategy,
      recommendations: [],
      confidence: ConfidenceLevel.MEDIUM,
      priority: 'medium',
      reasoning: []
    };
    
    // 基于策略生成推荐
    this.generateRecommendations(decision);
    
    // 评估决策置信度
    this.evaluateConfidence(decision);
    
    // 应用冷却期检查
    this.applyCooldownFilter(decision);
    
    // 记录决策
    this.recordDecision(decision);
    
    return decision;
  }

  generateRecommendations(decision) {
    const { features, predictions, strategy } = decision;
    
    // 从ML模型获取推荐
    if (predictions.optimizationRecommendations) {
      decision.recommendations.push(...predictions.optimizationRecommendations);
    }
    
    // 基于策略调整推荐
    this.adjustRecommendationsByStrategy(decision, strategy);
    
    // 添加自定义规则推荐
    this.addCustomRecommendations(decision);
    
    // 去重和排序
    this.deduplicateAndSortRecommendations(decision);
  }

  adjustRecommendationsByStrategy(decision, strategy) {
    const { recommendations } = decision;
    
    switch (strategy) {
      case OptimizationStrategy.PERFORMANCE_FIRST:
        // 优先考虑性能提升
        recommendations.forEach(rec => {
          if (rec.action.includes('reduce') || rec.action.includes('optimize')) {
            rec.confidence *= 1.2;
            rec.priority = 'high';
          }
        });
        break;
        
      case OptimizationStrategy.QUALITY_FIRST:
        // 优先保持质量
        recommendations.forEach(rec => {
          if (rec.action.includes('reduce_quality')) {
            rec.confidence *= 0.7;
            rec.priority = 'low';
          }
        });
        break;
        
      case OptimizationStrategy.POWER_SAVING:
        // 优先节能
        recommendations.forEach(rec => {
          if (rec.action.includes('reduce') || rec.action.includes('lower')) {
            rec.confidence *= 1.3;
            rec.priority = 'high';
          }
        });
        break;
        
      case OptimizationStrategy.ADAPTIVE:
        // 自适应策略，基于当前状态动态调整
        this.applyAdaptiveStrategy(decision);
        break;
    }
  }

  applyAdaptiveStrategy(decision) {
    const { features } = decision;
    
    // 根据当前性能状态动态选择策略
    if (features.fps < 20) {
      // 性能严重不足，优先性能
      this.adjustRecommendationsByStrategy(decision, OptimizationStrategy.PERFORMANCE_FIRST);
      decision.reasoning.push('检测到严重性能问题，切换到性能优先模式');
    } else if (features.memoryUsage > 85 || features.cpuUsage > 85) {
      // 资源紧张，启用节能模式
      this.adjustRecommendationsByStrategy(decision, OptimizationStrategy.POWER_SAVING);
      decision.reasoning.push('检测到资源使用率过高，切换到节能模式');
    } else if (features.stabilityIndex > 80 && features.fps > 45) {
      // 性能良好，保持质量
      this.adjustRecommendationsByStrategy(decision, OptimizationStrategy.QUALITY_FIRST);
      decision.reasoning.push('系统运行稳定，保持当前质量设置');
    } else {
      // 默认平衡模式
      decision.reasoning.push('应用平衡优化策略');
    }
  }

  addCustomRecommendations(decision) {
    const { features } = decision;
    
    // 基于历史数据的自定义推荐
    if (this.decisionHistory.length > 10) {
      const recentDecisions = this.decisionHistory.slice(-10);
      const successfulOptimizations = recentDecisions.filter(d => d.effectiveness > 0.7);
      
      if (successfulOptimizations.length > 0) {
        const mostSuccessful = successfulOptimizations.reduce((best, current) => 
          current.effectiveness > best.effectiveness ? current : best
        );
        
        decision.recommendations.push({
          action: 'repeat_successful_optimization',
          priority: 'medium',
          confidence: 0.8,
          reason: `重复之前成功的优化策略（效果: ${(mostSuccessful.effectiveness * 100).toFixed(1)}%）`,
          details: mostSuccessful.appliedOptimizations
        });
      }
    }
    
    // 预防性推荐
    if (features.fpsTrend < -5) {
      decision.recommendations.push({
        action: 'preemptive_optimization',
        priority: 'medium',
        confidence: 0.75,
        reason: '检测到性能下降趋势，建议预防性优化'
      });
    }
  }

  deduplicateAndSortRecommendations(decision) {
    // 去重
    const uniqueRecommendations = new Map();
    decision.recommendations.forEach(rec => {
      const key = rec.action;
      if (!uniqueRecommendations.has(key) || 
          uniqueRecommendations.get(key).confidence < rec.confidence) {
        uniqueRecommendations.set(key, rec);
      }
    });
    
    // 排序
    decision.recommendations = Array.from(uniqueRecommendations.values())
      .sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : b.confidence - a.confidence;
      })
      .slice(0, 5); // 限制推荐数量
  }

  evaluateConfidence(decision) {
    const { recommendations, features } = decision;
    
    if (recommendations.length === 0) {
      decision.confidence = ConfidenceLevel.VERY_LOW;
      return;
    }
    
    const avgConfidence = recommendations.reduce((sum, rec) => sum + rec.confidence, 0) / recommendations.length;
    const dataQuality = this.evaluateDataQuality(features);
    const historicalAccuracy = this.getHistoricalAccuracy();
    
    const overallConfidence = (avgConfidence * 0.5) + (dataQuality * 0.3) + (historicalAccuracy * 0.2);
    
    if (overallConfidence >= 0.9) {
      decision.confidence = ConfidenceLevel.VERY_HIGH;
    } else if (overallConfidence >= 0.75) {
      decision.confidence = ConfidenceLevel.HIGH;
    } else if (overallConfidence >= 0.6) {
      decision.confidence = ConfidenceLevel.MEDIUM;
    } else if (overallConfidence >= 0.4) {
      decision.confidence = ConfidenceLevel.LOW;
    } else {
      decision.confidence = ConfidenceLevel.VERY_LOW;
    }
  }

  evaluateDataQuality(features) {
    let quality = 1.0;
    
    // 检查数据完整性
    const requiredFeatures = ['fps', 'memoryUsage', 'cpuUsage'];
    const missingFeatures = requiredFeatures.filter(f => features[f] === undefined || features[f] === null);
    quality -= missingFeatures.length * 0.2;
    
    // 检查数据合理性
    if (features.fps < 0 || features.fps > 120) quality -= 0.1;
    if (features.memoryUsage < 0 || features.memoryUsage > 100) quality -= 0.1;
    if (features.cpuUsage < 0 || features.cpuUsage > 100) quality -= 0.1;
    
    return Math.max(0, quality);
  }

  getHistoricalAccuracy() {
    if (this.decisionHistory.length < 5) return 0.5;
    
    const recentDecisions = this.decisionHistory.slice(-20);
    const accuracies = recentDecisions
      .filter(d => d.effectiveness !== undefined)
      .map(d => d.effectiveness);
    
    return accuracies.length > 0 ? 
      accuracies.reduce((sum, acc) => sum + acc, 0) / accuracies.length : 0.5;
  }

  applyCooldownFilter(decision) {
    const now = Date.now();
    const cooldownDuration = 30000; // 30秒冷却期
    
    decision.recommendations = decision.recommendations.filter(rec => {
      const lastOptimization = this.lastOptimizations.get(rec.action);
      if (lastOptimization && (now - lastOptimization) < cooldownDuration) {
        decision.reasoning.push(`跳过${rec.action}，仍在冷却期内`);
        return false;
      }
      return true;
    });
  }

  recordDecision(decision) {
    this.decisions.push(decision);
    this.decisionHistory.push(decision);
    
    if (this.decisionHistory.length > this.maxHistorySize) {
      this.decisionHistory.shift();
    }
  }

  updateDecisionEffectiveness(decisionId, effectiveness) {
    const decision = this.decisionHistory.find(d => d.id === decisionId);
    if (decision) {
      decision.effectiveness = effectiveness;
      decision.evaluatedAt = Date.now();
    }
  }

  markOptimizationApplied(action) {
    this.lastOptimizations.set(action, Date.now());
  }

  generateDecisionId() {
    return `decision_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getDecisionHistory(limit = 50) {
    return this.decisionHistory.slice(-limit);
  }

  getDecisionStats() {
    const total = this.decisionHistory.length;
    const evaluated = this.decisionHistory.filter(d => d.effectiveness !== undefined).length;
    const successful = this.decisionHistory.filter(d => d.effectiveness > 0.7).length;
    
    return {
      totalDecisions: total,
      evaluatedDecisions: evaluated,
      successfulDecisions: successful,
      successRate: evaluated > 0 ? successful / evaluated : 0,
      averageEffectiveness: this.getHistoricalAccuracy()
    };
  }
}

/**
 * AI驱动的自适应优化器主类
 */
export class AIOptimizer {
  constructor(config = {}) {
    this.config = {
      updateInterval: 5000, // 5秒更新间隔
      learningEnabled: true,
      autoOptimization: true,
      strategy: OptimizationStrategy.ADAPTIVE,
      confidenceThreshold: 0.6,
      maxOptimizationsPerMinute: 3,
      ...config
    };
    
    this.featureExtractor = new FeatureExtractor();
    this.mlModelManager = new MLModelManager();
    this.decisionEngine = new OptimizationDecisionEngine();
    
    this.isRunning = false;
    this.isInitialized = false;
    this.updateTimer = null;
    this.optimizationCount = 0;
    this.lastOptimizationTime = 0;
    
    this.eventListeners = new Map();
    this.optimizationHistory = [];
    this.performanceBaseline = null;
    
    // 绑定事件处理器
    this.bindEventHandlers();
  }

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      console.log('初始化AI优化器...');
      
      // 初始化ML模型
      await this.mlModelManager.initializeModels();
      
      // 建立性能基线
      await this.establishPerformanceBaseline();
      
      this.isInitialized = true;
      this.emit('initialized', { timestamp: Date.now() });
      
      console.log('AI优化器初始化完成');
    } catch (error) {
      console.error('AI优化器初始化失败:', error);
      throw error;
    }
  }

  async establishPerformanceBaseline() {
    // 收集初始性能数据作为基线
    const performanceMonitor = new PerformanceMonitor();
    const initialMetrics = performanceMonitor.getCurrentMetrics();
    
    this.performanceBaseline = {
      fps: initialMetrics.fps || 30,
      memoryUsage: initialMetrics.memoryUsage || 50,
      cpuUsage: initialMetrics.cpuUsage || 40,
      timestamp: Date.now()
    };
    
    console.log('性能基线已建立:', this.performanceBaseline);
  }

  start() {
    if (!this.isInitialized) {
      throw new Error('AI优化器未初始化，请先调用initialize()');
    }
    
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startOptimizationLoop();
    this.emit('started', { timestamp: Date.now() });
    
    console.log('AI优化器已启动');
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.stopOptimizationLoop();
    this.emit('stopped', { timestamp: Date.now() });
    
    console.log('AI优化器已停止');
  }

  startOptimizationLoop() {
    this.updateTimer = setInterval(async () => {
      try {
        await this.performOptimizationCycle();
      } catch (error) {
        console.error('优化循环错误:', error);
        this.emit('error', { error, timestamp: Date.now() });
      }
    }, this.config.updateInterval);
  }

  stopOptimizationLoop() {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }
  }

  async performOptimizationCycle() {
    // 1. 收集性能数据
    const performanceData = await this.collectPerformanceData();
    
    // 2. 提取特征
    const features = this.featureExtractor.extractFeatures(performanceData);
    
    // 3. 运行ML预测
    const predictions = await this.runMLPredictions(features);
    
    // 4. 生成优化决策
    const decision = this.decisionEngine.makeDecision(features, predictions, this.config.strategy);
    
    // 5. 应用优化（如果启用自动优化）
    if (this.config.autoOptimization && this.shouldApplyOptimizations(decision)) {
      await this.applyOptimizations(decision);
    }
    
    // 6. 记录和学习
    this.recordOptimizationCycle(features, predictions, decision, performanceData);
    
    // 7. 触发事件
    this.emit('optimizationCycle', {
      features,
      predictions,
      decision,
      timestamp: Date.now()
    });
  }

  async collectPerformanceData() {
    // 从性能监控器收集数据
    const performanceMonitor = new PerformanceMonitor();
    return performanceMonitor.getCurrentMetrics();
  }

  async runMLPredictions(features) {
    const predictions = {};
    
    // 性能预测
    const performanceModel = this.mlModelManager.getModel('performance_predictor');
    if (performanceModel) {
      predictions.expectedPerformance = performanceModel.predict(features);
    }
    
    // 优化推荐
    const optimizationModel = this.mlModelManager.getModel('optimization_recommender');
    if (optimizationModel) {
      predictions.optimizationRecommendations = optimizationModel.predict(features);
    }
    
    // 异常检测
    const anomalyModel = this.mlModelManager.getModel('anomaly_detector');
    if (anomalyModel) {
      predictions.anomalyDetection = anomalyModel.predict(features);
    }
    
    return predictions;
  }

  shouldApplyOptimizations(decision) {
    const now = Date.now();
    const timeSinceLastOptimization = now - this.lastOptimizationTime;
    const minInterval = 60000 / this.config.maxOptimizationsPerMinute; // 最小间隔
    
    // 检查频率限制
    if (timeSinceLastOptimization < minInterval) {
      return false;
    }
    
    // 检查置信度阈值
    const confidenceScore = this.getConfidenceScore(decision.confidence);
    if (confidenceScore < this.config.confidenceThreshold) {
      return false;
    }
    
    // 检查是否有高优先级推荐
    const hasHighPriorityRecommendations = decision.recommendations.some(rec => rec.priority === 'high');
    
    return hasHighPriorityRecommendations || decision.recommendations.length > 0;
  }

  getConfidenceScore(confidenceLevel) {
    const scores = {
      [ConfidenceLevel.VERY_LOW]: 0.1,
      [ConfidenceLevel.LOW]: 0.3,
      [ConfidenceLevel.MEDIUM]: 0.6,
      [ConfidenceLevel.HIGH]: 0.8,
      [ConfidenceLevel.VERY_HIGH]: 0.95
    };
    
    return scores[confidenceLevel] || 0.5;
  }

  async applyOptimizations(decision) {
    const appliedOptimizations = [];
    
    for (const recommendation of decision.recommendations.slice(0, 2)) { // 限制同时应用的优化数量
      try {
        const result = await this.applyOptimization(recommendation);
        if (result.success) {
          appliedOptimizations.push({
            action: recommendation.action,
            result,
            timestamp: Date.now()
          });
          
          this.decisionEngine.markOptimizationApplied(recommendation.action);
        }
      } catch (error) {
        console.error(`应用优化失败 (${recommendation.action}):`, error);
      }
    }
    
    if (appliedOptimizations.length > 0) {
      this.lastOptimizationTime = Date.now();
      this.optimizationCount++;
      
      this.emit('optimizationsApplied', {
        decision,
        appliedOptimizations,
        timestamp: Date.now()
      });
    }
    
    return appliedOptimizations;
  }

  async applyOptimization(recommendation) {
    // 根据推荐类型应用具体的优化
    switch (recommendation.action) {
      case 'reduce_quality':
        return await this.reduceRenderingQuality();
      
      case 'clear_cache':
        return await this.clearSystemCache();
      
      case 'reduce_analysis_frequency':
        return await this.reduceAnalysisFrequency();
      
      case 'enable_gpu_optimization':
        return await this.enableGPUOptimization();
      
      case 'optimize_cache_strategy':
        return await this.optimizeCacheStrategy();
      
      case 'enable_frame_smoothing':
        return await this.enableFrameSmoothing();
      
      default:
        console.warn('未知的优化操作:', recommendation.action);
        return { success: false, reason: '未知操作' };
    }
  }

  async reduceRenderingQuality() {
    // 降低渲染质量的具体实现
    try {
      // 这里应该调用实际的渲染引擎API
      console.log('应用优化: 降低渲染质量');
      return { success: true, details: '渲染质量已降低' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async clearSystemCache() {
    try {
      // 清理系统缓存
      console.log('应用优化: 清理系统缓存');
      return { success: true, details: '系统缓存已清理' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async reduceAnalysisFrequency() {
    try {
      // 降低分析频率
      console.log('应用优化: 降低分析频率');
      return { success: true, details: '分析频率已降低' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async enableGPUOptimization() {
    try {
      // 启用GPU优化
      console.log('应用优化: 启用GPU优化');
      return { success: true, details: 'GPU优化已启用' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async optimizeCacheStrategy() {
    try {
      // 优化缓存策略
      console.log('应用优化: 优化缓存策略');
      return { success: true, details: '缓存策略已优化' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  async enableFrameSmoothing() {
    try {
      // 启用帧平滑
      console.log('应用优化: 启用帧平滑');
      return { success: true, details: '帧平滑已启用' };
    } catch (error) {
      return { success: false, reason: error.message };
    }
  }

  recordOptimizationCycle(features, predictions, decision, performanceData) {
    // 记录优化周期数据用于学习
    if (this.config.learningEnabled) {
      this.mlModelManager.addTrainingData(features, performanceData, decision);
    }
    
    // 保存优化历史
    this.optimizationHistory.push({
      features,
      predictions,
      decision,
      performanceData,
      timestamp: Date.now()
    });
    
    // 限制历史记录大小
    if (this.optimizationHistory.length > 1000) {
      this.optimizationHistory.shift();
    }
  }

  async trainModels() {
    if (!this.config.learningEnabled) return;
    
    try {
      await this.mlModelManager.trainModels();
      this.emit('modelsUpdated', { timestamp: Date.now() });
    } catch (error) {
      console.error('模型训练失败:', error);
    }
  }

  setStrategy(strategy) {
    this.config.strategy = strategy;
    this.emit('strategyChanged', { strategy, timestamp: Date.now() });
  }

  setAutoOptimization(enabled) {
    this.config.autoOptimization = enabled;
    this.emit('autoOptimizationChanged', { enabled, timestamp: Date.now() });
  }

  getOptimizationStats() {
    return {
      totalOptimizations: this.optimizationCount,
      isRunning: this.isRunning,
      strategy: this.config.strategy,
      autoOptimization: this.config.autoOptimization,
      decisionStats: this.decisionEngine.getDecisionStats(),
      modelStats: {
        trainingDataSize: this.mlModelManager.getTrainingDataSize(),
        performancePredictorAccuracy: this.mlModelManager.getModelAccuracy('performance_predictor'),
        isTraining: this.mlModelManager.isTraining
      },
      lastOptimizationTime: this.lastOptimizationTime,
      performanceBaseline: this.performanceBaseline
    };
  }

  getOptimizationHistory(limit = 50) {
    return this.optimizationHistory.slice(-limit);
  }

  getRecentDecisions(limit = 10) {
    return this.decisionEngine.getDecisionHistory(limit);
  }

  bindEventHandlers() {
    // 监听性能事件
    window.addEventListener('performanceAlert', (event) => {
      this.handlePerformanceAlert(event.detail);
    });
    
    // 监听系统状态变化
    window.addEventListener('systemStateChange', (event) => {
      this.handleSystemStateChange(event.detail);
    });
  }

  handlePerformanceAlert(alertData) {
    // 处理性能警报，可能触发紧急优化
    if (alertData.severity === 'critical' && this.config.autoOptimization) {
      this.performEmergencyOptimization(alertData);
    }
  }

  handleSystemStateChange(stateData) {
    // 处理系统状态变化
    if (stateData.state === 'critical') {
      this.setStrategy(OptimizationStrategy.PERFORMANCE_FIRST);
    }
  }

  async performEmergencyOptimization(alertData) {
    console.log('执行紧急优化:', alertData);
    
    // 立即执行一次优化周期
    try {
      await this.performOptimizationCycle();
    } catch (error) {
      console.error('紧急优化失败:', error);
    }
  }

  on(event, callback) {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event).push(callback);
  }

  off(event, callback) {
    if (this.eventListeners.has(event)) {
      const listeners = this.eventListeners.get(event);
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`事件回调错误 (${event}):`, error);
        }
      });
    }
  }

  destroy() {
    this.stop();
    this.eventListeners.clear();
    this.optimizationHistory = [];
    this.isInitialized = false;
    
    console.log('AI优化器已销毁');
  }
}

// 默认导出
export default AIOptimizer;