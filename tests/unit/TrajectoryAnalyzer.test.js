/**
 * 轨迹分析器单元测试
 * 测试运动轨迹分析、模式识别和预测功能
 */

import { jest } from '@jest/globals';
import {
  TrajectoryType,
  MovementPattern,
  AnalysisDimension,
  TrajectoryQuality,
  Point3D,
  Trajectory,
  TrajectoryPatternRecognizer,
  TrajectoryPredictor,
  TrajectoryAnalyzer
} from '../../src/components/analyzers/TrajectoryAnalyzer.js';

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
  log: jest.fn()
};

// Mock performance API
global.performance = {
  now: jest.fn(() => Date.now())
};

describe('Point3D', () => {
  describe('初始化', () => {
    test('应该正确创建3D点', () => {
      const point = new Point3D(1, 2, 3, Date.now());
      
      expect(point.x).toBe(1);
      expect(point.y).toBe(2);
      expect(point.z).toBe(3);
      expect(point.timestamp).toBeDefined();
    });

    test('应该设置默认时间戳', () => {
      const point = new Point3D(1, 2, 3);
      
      expect(point.timestamp).toBeDefined();
      expect(typeof point.timestamp).toBe('number');
    });
  });

  describe('距离计算', () => {
    test('应该计算到另一点的距离', () => {
      const point1 = new Point3D(0, 0, 0);
      const point2 = new Point3D(3, 4, 0);
      
      const distance = point1.distanceTo(point2);
      
      expect(distance).toBe(5); // 3-4-5三角形
    });

    test('应该计算到原点的距离', () => {
      const point = new Point3D(1, 1, 1);
      
      const distance = point.magnitude();
      
      expect(distance).toBeCloseTo(Math.sqrt(3), 5);
    });
  });

  describe('向量运算', () => {
    test('应该计算向量加法', () => {
      const point1 = new Point3D(1, 2, 3);
      const point2 = new Point3D(4, 5, 6);
      
      const result = point1.add(point2);
      
      expect(result.x).toBe(5);
      expect(result.y).toBe(7);
      expect(result.z).toBe(9);
    });

    test('应该计算向量减法', () => {
      const point1 = new Point3D(4, 5, 6);
      const point2 = new Point3D(1, 2, 3);
      
      const result = point1.subtract(point2);
      
      expect(result.x).toBe(3);
      expect(result.y).toBe(3);
      expect(result.z).toBe(3);
    });

    test('应该计算标量乘法', () => {
      const point = new Point3D(1, 2, 3);
      
      const result = point.multiply(2);
      
      expect(result.x).toBe(2);
      expect(result.y).toBe(4);
      expect(result.z).toBe(6);
    });

    test('应该计算点积', () => {
      const point1 = new Point3D(1, 2, 3);
      const point2 = new Point3D(4, 5, 6);
      
      const dotProduct = point1.dot(point2);
      
      expect(dotProduct).toBe(32); // 1*4 + 2*5 + 3*6
    });

    test('应该计算叉积', () => {
      const point1 = new Point3D(1, 0, 0);
      const point2 = new Point3D(0, 1, 0);
      
      const crossProduct = point1.cross(point2);
      
      expect(crossProduct.x).toBe(0);
      expect(crossProduct.y).toBe(0);
      expect(crossProduct.z).toBe(1);
    });
  });

  describe('向量标准化', () => {
    test('应该标准化向量', () => {
      const point = new Point3D(3, 4, 0);
      
      const normalized = point.normalize();
      
      expect(normalized.magnitude()).toBeCloseTo(1, 5);
      expect(normalized.x).toBeCloseTo(0.6, 5);
      expect(normalized.y).toBeCloseTo(0.8, 5);
    });

    test('应该处理零向量', () => {
      const point = new Point3D(0, 0, 0);
      
      const normalized = point.normalize();
      
      expect(normalized.x).toBe(0);
      expect(normalized.y).toBe(0);
      expect(normalized.z).toBe(0);
    });
  });
});

