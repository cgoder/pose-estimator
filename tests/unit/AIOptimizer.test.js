/**
 * AI优化器单元测试
 * 测试机器学习驱动的自适应性能优化功能
 */

import { jest } from '@jest/globals';
import {
  OptimizationStrategy,
  LearningMode,
  OptimizationTarget,
  ConfidenceLevel,
  FeatureExtractor,
  MLModelManager,
  OptimizationDecisionEngine,
  AIOptimizer
} from '../../src/components/AIOptimizer.js';

// Mock TensorFlow.js
const mockModel = {
  predict: jest.fn(),
  fit: jest.fn(),
  save: jest.fn(),
  dispose: jest.fn(),
  summary: jest.fn(),
  compile: jest.fn(),
  evaluate: jest.fn()
};

const mockTensor = {
  dataSync: jest.fn(() => [0.8, 0.2, 0.1]),
  dispose: jest.fn(),
  shape: [1, 3],
  dtype: 'float32'
};

global.tf = {
  sequential: jest.fn(() => mockModel),
  layers: {
    dense: jest.fn(),
    dropout: jest.fn(),
    batchNormalization: jest.fn()
  },
  tensor: jest.fn(() => mockTensor),
  tensor2d: jest.fn(() => mockTensor),
  loadLayersModel: jest.fn(() => Promise.resolve(mockModel)),
  train: {
    adam: jest.fn()
  },
  losses: {
    meanSquaredError: jest.fn()
  },
  metrics: {
    meanAbsoluteError: jest.fn()
  },
  dispose: jest.fn(),
  memory: jest.fn(() => ({ numTensors: 0, numDataBuffers: 0 }))
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now()),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000
  }
};

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Mock localStorage
global.localStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn()
};