describe('Trajectory', () => {
  let trajectory;

  beforeEach(() => {
    trajectory = new Trajectory('test-trajectory', TrajectoryType.HAND);
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化轨迹', () => {
      expect(trajectory.id).toBe('test-trajectory');
      expect(trajectory.type).toBe(TrajectoryType.HAND);
      expect(trajectory.points).toEqual([]);
      expect(trajectory.isActive).toBe(true);
    });

    test('应该设置默认配置', () => {
      expect(trajectory.maxPoints).toBe(1000);
      expect(trajectory.smoothingWindow).toBe(5);
      expect(trajectory.qualityThreshold).toBe(0.7);
    });
  });

  describe('点管理', () => {
    test('应该添加轨迹点', () => {
      const point = new Point3D(1, 2, 3);
      
      trajectory.addPoint(point);
      
      expect(trajectory.points).toHaveLength(1);
      expect(trajectory.points[0]).toBe(point);
      expect(trajectory.length).toBe(1);
    });

    test('应该限制轨迹点数量', () => {
      trajectory.setMaxPoints(3);
      
      for (let i = 0; i < 5; i++) {
        trajectory.addPoint(new Point3D(i, i, i));
      }
      
      expect(trajectory.points).toHaveLength(3);
      expect(trajectory.points[0].x).toBe(2); // 最旧的点被移除
    });

    test('应该获取最近的点', () => {
      trajectory.addPoint(new Point3D(1, 1, 1));
      trajectory.addPoint(new Point3D(2, 2, 2));
      trajectory.addPoint(new Point3D(3, 3, 3));
      
      const recentPoints = trajectory.getRecentPoints(2);
      
      expect(recentPoints).toHaveLength(2);
      expect(recentPoints[0].x).toBe(2);
      expect(recentPoints[1].x).toBe(3);
    });

    test('应该获取时间范围内的点', () => {
      const now = Date.now();
      trajectory.addPoint(new Point3D(1, 1, 1, now - 3000));
      trajectory.addPoint(new Point3D(2, 2, 2, now - 2000));
      trajectory.addPoint(new Point3D(3, 3, 3, now - 1000));
      trajectory.addPoint(new Point3D(4, 4, 4, now));
      
      const rangePoints = trajectory.getPointsInTimeRange(now - 2500, now - 500);
      
      expect(rangePoints).toHaveLength(2);
      expect(rangePoints[0].x).toBe(2);
      expect(rangePoints[1].x).toBe(3);
    });
  });

  describe('轨迹指标', () => {
    beforeEach(() => {
      // 添加测试数据
      trajectory.addPoint(new Point3D(0, 0, 0, 1000));
      trajectory.addPoint(new Point3D(1, 0, 0, 1100));
      trajectory.addPoint(new Point3D(2, 0, 0, 1200));
      trajectory.addPoint(new Point3D(3, 0, 0, 1300));
    });

    test('应该计算轨迹长度', () => {
      const length = trajectory.getTotalLength();
      
      expect(length).toBe(3); // 3个单位长度
    });

    test('应该计算平均速度', () => {
      const avgSpeed = trajectory.getAverageSpeed();
      
      expect(avgSpeed).toBeCloseTo(10, 1); // 1单位/100ms = 10单位/s
    });

    test('应该计算最大速度', () => {
      const maxSpeed = trajectory.getMaxSpeed();
      
      expect(maxSpeed).toBeCloseTo(10, 1);
    });

    test('应该计算平均加速度', () => {
      const avgAcceleration = trajectory.getAverageAcceleration();
      
      expect(avgAcceleration).toBeCloseTo(0, 1); // 匀速运动，加速度为0
    });

    test('应该计算轨迹持续时间', () => {
      const duration = trajectory.getDuration();
      
      expect(duration).toBe(300); // 1300 - 1000 = 300ms
    });
  });

  describe('轨迹质量', () => {
    test('应该评估轨迹质量', () => {
      // 添加高质量轨迹数据
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, Math.sin(i * 0.1), 0, 1000 + i * 100));
      }
      
      const quality = trajectory.assessQuality();
      
      expect(quality).toHaveProperty('score');
      expect(quality).toHaveProperty('level');
      expect(quality).toHaveProperty('factors');
      expect(quality.score).toBeGreaterThan(0);
      expect(quality.score).toBeLessThanOrEqual(1);
    });

    test('应该识别低质量轨迹', () => {
      // 添加噪声数据
      for (let i = 0; i < 5; i++) {
        trajectory.addPoint(new Point3D(
          Math.random() * 100,
          Math.random() * 100,
          Math.random() * 100,
          1000 + i * 10 // 时间间隔很短
        ));
      }
      
      const quality = trajectory.assessQuality();
      
      expect(quality.level).toBe(TrajectoryQuality.POOR);
    });
  });

  describe('轨迹平滑', () => {
    test('应该平滑轨迹', () => {
      // 添加带噪声的数据
      trajectory.addPoint(new Point3D(0, 0, 0));
      trajectory.addPoint(new Point3D(1, 5, 0)); // 噪声点
      trajectory.addPoint(new Point3D(2, 0, 0));
      trajectory.addPoint(new Point3D(3, 0, 0));
      trajectory.addPoint(new Point3D(4, 0, 0));
      
      const originalY = trajectory.points[1].y;
      
      trajectory.smooth();
      
      const smoothedY = trajectory.points[1].y;
      
      expect(smoothedY).toBeLessThan(originalY); // 噪声应该被减少
    });

    test('应该保持轨迹的基本形状', () => {
      // 添加线性轨迹
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, i, 0));
      }
      
      const originalSlope = (trajectory.points[9].y - trajectory.points[0].y) / 
                           (trajectory.points[9].x - trajectory.points[0].x);
      
      trajectory.smooth();
      
      const smoothedSlope = (trajectory.points[9].y - trajectory.points[0].y) / 
                           (trajectory.points[9].x - trajectory.points[0].x);
      
      expect(smoothedSlope).toBeCloseTo(originalSlope, 1);
    });
  });

  describe('轨迹分析', () => {
    test('应该计算轨迹边界框', () => {
      trajectory.addPoint(new Point3D(-1, -2, -3));
      trajectory.addPoint(new Point3D(4, 5, 6));
      trajectory.addPoint(new Point3D(2, 1, 0));
      
      const bounds = trajectory.getBounds();
      
      expect(bounds.min.x).toBe(-1);
      expect(bounds.min.y).toBe(-2);
      expect(bounds.min.z).toBe(-3);
      expect(bounds.max.x).toBe(4);
      expect(bounds.max.y).toBe(5);
      expect(bounds.max.z).toBe(6);
    });

    test('应该计算轨迹重心', () => {
      trajectory.addPoint(new Point3D(0, 0, 0));
      trajectory.addPoint(new Point3D(2, 0, 0));
      trajectory.addPoint(new Point3D(0, 2, 0));
      
      const centroid = trajectory.getCentroid();
      
      expect(centroid.x).toBeCloseTo(2/3, 2);
      expect(centroid.y).toBeCloseTo(2/3, 2);
      expect(centroid.z).toBe(0);
    });

    test('应该计算轨迹方向', () => {
      trajectory.addPoint(new Point3D(0, 0, 0));
      trajectory.addPoint(new Point3D(1, 1, 0));
      trajectory.addPoint(new Point3D(2, 2, 0));
      
      const direction = trajectory.getMainDirection();
      
      expect(direction.x).toBeCloseTo(direction.y, 2); // 45度方向
      expect(direction.z).toBeCloseTo(0, 2);
    });
  });
});

describe('TrajectoryPatternRecognizer', () => {
  let recognizer;

  beforeEach(() => {
    recognizer = new TrajectoryPatternRecognizer();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化模式识别器', () => {
      expect(recognizer.patterns).toBeInstanceOf(Map);
      expect(recognizer.isInitialized).toBe(true);
    });

    test('应该加载预定义模式', () => {
      expect(recognizer.patterns.size).toBeGreaterThan(0);
      expect(recognizer.patterns.has(MovementPattern.LINEAR)).toBe(true);
      expect(recognizer.patterns.has(MovementPattern.CIRCULAR)).toBe(true);
      expect(recognizer.patterns.has(MovementPattern.OSCILLATORY)).toBe(true);
    });
  });

  describe('模式识别', () => {
    test('应该识别线性运动', () => {
      const trajectory = new Trajectory('linear', TrajectoryType.HAND);
      
      // 创建线性轨迹
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, i * 2, 0, 1000 + i * 100));
      }
      
      const pattern = recognizer.recognizePattern(trajectory);
      
      expect(pattern.type).toBe(MovementPattern.LINEAR);
      expect(pattern.confidence).toBeGreaterThan(0.8);
    });

    test('应该识别圆形运动', () => {
      const trajectory = new Trajectory('circular', TrajectoryType.HAND);
      
      // 创建圆形轨迹
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * 2 * Math.PI;
        trajectory.addPoint(new Point3D(
          Math.cos(angle),
          Math.sin(angle),
          0,
          1000 + i * 100
        ));
      }
      
      const pattern = recognizer.recognizePattern(trajectory);
      
      expect(pattern.type).toBe(MovementPattern.CIRCULAR);
      expect(pattern.confidence).toBeGreaterThan(0.7);
    });

    test('应该识别振荡运动', () => {
      const trajectory = new Trajectory('oscillatory', TrajectoryType.HAND);
      
      // 创建振荡轨迹
      for (let i = 0; i < 30; i++) {
        trajectory.addPoint(new Point3D(
          i * 0.1,
          Math.sin(i * 0.5),
          0,
          1000 + i * 100
        ));
      }
      
      const pattern = recognizer.recognizePattern(trajectory);
      
      expect(pattern.type).toBe(MovementPattern.OSCILLATORY);
      expect(pattern.confidence).toBeGreaterThan(0.6);
    });

    test('应该识别随机运动', () => {
      const trajectory = new Trajectory('random', TrajectoryType.HAND);
      
      // 创建随机轨迹
      for (let i = 0; i < 20; i++) {
        trajectory.addPoint(new Point3D(
          Math.random() * 10,
          Math.random() * 10,
          Math.random() * 10,
          1000 + i * 100
        ));
      }
      
      const pattern = recognizer.recognizePattern(trajectory);
      
      expect(pattern.type).toBe(MovementPattern.RANDOM);
    });
  });

  describe('模式特征提取', () => {
    test('应该提取线性特征', () => {
      const trajectory = new Trajectory('linear', TrajectoryType.HAND);
      
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, i * 2, 0));
      }
      
      const features = recognizer.extractLinearFeatures(trajectory);
      
      expect(features).toHaveProperty('linearity');
      expect(features).toHaveProperty('direction');
      expect(features).toHaveProperty('consistency');
      expect(features.linearity).toBeGreaterThan(0.9);
    });

    test('应该提取圆形特征', () => {
      const trajectory = new Trajectory('circular', TrajectoryType.HAND);
      
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * 2 * Math.PI;
        trajectory.addPoint(new Point3D(
          Math.cos(angle),
          Math.sin(angle),
          0
        ));
      }
      
      const features = recognizer.extractCircularFeatures(trajectory);
      
      expect(features).toHaveProperty('circularity');
      expect(features).toHaveProperty('radius');
      expect(features).toHaveProperty('center');
      expect(features.circularity).toBeGreaterThan(0.8);
      expect(features.radius).toBeCloseTo(1, 1);
    });

    test('应该提取振荡特征', () => {
      const trajectory = new Trajectory('oscillatory', TrajectoryType.HAND);
      
      for (let i = 0; i < 30; i++) {
        trajectory.addPoint(new Point3D(
          i * 0.1,
          Math.sin(i * 0.5),
          0
        ));
      }
      
      const features = recognizer.extractOscillatoryFeatures(trajectory);
      
      expect(features).toHaveProperty('frequency');
      expect(features).toHaveProperty('amplitude');
      expect(features).toHaveProperty('regularity');
      expect(features.frequency).toBeGreaterThan(0);
      expect(features.amplitude).toBeGreaterThan(0);
    });
  });

  describe('自定义模式', () => {
    test('应该添加自定义模式', () => {
      const customPattern = {
        name: 'CUSTOM_PATTERN',
        features: ['custom_feature_1', 'custom_feature_2'],
        classifier: (trajectory) => ({ confidence: 0.8, features: {} })
      };
      
      recognizer.addPattern(customPattern);
      
      expect(recognizer.patterns.has('CUSTOM_PATTERN')).toBe(true);
    });

    test('应该使用自定义模式进行识别', () => {
      const customPattern = {
        name: 'CUSTOM_PATTERN',
        features: ['test_feature'],
        classifier: (trajectory) => ({ confidence: 0.9, features: { test_feature: 1.0 } })
      };
      
      recognizer.addPattern(customPattern);
      
      const trajectory = new Trajectory('test', TrajectoryType.HAND);
      trajectory.addPoint(new Point3D(1, 1, 1));
      
      const pattern = recognizer.recognizePattern(trajectory);
      
      expect(pattern.type).toBe('CUSTOM_PATTERN');
      expect(pattern.confidence).toBe(0.9);
    });
  });
});