describe('FeatureExtractor', () => {
  let extractor;

  beforeEach(() => {
    extractor = new FeatureExtractor();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化特征提取器', () => {
      expect(extractor.features).toEqual([]);
      expect(extractor.featureNames).toEqual([]);
      expect(extractor.isInitialized).toBe(true);
    });

    test('应该设置默认特征配置', () => {
      expect(extractor.config.windowSize).toBe(10);
      expect(extractor.config.samplingRate).toBe(1);
      expect(extractor.config.normalizeFeatures).toBe(true);
    });
  });

  describe('性能数据特征提取', () => {
    test('应该从性能数据中提取基础特征', () => {
      const performanceData = {
        fps: [60, 58, 55, 52, 50],
        memoryUsage: [45, 48, 52, 55, 60],
        cpuUsage: [20, 25, 30, 35, 40],
        inferenceTime: [16, 18, 20, 22, 25]
      };

      const features = extractor.extractBasicFeatures(performanceData);

      expect(features).toHaveProperty('fps_mean');
      expect(features).toHaveProperty('fps_std');
      expect(features).toHaveProperty('fps_trend');
      expect(features).toHaveProperty('memory_mean');
      expect(features).toHaveProperty('memory_std');
      expect(features).toHaveProperty('cpu_mean');
      expect(features).toHaveProperty('inference_mean');

      expect(features.fps_mean).toBeCloseTo(55, 1);
      expect(features.memory_mean).toBeCloseTo(52, 1);
    });

    test('应该提取时间序列特征', () => {
      const timeSeries = [60, 58, 55, 52, 50, 48, 45];
      
      const features = extractor.extractTimeSeriesFeatures(timeSeries, 'fps');

      expect(features).toHaveProperty('fps_trend');
      expect(features).toHaveProperty('fps_volatility');
      expect(features).toHaveProperty('fps_autocorr');
      expect(features).toHaveProperty('fps_momentum');

      expect(features.fps_trend).toBeLessThan(0); // 下降趋势
    });

    test('应该提取统计特征', () => {
      const data = [10, 20, 30, 40, 50];
      
      const features = extractor.extractStatisticalFeatures(data, 'test');

      expect(features).toHaveProperty('test_mean');
      expect(features).toHaveProperty('test_median');
      expect(features).toHaveProperty('test_std');
      expect(features).toHaveProperty('test_min');
      expect(features).toHaveProperty('test_max');
      expect(features).toHaveProperty('test_range');
      expect(features).toHaveProperty('test_skewness');
      expect(features).toHaveProperty('test_kurtosis');

      expect(features.test_mean).toBe(30);
      expect(features.test_median).toBe(30);
      expect(features.test_min).toBe(10);
      expect(features.test_max).toBe(50);
    });

    test('应该提取频域特征', () => {
      const signal = [1, 2, 3, 4, 5, 4, 3, 2, 1, 2, 3, 4, 5, 4, 3, 2];
      
      const features = extractor.extractFrequencyFeatures(signal, 'signal');

      expect(features).toHaveProperty('signal_dominant_freq');
      expect(features).toHaveProperty('signal_spectral_centroid');
      expect(features).toHaveProperty('signal_spectral_bandwidth');
      expect(features).toHaveProperty('signal_spectral_rolloff');
    });
  });

  describe('特征工程', () => {
    test('应该创建交互特征', () => {
      const features = {
        fps: 55,
        memory: 60,
        cpu: 40
      };

      const interactions = extractor.createInteractionFeatures(features);

      expect(interactions).toHaveProperty('fps_memory_ratio');
      expect(interactions).toHaveProperty('fps_cpu_ratio');
      expect(interactions).toHaveProperty('memory_cpu_ratio');
      expect(interactions).toHaveProperty('performance_index');

      expect(interactions.fps_memory_ratio).toBeCloseTo(55/60, 2);
    });

    test('应该创建滞后特征', () => {
      const timeSeries = [10, 20, 30, 40, 50];
      
      const lagFeatures = extractor.createLagFeatures(timeSeries, 'value', [1, 2]);

      expect(lagFeatures).toHaveProperty('value_lag1');
      expect(lagFeatures).toHaveProperty('value_lag2');
      expect(lagFeatures).toHaveProperty('value_diff1');
      expect(lagFeatures).toHaveProperty('value_diff2');

      expect(lagFeatures.value_lag1).toBe(40); // 前一个值
      expect(lagFeatures.value_diff1).toBe(10); // 当前值 - 前一个值
    });

    test('应该创建滑动窗口特征', () => {
      const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      
      const windowFeatures = extractor.createWindowFeatures(data, 'value', 3);

      expect(windowFeatures).toHaveProperty('value_window_mean');
      expect(windowFeatures).toHaveProperty('value_window_std');
      expect(windowFeatures).toHaveProperty('value_window_min');
      expect(windowFeatures).toHaveProperty('value_window_max');

      // 最后3个值的平均值: (8+9+10)/3
      expect(windowFeatures.value_window_mean).toBeCloseTo(9, 1);
    });
  });

  describe('特征标准化', () => {
    test('应该标准化特征', () => {
      const features = {
        fps: 55,
        memory: 1000,
        cpu: 40
      };

      const normalized = extractor.normalizeFeatures(features);

      // 验证所有特征值都在合理范围内
      Object.values(normalized).forEach(value => {
        expect(value).toBeGreaterThanOrEqual(-5);
        expect(value).toBeLessThanOrEqual(5);
      });
    });

    test('应该处理缺失值', () => {
      const features = {
        fps: 55,
        memory: null,
        cpu: undefined,
        inference: NaN
      };

      const cleaned = extractor.handleMissingValues(features);

      expect(cleaned.fps).toBe(55);
      expect(cleaned.memory).toBe(0); // 默认填充值
      expect(cleaned.cpu).toBe(0);
      expect(cleaned.inference).toBe(0);
    });
  });

  describe('特征选择', () => {
    test('应该选择重要特征', () => {
      const features = {
        fps_mean: 55,
        fps_std: 5,
        memory_mean: 60,
        memory_std: 10,
        cpu_mean: 40,
        irrelevant_feature: 999
      };

      const selected = extractor.selectImportantFeatures(features);

      expect(Object.keys(selected).length).toBeLessThan(Object.keys(features).length);
      expect(selected).toHaveProperty('fps_mean');
      expect(selected).toHaveProperty('memory_mean');
      expect(selected).not.toHaveProperty('irrelevant_feature');
    });

    test('应该计算特征重要性', () => {
      const features = [
        { fps: 60, memory: 40, target: 1 },
        { fps: 50, memory: 60, target: 0 },
        { fps: 55, memory: 50, target: 1 },
        { fps: 45, memory: 70, target: 0 }
      ];

      const importance = extractor.calculateFeatureImportance(features);

      expect(importance).toHaveProperty('fps');
      expect(importance).toHaveProperty('memory');
      expect(importance.fps).toBeGreaterThan(0);
      expect(importance.memory).toBeGreaterThan(0);
    });
  });
});