describe('TrajectoryPredictor', () => {
  let predictor;

  beforeEach(() => {
    predictor = new TrajectoryPredictor();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化预测器', () => {
      expect(predictor.models).toBeInstanceOf(Map);
      expect(predictor.isInitialized).toBe(true);
    });

    test('应该设置默认配置', () => {
      expect(predictor.config.predictionHorizon).toBe(1000);
      expect(predictor.config.minHistoryLength).toBe(5);
      expect(predictor.config.maxPredictionPoints).toBe(50);
    });
  });

  describe('轨迹预测', () => {
    test('应该预测线性轨迹', () => {
      const trajectory = new Trajectory('linear', TrajectoryType.HAND);
      
      // 创建线性轨迹
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, i * 2, 0, 1000 + i * 100));
      }
      
      const prediction = predictor.predictTrajectory(trajectory, 500); // 预测500ms
      
      expect(prediction).toHaveProperty('points');
      expect(prediction).toHaveProperty('confidence');
      expect(prediction).toHaveProperty('method');
      expect(prediction.points.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0.5);
    });

    test('应该预测圆形轨迹', () => {
      const trajectory = new Trajectory('circular', TrajectoryType.HAND);
      
      // 创建圆形轨迹
      for (let i = 0; i < 20; i++) {
        const angle = (i / 20) * Math.PI; // 半圆
        trajectory.addPoint(new Point3D(
          Math.cos(angle),
          Math.sin(angle),
          0,
          1000 + i * 50
        ));
      }
      
      const prediction = predictor.predictTrajectory(trajectory, 500);
      
      expect(prediction.points.length).toBeGreaterThan(0);
      expect(prediction.method).toBe('circular');
    });

    test('应该处理不足的历史数据', () => {
      const trajectory = new Trajectory('short', TrajectoryType.HAND);
      
      // 只添加很少的点
      trajectory.addPoint(new Point3D(0, 0, 0));
      trajectory.addPoint(new Point3D(1, 1, 0));
      
      const prediction = predictor.predictTrajectory(trajectory, 500);
      
      expect(prediction.confidence).toBeLessThan(0.5);
    });
  });

  describe('预测方法', () => {
    test('应该使用线性外推', () => {
      const trajectory = new Trajectory('linear', TrajectoryType.HAND);
      
      for (let i = 0; i < 5; i++) {
        trajectory.addPoint(new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      const prediction = predictor.linearExtrapolation(trajectory, 200);
      
      expect(prediction.points.length).toBeGreaterThan(0);
      
      // 验证预测点的趋势
      const lastPoint = trajectory.points[trajectory.points.length - 1];
      const firstPredicted = prediction.points[0];
      
      expect(firstPredicted.x).toBeGreaterThan(lastPoint.x);
      expect(firstPredicted.y).toBeGreaterThan(lastPoint.y);
    });

    test('应该使用多项式拟合', () => {
      const trajectory = new Trajectory('polynomial', TrajectoryType.HAND);
      
      // 创建二次轨迹
      for (let i = 0; i < 10; i++) {
        trajectory.addPoint(new Point3D(i, i * i, 0, 1000 + i * 100));
      }
      
      const prediction = predictor.polynomialFitting(trajectory, 200, 2);
      
      expect(prediction.points.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0.6);
    });

    test('应该使用卡尔曼滤波', () => {
      const trajectory = new Trajectory('kalman', TrajectoryType.HAND);
      
      // 添加带噪声的轨迹
      for (let i = 0; i < 15; i++) {
        trajectory.addPoint(new Point3D(
          i + (Math.random() - 0.5) * 0.1,
          i + (Math.random() - 0.5) * 0.1,
          0,
          1000 + i * 100
        ));
      }
      
      const prediction = predictor.kalmanFilter(trajectory, 300);
      
      expect(prediction.points.length).toBeGreaterThan(0);
      expect(prediction.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('预测评估', () => {
    test('应该评估预测准确性', () => {
      const actualTrajectory = new Trajectory('actual', TrajectoryType.HAND);
      const predictedPoints = [];
      
      // 创建实际轨迹
      for (let i = 0; i < 10; i++) {
        actualTrajectory.addPoint(new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      // 创建预测点
      for (let i = 10; i < 15; i++) {
        predictedPoints.push(new Point3D(i + 0.1, i + 0.1, 0, 1000 + i * 100));
      }
      
      const accuracy = predictor.evaluatePrediction(actualTrajectory, predictedPoints);
      
      expect(accuracy).toHaveProperty('meanError');
      expect(accuracy).toHaveProperty('maxError');
      expect(accuracy).toHaveProperty('accuracy');
      expect(accuracy.meanError).toBeGreaterThan(0);
      expect(accuracy.accuracy).toBeGreaterThan(0.8);
    });
  });
});

describe('TrajectoryAnalyzer', () => {
  let analyzer;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    analyzer = new TrajectoryAnalyzer(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    analyzer.destroy();
  });

  describe('初始化', () => {
    test('应该正确初始化轨迹分析器', () => {
      expect(analyzer.container).toBe(mockContainer);
      expect(analyzer.trajectories).toBeInstanceOf(Map);
      expect(analyzer.patternRecognizer).toBeInstanceOf(TrajectoryPatternRecognizer);
      expect(analyzer.predictor).toBeInstanceOf(TrajectoryPredictor);
      expect(analyzer.isInitialized).toBe(true);
    });

    test('应该设置默认配置', () => {
      expect(analyzer.config.maxTrajectories).toBe(50);
      expect(analyzer.config.analysisInterval).toBe(100);
      expect(analyzer.config.enablePrediction).toBe(true);
      expect(analyzer.config.enablePatternRecognition).toBe(true);
    });
  });

  describe('轨迹管理', () => {
    test('应该创建新轨迹', () => {
      const trajectoryId = analyzer.createTrajectory('test-trajectory', TrajectoryType.HAND);
      
      expect(trajectoryId).toBeDefined();
      expect(analyzer.trajectories.has(trajectoryId)).toBe(true);
      expect(analyzer.trajectories.get(trajectoryId).type).toBe(TrajectoryType.HAND);
    });

    test('应该添加轨迹点', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      const point = new Point3D(1, 2, 3);
      
      analyzer.addTrajectoryPoint(trajectoryId, point);
      
      const trajectory = analyzer.trajectories.get(trajectoryId);
      expect(trajectory.points).toHaveLength(1);
      expect(trajectory.points[0]).toBe(point);
    });

    test('应该移除轨迹', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      analyzer.removeTrajectory(trajectoryId);
      
      expect(analyzer.trajectories.has(trajectoryId)).toBe(false);
    });

    test('应该限制轨迹数量', () => {
      analyzer.config.maxTrajectories = 3;
      
      const trajectoryIds = [];
      for (let i = 0; i < 5; i++) {
        trajectoryIds.push(analyzer.createTrajectory(`test-${i}`, TrajectoryType.HAND));
      }
      
      expect(analyzer.trajectories.size).toBe(3);
      expect(analyzer.trajectories.has(trajectoryIds[0])).toBe(false); // 最旧的被移除
    });
  });

  describe('实时分析', () => {
    test('应该启动实时分析', () => {
      analyzer.startAnalysis();
      
      expect(analyzer.isAnalyzing).toBe(true);
      expect(analyzer.analysisInterval).toBeDefined();
    });

    test('应该停止实时分析', () => {
      analyzer.startAnalysis();
      analyzer.stopAnalysis();
      
      expect(analyzer.isAnalyzing).toBe(false);
      expect(analyzer.analysisInterval).toBeNull();
    });

    test('应该执行分析周期', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      // 添加足够的点进行分析
      for (let i = 0; i < 10; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      const analyzeTrajectoryMock = jest.spyOn(analyzer, 'analyzeTrajectory');
      
      analyzer._performAnalysisCycle();
      
      expect(analyzeTrajectoryMock).toHaveBeenCalledWith(trajectoryId);
    });
  });

  describe('轨迹分析', () => {
    test('应该分析单个轨迹', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      // 创建线性轨迹
      for (let i = 0; i < 10; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i * 2, 0, 1000 + i * 100));
      }
      
      const analysis = analyzer.analyzeTrajectory(trajectoryId);
      
      expect(analysis).toHaveProperty('trajectory');
      expect(analysis).toHaveProperty('pattern');
      expect(analysis).toHaveProperty('prediction');
      expect(analysis).toHaveProperty('quality');
      expect(analysis).toHaveProperty('metrics');
      
      expect(analysis.pattern.type).toBe(MovementPattern.LINEAR);
      expect(analysis.quality.score).toBeGreaterThan(0);
    });

    test('应该分析所有轨迹', () => {
      const trajectoryId1 = analyzer.createTrajectory('test1', TrajectoryType.HAND);
      const trajectoryId2 = analyzer.createTrajectory('test2', TrajectoryType.FOOT);
      
      // 添加数据
      for (let i = 0; i < 5; i++) {
        analyzer.addTrajectoryPoint(trajectoryId1, new Point3D(i, 0, 0));
        analyzer.addTrajectoryPoint(trajectoryId2, new Point3D(0, i, 0));
      }
      
      const analyses = analyzer.analyzeAllTrajectories();
      
      expect(analyses).toHaveProperty(trajectoryId1);
      expect(analyses).toHaveProperty(trajectoryId2);
    });
  });

  describe('异常检测', () => {
    test('应该检测轨迹异常', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      // 添加正常数据
      for (let i = 0; i < 8; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      // 添加异常点
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(100, 100, 0, 1800));
      
      const anomalies = analyzer.detectAnomalies(trajectoryId);
      
      expect(anomalies.length).toBeGreaterThan(0);
      expect(anomalies[0]).toHaveProperty('pointIndex');
      expect(anomalies[0]).toHaveProperty('anomalyScore');
      expect(anomalies[0]).toHaveProperty('type');
    });

    test('应该检测速度异常', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      // 正常速度
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(0, 0, 0, 1000));
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(1, 0, 0, 1100));
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(2, 0, 0, 1200));
      
      // 异常高速
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(20, 0, 0, 1250));
      
      const anomalies = analyzer.detectAnomalies(trajectoryId);
      
      expect(anomalies.some(a => a.type === 'speed')).toBe(true);
    });
  });

  describe('统计分析', () => {
    test('应该获取轨迹统计', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      for (let i = 0; i < 10; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      const stats = analyzer.getTrajectoryStatistics(trajectoryId);
      
      expect(stats).toHaveProperty('totalLength');
      expect(stats).toHaveProperty('averageSpeed');
      expect(stats).toHaveProperty('maxSpeed');
      expect(stats).toHaveProperty('duration');
      expect(stats).toHaveProperty('pointCount');
      
      expect(stats.pointCount).toBe(10);
      expect(stats.totalLength).toBeGreaterThan(0);
    });

    test('应该获取全局统计', () => {
      // 创建多个轨迹
      for (let j = 0; j < 3; j++) {
        const trajectoryId = analyzer.createTrajectory(`test-${j}`, TrajectoryType.HAND);
        
        for (let i = 0; i < 5; i++) {
          analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, j, 0));
        }
      }
      
      const globalStats = analyzer.getGlobalStatistics();
      
      expect(globalStats).toHaveProperty('totalTrajectories');
      expect(globalStats).toHaveProperty('totalPoints');
      expect(globalStats).toHaveProperty('averageTrajectoryLength');
      expect(globalStats).toHaveProperty('patternDistribution');
      
      expect(globalStats.totalTrajectories).toBe(3);
      expect(globalStats.totalPoints).toBe(15);
    });
  });

  describe('数据导出', () => {
    test('应该导出轨迹数据', () => {
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      for (let i = 0; i < 5; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0, 1000 + i * 100));
      }
      
      const exportData = analyzer.exportTrajectory(trajectoryId);
      
      expect(exportData).toHaveProperty('id');
      expect(exportData).toHaveProperty('type');
      expect(exportData).toHaveProperty('points');
      expect(exportData).toHaveProperty('analysis');
      expect(exportData.points.length).toBe(5);
    });

    test('应该导出所有数据', () => {
      // 创建测试数据
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(1, 1, 1));
      
      const exportData = analyzer.exportAllData();
      
      expect(exportData).toHaveProperty('timestamp');
      expect(exportData).toHaveProperty('trajectories');
      expect(exportData).toHaveProperty('statistics');
      expect(exportData).toHaveProperty('config');
      
      expect(Object.keys(exportData.trajectories)).toContain(trajectoryId);
    });
  });

  describe('配置管理', () => {
    test('应该更新配置', () => {
      const newConfig = {
        maxTrajectories: 100,
        analysisInterval: 50,
        enablePrediction: false,
        predictionHorizon: 2000
      };
      
      analyzer.updateConfig(newConfig);
      
      expect(analyzer.config.maxTrajectories).toBe(100);
      expect(analyzer.config.analysisInterval).toBe(50);
      expect(analyzer.config.enablePrediction).toBe(false);
      expect(analyzer.config.predictionHorizon).toBe(2000);
    });

    test('应该验证配置参数', () => {
      expect(() => {
        analyzer.updateConfig({ maxTrajectories: -1 });
      }).toThrow();
      
      expect(() => {
        analyzer.updateConfig({ analysisInterval: 0 });
      }).toThrow();
    });
  });

  describe('事件处理', () => {
    test('应该触发轨迹事件', () => {
      const mockCallback = jest.fn();
      analyzer.addEventListener('trajectoryCreated', mockCallback);
      
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      expect(mockCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          trajectoryId,
          type: TrajectoryType.HAND
        })
      );
    });

    test('应该触发分析事件', () => {
      const mockCallback = jest.fn();
      analyzer.addEventListener('analysisCompleted', mockCallback);
      
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      
      for (let i = 0; i < 5; i++) {
        analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0));
      }
      
      analyzer.analyzeTrajectory(trajectoryId);
      
      expect(mockCallback).toHaveBeenCalled();
    });
  });

  describe('性能优化', () => {
    test('应该限制分析频率', () => {
      analyzer.config.analysisInterval = 1000; // 1秒间隔
      
      const analyzeTrajectoryMock = jest.spyOn(analyzer, 'analyzeTrajectory');
      
      // 快速连续调用
      analyzer._performAnalysisCycle();
      analyzer._performAnalysisCycle();
      analyzer._performAnalysisCycle();
      
      // 由于间隔限制，不应该每次都执行分析
      expect(analyzeTrajectoryMock.mock.calls.length).toBeLessThan(3);
    });

    test('应该清理旧轨迹', () => {
      analyzer.config.maxTrajectories = 2;
      
      const id1 = analyzer.createTrajectory('test1', TrajectoryType.HAND);
      const id2 = analyzer.createTrajectory('test2', TrajectoryType.HAND);
      const id3 = analyzer.createTrajectory('test3', TrajectoryType.HAND);
      
      expect(analyzer.trajectories.size).toBe(2);
      expect(analyzer.trajectories.has(id1)).toBe(false); // 最旧的被移除
      expect(analyzer.trajectories.has(id2)).toBe(true);
      expect(analyzer.trajectories.has(id3)).toBe(true);
    });
  });

  describe('资源管理', () => {
    test('应该正确清理资源', () => {
      analyzer.startAnalysis();
      
      const trajectoryId = analyzer.createTrajectory('test', TrajectoryType.HAND);
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(1, 1, 1));
      
      analyzer.destroy();
      
      expect(analyzer.isAnalyzing).toBe(false);
      expect(analyzer.analysisInterval).toBeNull();
      expect(analyzer.trajectories.size).toBe(0);
      expect(analyzer.isInitialized).toBe(false);
    });
  });
});