describe('MLModelManager', () => {
  let modelManager;

  beforeEach(() => {
    modelManager = new MLModelManager();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化模型管理器', () => {
      expect(modelManager.models).toBeInstanceOf(Map);
      expect(modelManager.isInitialized).toBe(true);
      expect(modelManager.trainingHistory).toEqual([]);
    });

    test('应该创建默认模型', () => {
      expect(modelManager.models.has('performance_predictor')).toBe(true);
      expect(modelManager.models.has('optimization_recommender')).toBe(true);
      expect(modelManager.models.has('anomaly_detector')).toBe(true);
    });
  });

  describe('模型创建', () => {
    test('应该创建性能预测模型', () => {
      const model = modelManager.createPerformancePredictionModel({
        inputDim: 10,
        hiddenLayers: [64, 32],
        outputDim: 4
      });

      expect(tf.sequential).toHaveBeenCalled();
      expect(model).toBe(mockModel);
    });

    test('应该创建优化推荐模型', () => {
      const model = modelManager.createOptimizationRecommendationModel({
        inputDim: 15,
        numActions: 8,
        hiddenLayers: [128, 64, 32]
      });

      expect(tf.sequential).toHaveBeenCalled();
      expect(model).toBe(mockModel);
    });

    test('应该创建异常检测模型', () => {
      const model = modelManager.createAnomalyDetectionModel({
        inputDim: 12,
        encodingDim: 6,
        hiddenLayers: [32, 16]
      });

      expect(tf.sequential).toHaveBeenCalled();
      expect(model).toBe(mockModel);
    });
  });

  describe('模型训练', () => {
    test('应该训练性能预测模型', async () => {
      const trainingData = {
        features: [[1, 2, 3], [4, 5, 6], [7, 8, 9]],
        targets: [[60, 40, 20, 16], [55, 45, 25, 18], [50, 50, 30, 20]]
      };

      const result = await modelManager.trainPerformancePredictionModel(trainingData);

      expect(tf.tensor2d).toHaveBeenCalledWith(trainingData.features);
      expect(tf.tensor2d).toHaveBeenCalledWith(trainingData.targets);
      expect(mockModel.fit).toHaveBeenCalled();
      expect(result).toHaveProperty('loss');
      expect(result).toHaveProperty('accuracy');
    });

    test('应该训练优化推荐模型', async () => {
      const trainingData = {
        states: [[1, 2, 3], [4, 5, 6]],
        actions: [0, 1],
        rewards: [0.8, 0.6]
      };

      const result = await modelManager.trainOptimizationRecommendationModel(trainingData);

      expect(mockModel.fit).toHaveBeenCalled();
      expect(result).toHaveProperty('loss');
    });

    test('应该训练异常检测模型', async () => {
      const normalData = {
        features: [[1, 2, 3], [1.1, 2.1, 3.1], [0.9, 1.9, 2.9]]
      };

      const result = await modelManager.trainAnomalyDetectionModel(normalData);

      expect(mockModel.fit).toHaveBeenCalled();
      expect(result).toHaveProperty('loss');
    });
  });

  describe('模型预测', () => {
    test('应该预测性能指标', async () => {
      const features = [55, 60, 40, 18, 0.8, 0.6];
      
      mockModel.predict.mockReturnValue(mockTensor);
      mockTensor.dataSync.mockReturnValue([58, 55, 35, 16]);

      const prediction = await modelManager.predictPerformance(features);

      expect(tf.tensor2d).toHaveBeenCalledWith([features]);
      expect(mockModel.predict).toHaveBeenCalled();
      expect(prediction).toEqual({
        fps: 58,
        memoryUsage: 55,
        cpuUsage: 35,
        inferenceTime: 16
      });
    });

    test('应该推荐优化策略', async () => {
      const state = [55, 60, 40, 18, 0.8];
      
      mockModel.predict.mockReturnValue(mockTensor);
      mockTensor.dataSync.mockReturnValue([0.8, 0.2, 0.1, 0.05, 0.03, 0.02, 0.01, 0.01]);

      const recommendation = await modelManager.recommendOptimization(state);

      expect(recommendation).toHaveProperty('strategy');
      expect(recommendation).toHaveProperty('confidence');
      expect(recommendation).toHaveProperty('expectedImprovement');
      expect(recommendation.confidence).toBeGreaterThan(0);
    });

    test('应该检测异常', async () => {
      const features = [100, 200, 300]; // 异常值
      
      mockModel.predict.mockReturnValue(mockTensor);
      mockTensor.dataSync.mockReturnValue([150, 250, 350]); // 重构值

      const anomalyScore = await modelManager.detectAnomaly(features);

      expect(anomalyScore).toBeGreaterThan(0);
      expect(anomalyScore).toBeLessThanOrEqual(1);
    });
  });

  describe('模型管理', () => {
    test('应该保存模型', async () => {
      await modelManager.saveModel('performance_predictor', '/models/predictor');

      expect(mockModel.save).toHaveBeenCalledWith('/models/predictor');
    });

    test('应该加载模型', async () => {
      await modelManager.loadModel('performance_predictor', '/models/predictor');

      expect(tf.loadLayersModel).toHaveBeenCalledWith('/models/predictor');
    });

    test('应该评估模型性能', async () => {
      const testData = {
        features: [[1, 2, 3], [4, 5, 6]],
        targets: [[60, 40], [55, 45]]
      };

      const evaluation = await modelManager.evaluateModel('performance_predictor', testData);

      expect(mockModel.evaluate).toHaveBeenCalled();
      expect(evaluation).toHaveProperty('loss');
      expect(evaluation).toHaveProperty('accuracy');
    });
  });

  describe('在线学习', () => {
    test('应该支持增量学习', async () => {
      const newData = {
        features: [[1, 2, 3]],
        targets: [[60, 40, 20, 16]]
      };

      await modelManager.incrementalTrain('performance_predictor', newData);

      expect(mockModel.fit).toHaveBeenCalled();
    });

    test('应该更新模型权重', async () => {
      const feedback = {
        prediction: [58, 55, 35, 16],
        actual: [60, 50, 30, 15],
        features: [55, 60, 40, 18]
      };

      await modelManager.updateWithFeedback('performance_predictor', feedback);

      expect(mockModel.fit).toHaveBeenCalled();
    });
  });
});

describe('OptimizationDecisionEngine', () => {
  let decisionEngine;
  let mockModelManager;

  beforeEach(() => {
    mockModelManager = {
      recommendOptimization: jest.fn(),
      predictPerformance: jest.fn(),
      detectAnomaly: jest.fn()
    };
    
    decisionEngine = new OptimizationDecisionEngine(mockModelManager);
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化决策引擎', () => {
      expect(decisionEngine.modelManager).toBe(mockModelManager);
      expect(decisionEngine.decisions).toEqual([]);
      expect(decisionEngine.isInitialized).toBe(true);
    });

    test('应该设置默认决策配置', () => {
      expect(decisionEngine.config.minConfidence).toBe(0.7);
      expect(decisionEngine.config.maxDecisionsPerCycle).toBe(3);
      expect(decisionEngine.config.cooldownPeriod).toBe(5000);
    });
  });

  describe('决策生成', () => {
    test('应该生成优化决策', async () => {
      const currentState = {
        fps: 45,
        memoryUsage: 75,
        cpuUsage: 60,
        inferenceTime: 25
      };

      const performanceHistory = [
        { fps: 50, memoryUsage: 70, cpuUsage: 55, inferenceTime: 22 },
        { fps: 48, memoryUsage: 72, cpuUsage: 58, inferenceTime: 24 },
        { fps: 45, memoryUsage: 75, cpuUsage: 60, inferenceTime: 25 }
      ];

      mockModelManager.recommendOptimization.mockResolvedValue({
        strategy: OptimizationStrategy.REDUCE_QUALITY,
        confidence: 0.85,
        expectedImprovement: 0.15
      });

      const decision = await decisionEngine.generateDecision(currentState, performanceHistory);

      expect(decision).toHaveProperty('id');
      expect(decision).toHaveProperty('strategy');
      expect(decision).toHaveProperty('confidence');
      expect(decision).toHaveProperty('expectedImprovement');
      expect(decision).toHaveProperty('timestamp');
      expect(decision.strategy).toBe(OptimizationStrategy.REDUCE_QUALITY);
      expect(decision.confidence).toBe(0.85);
    });

    test('应该拒绝低置信度的决策', async () => {
      const currentState = { fps: 55, memoryUsage: 50, cpuUsage: 30, inferenceTime: 18 };
      const performanceHistory = [];

      mockModelManager.recommendOptimization.mockResolvedValue({
        strategy: OptimizationStrategy.INCREASE_QUALITY,
        confidence: 0.5, // 低于最小置信度
        expectedImprovement: 0.1
      });

      const decision = await decisionEngine.generateDecision(currentState, performanceHistory);

      expect(decision).toBeNull();
    });

    test('应该考虑冷却期', async () => {
      const currentState = { fps: 45, memoryUsage: 75, cpuUsage: 60, inferenceTime: 25 };
      const performanceHistory = [];

      // 添加最近的决策
      decisionEngine.decisions.push({
        id: 'test-decision',
        timestamp: Date.now() - 1000, // 1秒前
        strategy: OptimizationStrategy.REDUCE_QUALITY
      });

      mockModelManager.recommendOptimization.mockResolvedValue({
        strategy: OptimizationStrategy.OPTIMIZE_MEMORY,
        confidence: 0.85,
        expectedImprovement: 0.15
      });

      const decision = await decisionEngine.generateDecision(currentState, performanceHistory);

      expect(decision).toBeNull(); // 应该被冷却期阻止
    });
  });

  describe('决策评估', () => {
    test('应该评估决策效果', () => {
      const decision = {
        id: 'test-decision',
        strategy: OptimizationStrategy.REDUCE_QUALITY,
        expectedImprovement: 0.15,
        timestamp: Date.now() - 5000
      };

      const beforeState = { fps: 45, memoryUsage: 75, cpuUsage: 60, inferenceTime: 25 };
      const afterState = { fps: 55, memoryUsage: 70, cpuUsage: 55, inferenceTime: 20 };

      const evaluation = decisionEngine.evaluateDecision(decision, beforeState, afterState);

      expect(evaluation).toHaveProperty('actualImprovement');
      expect(evaluation).toHaveProperty('effectiveness');
      expect(evaluation).toHaveProperty('success');
      expect(evaluation.actualImprovement).toBeGreaterThan(0);
      expect(evaluation.success).toBe(true);
    });

    test('应该识别失败的决策', () => {
      const decision = {
        id: 'test-decision',
        strategy: OptimizationStrategy.INCREASE_QUALITY,
        expectedImprovement: 0.1,
        timestamp: Date.now() - 5000
      };

      const beforeState = { fps: 55, memoryUsage: 50, cpuUsage: 30, inferenceTime: 18 };
      const afterState = { fps: 45, memoryUsage: 60, cpuUsage: 40, inferenceTime: 22 }; // 性能下降

      const evaluation = decisionEngine.evaluateDecision(decision, beforeState, afterState);

      expect(evaluation.actualImprovement).toBeLessThan(0);
      expect(evaluation.success).toBe(false);
    });
  });

  describe('决策历史管理', () => {
    test('应该记录决策历史', () => {
      const decision = {
        id: 'test-decision',
        strategy: OptimizationStrategy.REDUCE_QUALITY,
        confidence: 0.85
      };

      decisionEngine.recordDecision(decision);

      expect(decisionEngine.decisions).toContain(decision);
    });

    test('应该限制历史记录数量', () => {
      decisionEngine.config.maxHistorySize = 3;

      for (let i = 0; i < 5; i++) {
        decisionEngine.recordDecision({
          id: `decision-${i}`,
          strategy: OptimizationStrategy.REDUCE_QUALITY,
          timestamp: Date.now() + i
        });
      }

      expect(decisionEngine.decisions.length).toBe(3);
      expect(decisionEngine.decisions[0].id).toBe('decision-2'); // 最旧的被移除
    });

    test('应该获取决策统计', () => {
      const decisions = [
        { strategy: OptimizationStrategy.REDUCE_QUALITY, success: true },
        { strategy: OptimizationStrategy.REDUCE_QUALITY, success: false },
        { strategy: OptimizationStrategy.OPTIMIZE_MEMORY, success: true },
        { strategy: OptimizationStrategy.INCREASE_QUALITY, success: true }
      ];

      decisions.forEach(decision => decisionEngine.recordDecision(decision));

      const stats = decisionEngine.getDecisionStatistics();

      expect(stats).toHaveProperty('totalDecisions');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('strategyDistribution');
      expect(stats.totalDecisions).toBe(4);
      expect(stats.successRate).toBe(0.75);
    });
  });
});