// 集成测试
describe('TrajectoryAnalyzer 集成测试', () => {
  let analyzer;
  let mockContainer;

  beforeEach(() => {
    mockContainer = document.createElement('div');
    analyzer = new TrajectoryAnalyzer(mockContainer);
    jest.clearAllMocks();
  });

  afterEach(() => {
    analyzer.destroy();
  });

  test('应该完整地分析手部轨迹', () => {
    const trajectoryId = analyzer.createTrajectory('hand-gesture', TrajectoryType.HAND);
    
    // 模拟手部画圆动作
    const centerX = 5, centerY = 5, radius = 3;
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(x, y, 0, 1000 + i * 100));
    }
    
    const analysis = analyzer.analyzeTrajectory(trajectoryId);
    
    // 验证模式识别
    expect(analysis.pattern.type).toBe(MovementPattern.CIRCULAR);
    expect(analysis.pattern.confidence).toBeGreaterThan(0.7);
    
    // 验证质量评估
    expect(analysis.quality.level).not.toBe(TrajectoryQuality.POOR);
    
    // 验证预测
    expect(analysis.prediction.points.length).toBeGreaterThan(0);
    expect(analysis.prediction.confidence).toBeGreaterThan(0.5);
    
    // 验证指标
    expect(analysis.metrics.totalLength).toBeGreaterThan(0);
    expect(analysis.metrics.averageSpeed).toBeGreaterThan(0);
  });

  test('应该处理多个同时进行的轨迹', () => {
    const handId = analyzer.createTrajectory('hand', TrajectoryType.HAND);
    const footId = analyzer.createTrajectory('foot', TrajectoryType.FOOT);
    const headId = analyzer.createTrajectory('head', TrajectoryType.HEAD);
    
    // 添加不同类型的运动数据
    for (let i = 0; i < 10; i++) {
      // 手部：线性运动
      analyzer.addTrajectoryPoint(handId, new Point3D(i, i, 0, 1000 + i * 100));
      
      // 脚部：振荡运动
      analyzer.addTrajectoryPoint(footId, new Point3D(i, Math.sin(i * 0.5), 0, 1000 + i * 100));
      
      // 头部：缓慢移动
      analyzer.addTrajectoryPoint(headId, new Point3D(i * 0.1, 0, 0, 1000 + i * 100));
    }
    
    const analyses = analyzer.analyzeAllTrajectories();
    
    expect(analyses[handId].pattern.type).toBe(MovementPattern.LINEAR);
    expect(analyses[footId].pattern.type).toBe(MovementPattern.OSCILLATORY);
    expect(analyses[headId].pattern.type).toBe(MovementPattern.LINEAR);
    
    // 验证全局统计
    const globalStats = analyzer.getGlobalStatistics();
    expect(globalStats.totalTrajectories).toBe(3);
    expect(globalStats.patternDistribution[MovementPattern.LINEAR]).toBe(2);
    expect(globalStats.patternDistribution[MovementPattern.OSCILLATORY]).toBe(1);
  });

  test('应该实时检测和响应异常', () => {
    const trajectoryId = analyzer.createTrajectory('realtime', TrajectoryType.HAND);
    
    const anomalyCallback = jest.fn();
    analyzer.addEventListener('anomalyDetected', anomalyCallback);
    
    // 添加正常数据
    for (let i = 0; i < 8; i++) {
      analyzer.addTrajectoryPoint(trajectoryId, new Point3D(i, i, 0, 1000 + i * 100));
    }
    
    // 添加异常点
    analyzer.addTrajectoryPoint(trajectoryId, new Point3D(50, 50, 0, 1800));
    
    // 执行分析
    analyzer.analyzeTrajectory(trajectoryId);
    
    expect(anomalyCallback).toHaveBeenCalled();
    
    const anomalies = analyzer.detectAnomalies(trajectoryId);
    expect(anomalies.length).toBeGreaterThan(0);
    expect(anomalies[0].anomalyScore).toBeGreaterThan(0.8);
  });
});