describe('AIOptimizer', () => {
  let optimizer;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    optimizer = new AIOptimizer(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    optimizer.destroy();
  });

  describe('初始化', () => {
    test('应该正确初始化AI优化器', () => {
      expect(optimizer.container).toBe(mockContainer);
      expect(optimizer.featureExtractor).toBeInstanceOf(FeatureExtractor);
      expect(optimizer.modelManager).toBeInstanceOf(MLModelManager);
      expect(optimizer.decisionEngine).toBeInstanceOf(OptimizationDecisionEngine);
      expect(optimizer.isInitialized).toBe(true);
    });

    test('应该设置默认配置', () => {
      expect(optimizer.config.optimizationInterval).toBe(5000);
      expect(optimizer.config.learningMode).toBe(LearningMode.ONLINE);
      expect(optimizer.config.target).toBe(OptimizationTarget.BALANCED);
      expect(optimizer.config.adaptiveThresholds).toBe(true);
    });
  });

  describe('优化循环', () => {
    test('应该启动优化循环', () => {
      optimizer.startOptimization();

      expect(optimizer.isOptimizing).toBe(true);
      expect(optimizer.optimizationInterval).toBeDefined();
    });

    test('应该停止优化循环', () => {
      optimizer.startOptimization();
      optimizer.stopOptimization();

      expect(optimizer.isOptimizing).toBe(false);
      expect(optimizer.optimizationInterval).toBeNull();
    });

    test('应该执行优化周期', async () => {
      const mockPerformanceData = {
        fps: 45,
        memoryUsage: 75,
        cpuUsage: 60,
        inferenceTime: 25
      };

      const collectDataSpy = jest.spyOn(optimizer, 'collectPerformanceData')
        .mockResolvedValue(mockPerformanceData);
      const optimizeSpy = jest.spyOn(optimizer, '_performOptimizationCycle')
        .mockResolvedValue();

      await optimizer._performOptimizationCycle();

      expect(collectDataSpy).toHaveBeenCalled();
    });
  });

  describe('性能数据收集', () => {
    test('应该收集系统性能数据', async () => {
      const performanceData = await optimizer.collectPerformanceData();

      expect(performanceData).toHaveProperty('fps');
      expect(performanceData).toHaveProperty('memoryUsage');
      expect(performanceData).toHaveProperty('cpuUsage');
      expect(performanceData).toHaveProperty('inferenceTime');
      expect(performanceData).toHaveProperty('timestamp');
    });

    test('应该收集GPU性能数据', async () => {
      // Mock WebGL context
      const mockWebGLContext = {
        getExtension: jest.fn().mockReturnValue({
          getParameter: jest.fn().mockReturnValue('NVIDIA GeForce RTX 3080')
        }),
        getParameter: jest.fn().mockReturnValue(4096)
      };

      global.HTMLCanvasElement.prototype.getContext = jest.fn()
        .mockReturnValue(mockWebGLContext);

      const gpuData = await optimizer.collectGPUPerformanceData();

      expect(gpuData).toHaveProperty('renderer');
      expect(gpuData).toHaveProperty('memoryInfo');
    });

    test('应该处理数据收集错误', async () => {
      // Mock performance API error
      global.performance.now = jest.fn().mockImplementation(() => {
        throw new Error('Performance API error');
      });

      const performanceData = await optimizer.collectPerformanceData();

      expect(performanceData).toHaveProperty('error');
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('特征提取和ML预测', () => {
    test('应该提取性能特征', () => {
      const performanceHistory = [
        { fps: 60, memoryUsage: 40, cpuUsage: 20, inferenceTime: 16 },
        { fps: 55, memoryUsage: 45, cpuUsage: 25, inferenceTime: 18 },
        { fps: 50, memoryUsage: 50, cpuUsage: 30, inferenceTime: 20 }
      ];

      const features = optimizer.extractFeatures(performanceHistory);

      expect(features).toHaveProperty('fps_mean');
      expect(features).toHaveProperty('fps_trend');
      expect(features).toHaveProperty('memory_mean');
      expect(features).toHaveProperty('cpu_mean');
      expect(features).toHaveProperty('performance_index');
    });

    test('应该进行性能预测', async () => {
      const features = {
        fps_mean: 55,
        memory_mean: 50,
        cpu_mean: 30,
        inference_mean: 18
      };

      const mockPrediction = {
        fps: 58,
        memoryUsage: 48,
        cpuUsage: 28,
        inferenceTime: 17
      };

      optimizer.modelManager.predictPerformance = jest.fn()
        .mockResolvedValue(mockPrediction);

      const prediction = await optimizer.predictPerformance(features);

      expect(prediction).toEqual(mockPrediction);
      expect(optimizer.modelManager.predictPerformance).toHaveBeenCalledWith(
        expect.any(Array)
      );
    });
  });

  describe('优化策略应用', () => {
    test('应该应用质量降低策略', async () => {
      const strategy = {
        type: OptimizationStrategy.REDUCE_QUALITY,
        parameters: {
          qualityReduction: 0.2,
          targetFPS: 60
        }
      };

      const applySpy = jest.spyOn(optimizer, 'applyOptimization')
        .mockResolvedValue({ success: true });

      const result = await optimizer.applyOptimization(strategy);

      expect(result.success).toBe(true);
    });

    test('应该应用内存优化策略', async () => {
      const strategy = {
        type: OptimizationStrategy.OPTIMIZE_MEMORY,
        parameters: {
          garbageCollection: true,
          cacheOptimization: true
        }
      };

      const result = await optimizer.applyOptimization(strategy);

      expect(result).toHaveProperty('success');
      expect(result).toHaveProperty('appliedChanges');
    });

    test('应该处理优化应用失败', async () => {
      const strategy = {
        type: 'INVALID_STRATEGY',
        parameters: {}
      };

      const result = await optimizer.applyOptimization(strategy);

      expect(result.success).toBe(false);
      expect(result).toHaveProperty('error');
    });
  });

  describe('自适应学习', () => {
    test('应该根据反馈更新模型', async () => {
      const feedback = {
        decision: {
          id: 'test-decision',
          strategy: OptimizationStrategy.REDUCE_QUALITY,
          expectedImprovement: 0.15
        },
        beforeState: { fps: 45, memoryUsage: 75 },
        afterState: { fps: 55, memoryUsage: 70 },
        success: true
      };

      const updateSpy = jest.spyOn(optimizer.modelManager, 'updateWithFeedback')
        .mockResolvedValue();

      await optimizer.updateModelsWithFeedback(feedback);

      expect(updateSpy).toHaveBeenCalled();
    });

    test('应该调整优化阈值', () => {
      const performanceHistory = [
        { fps: 45, memoryUsage: 75, cpuUsage: 60 },
        { fps: 50, memoryUsage: 70, cpuUsage: 55 },
        { fps: 55, memoryUsage: 65, cpuUsage: 50 }
      ];

      optimizer.adaptThresholds(performanceHistory);

      expect(optimizer.config.thresholds).toBeDefined();
      expect(optimizer.config.thresholds.fps.warning).toBeGreaterThan(0);
    });
  });

  describe('配置管理', () => {
    test('应该更新优化配置', () => {
      const newConfig = {
        optimizationInterval: 3000,
        learningMode: LearningMode.BATCH,
        target: OptimizationTarget.PERFORMANCE,
        aggressiveness: 0.8
      };

      optimizer.updateConfig(newConfig);

      expect(optimizer.config.optimizationInterval).toBe(3000);
      expect(optimizer.config.learningMode).toBe(LearningMode.BATCH);
      expect(optimizer.config.target).toBe(OptimizationTarget.PERFORMANCE);
      expect(optimizer.config.aggressiveness).toBe(0.8);
    });

    test('应该验证配置参数', () => {
      const invalidConfig = {
        optimizationInterval: -1000, // 无效值
        aggressiveness: 2.0 // 超出范围
      };

      expect(() => {
        optimizer.updateConfig(invalidConfig);
      }).toThrow();
    });
  });

  describe('统计和监控', () => {
    test('应该获取优化统计', () => {
      // 添加一些历史数据
      optimizer.optimizationHistory = [
        { strategy: OptimizationStrategy.REDUCE_QUALITY, success: true, improvement: 0.15 },
        { strategy: OptimizationStrategy.OPTIMIZE_MEMORY, success: true, improvement: 0.10 },
        { strategy: OptimizationStrategy.INCREASE_QUALITY, success: false, improvement: -0.05 }
      ];

      const stats = optimizer.getOptimizationStatistics();

      expect(stats).toHaveProperty('totalOptimizations');
      expect(stats).toHaveProperty('successRate');
      expect(stats).toHaveProperty('averageImprovement');
      expect(stats).toHaveProperty('strategyEffectiveness');
      expect(stats.totalOptimizations).toBe(3);
      expect(stats.successRate).toBeCloseTo(0.67, 2);
    });

    test('应该导出优化历史', () => {
      optimizer.optimizationHistory = [
        { timestamp: Date.now(), strategy: OptimizationStrategy.REDUCE_QUALITY, success: true }
      ];

      const exportData = optimizer.exportOptimizationHistory();

      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('history');
      expect(exportData).toHaveProperty('statistics');
      expect(exportData.history.length).toBe(1);
    });
  });

  describe('事件处理', () => {
    test('应该触发优化事件', () => {
      const mockCallback = jest.fn();
      optimizer.addEventListener('optimizationApplied', mockCallback);

      optimizer._emitEvent('optimizationApplied', {
        strategy: OptimizationStrategy.REDUCE_QUALITY,
        success: true
      });

      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          strategy: OptimizationStrategy.REDUCE_QUALITY,
          success: true
        })
      );
    });

    test('应该移除事件监听器', () => {
      const mockCallback = jest.fn();
      optimizer.addEventListener('optimizationApplied', mockCallback);
      optimizer.removeEventListener('optimizationApplied', mockCallback);

      optimizer._emitEvent('optimizationApplied', { test: true });

      expect(mockCallback).not.toHaveBeenCalled();
    });
  });

  describe('资源管理', () => {
    test('应该正确清理资源', () => {
      optimizer.startOptimization();
      
      const disposeSpy = jest.spyOn(tf, 'dispose');
      
      optimizer.destroy();

      expect(optimizer.isOptimizing).toBe(false);
      expect(optimizer.optimizationInterval).toBeNull();
      expect(optimizer.isInitialized).toBe(false);
    });

    test('应该清理TensorFlow资源', () => {
      optimizer.destroy();

      expect(tf.dispose).toHaveBeenCalled();
    });
  });
});

// 集成测试
describe('AIOptimizer 集成测试', () => {
  let optimizer;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    optimizer = new AIOptimizer(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    optimizer.destroy();
  });

  test('应该完整地执行优化流程', async () => {
    // 配置优化器
    optimizer.updateConfig({
      optimizationInterval: 100,
      target: OptimizationTarget.PERFORMANCE,
      learningMode: LearningMode.ONLINE
    });

    // Mock性能数据
    const mockPerformanceData = {
      fps: 45,
      memoryUsage: 75,
      cpuUsage: 60,
      inferenceTime: 25,
      timestamp: Date.now()
    };

    jest.spyOn(optimizer, 'collectPerformanceData')
      .mockResolvedValue(mockPerformanceData);

    // Mock ML预测
    optimizer.modelManager.recommendOptimization = jest.fn()
      .mockResolvedValue({
        strategy: OptimizationStrategy.REDUCE_QUALITY,
        confidence: 0.85,
        expectedImprovement: 0.15
      });

    // Mock优化应用
    jest.spyOn(optimizer, 'applyOptimization')
      .mockResolvedValue({
        success: true,
        appliedChanges: ['quality_reduction']
      });

    // 启动优化
    optimizer.startOptimization();

    // 等待一个优化周期
    await new Promise(resolve => setTimeout(resolve, 150));

    // 验证优化流程
    expect(optimizer.collectPerformanceData).toHaveBeenCalled();
    expect(optimizer.modelManager.recommendOptimization).toHaveBeenCalled();
    expect(optimizer.applyOptimization).toHaveBeenCalled();

    // 验证历史记录
    expect(optimizer.optimizationHistory.length).toBeGreaterThan(0);

    optimizer.stopOptimization();
  });

  test('应该处理复杂的性能场景', async () => {
    const performanceScenarios = [
      { fps: 60, memoryUsage: 40, cpuUsage: 20, inferenceTime: 16 }, // 正常
      { fps: 45, memoryUsage: 75, cpuUsage: 60, inferenceTime: 25 }, // 性能下降
      { fps: 30, memoryUsage: 90, cpuUsage: 80, inferenceTime: 35 }, // 严重问题
      { fps: 55, memoryUsage: 50, cpuUsage: 35, inferenceTime: 18 }  // 恢复
    ];

    let scenarioIndex = 0;
    jest.spyOn(optimizer, 'collectPerformanceData')
      .mockImplementation(() => {
        const data = performanceScenarios[scenarioIndex % performanceScenarios.length];
        scenarioIndex++;
        return Promise.resolve({ ...data, timestamp: Date.now() });
      });

    // Mock不同的优化策略
    optimizer.modelManager.recommendOptimization = jest.fn()
      .mockImplementation((state) => {
        if (state[0] < 50) { // fps < 50
          return Promise.resolve({
            strategy: OptimizationStrategy.REDUCE_QUALITY,
            confidence: 0.9,
            expectedImprovement: 0.2
          });
        } else {
          return Promise.resolve({
            strategy: OptimizationStrategy.INCREASE_QUALITY,
            confidence: 0.7,
            expectedImprovement: 0.1
          });
        }
      });

    jest.spyOn(optimizer, 'applyOptimization')
      .mockResolvedValue({ success: true });

    // 运行多个优化周期
    for (let i = 0; i < 4; i++) {
      await optimizer._performOptimizationCycle();
    }

    // 验证不同策略被应用
    const appliedStrategies = optimizer.optimizationHistory.map(h => h.strategy);
    expect(appliedStrategies).toContain(OptimizationStrategy.REDUCE_QUALITY);
    expect(appliedStrategies).toContain(OptimizationStrategy.INCREASE_QUALITY);

    // 验证统计信息
    const stats = optimizer.getOptimizationStatistics();
    expect(stats.totalOptimizations).toBe(4);
    expect(stats.strategyEffectiveness).toBeDefined();
  });
});