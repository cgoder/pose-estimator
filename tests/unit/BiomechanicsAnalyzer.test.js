/**
 * 生物力学分析器单元测试
 * 测试人体运动的生物力学特性分析功能
 */

import { jest } from '@jest/globals';
import BiomechanicsAnalyzer from '../../src/components/analyzers/BiomechanicsAnalyzer.js';

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

// 模拟关键点数据
const createMockKeypoints = (overrides = {}) => {
  const defaultKeypoints = {
    // 头部
    nose: { x: 320, y: 100, confidence: 0.9 },
    leftEye: { x: 310, y: 90, confidence: 0.8 },
    rightEye: { x: 330, y: 90, confidence: 0.8 },
    leftEar: { x: 300, y: 95, confidence: 0.7 },
    rightEar: { x: 340, y: 95, confidence: 0.7 },
    
    // 躯干
    leftShoulder: { x: 280, y: 150, confidence: 0.9 },
    rightShoulder: { x: 360, y: 150, confidence: 0.9 },
    leftElbow: { x: 250, y: 200, confidence: 0.8 },
    rightElbow: { x: 390, y: 200, confidence: 0.8 },
    leftWrist: { x: 220, y: 250, confidence: 0.8 },
    rightWrist: { x: 420, y: 250, confidence: 0.8 },
    
    // 下半身
    leftHip: { x: 290, y: 300, confidence: 0.9 },
    rightHip: { x: 350, y: 300, confidence: 0.9 },
    leftKnee: { x: 285, y: 400, confidence: 0.8 },
    rightKnee: { x: 355, y: 400, confidence: 0.8 },
    leftAnkle: { x: 280, y: 500, confidence: 0.8 },
    rightAnkle: { x: 360, y: 500, confidence: 0.8 }
  };
  
  return { ...defaultKeypoints, ...overrides };
};

describe('BiomechanicsAnalyzer', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new BiomechanicsAnalyzer();
    jest.clearAllMocks();
  });

  describe('初始化', () => {
    test('应该正确初始化生物力学分析器', () => {
      expect(analyzer.anthropometry).toBeDefined();
      expect(analyzer.jointRanges).toBeDefined();
      expect(analyzer.mechanics).toBeDefined();
      expect(analyzer.history).toEqual([]);
    });

    test('应该设置默认人体测量学参数', () => {
      expect(analyzer.anthropometry.segmentLengths).toBeDefined();
      expect(analyzer.anthropometry.segmentMasses).toBeDefined();
      expect(analyzer.anthropometry.segmentLengths.upperArm).toBe(0.186);
      expect(analyzer.anthropometry.segmentMasses.head).toBe(0.081);
    });

    test('应该设置默认关节角度范围', () => {
      expect(analyzer.jointRanges.shoulder.flexion.min).toBe(-20);
      expect(analyzer.jointRanges.shoulder.flexion.max).toBe(180);
      expect(analyzer.jointRanges.knee.flexion.min).toBe(0);
      expect(analyzer.jointRanges.knee.flexion.max).toBe(140);
    });

    test('应该设置默认力学参数', () => {
      expect(analyzer.mechanics.gravity).toBe(9.81);
      expect(analyzer.mechanics.height).toBe(1.7);
      expect(analyzer.mechanics.weight).toBe(70);
    });
  });

  describe('身体参数设置', () => {
    test('应该设置用户身体参数', () => {
      const bodyParams = {
        height: 1.8,
        weight: 80,
        age: 30,
        gender: 'male'
      };
      
      analyzer.setBodyParameters(bodyParams);
      
      expect(analyzer.mechanics.height).toBe(1.8);
      expect(analyzer.mechanics.weight).toBe(80);
    });

    test('应该验证身体参数', () => {
      expect(() => {
        analyzer.setBodyParameters({ height: -1 });
      }).toThrow('身高必须为正数');
      
      expect(() => {
        analyzer.setBodyParameters({ weight: 0 });
      }).toThrow('体重必须为正数');
    });

    test('应该根据身高调整身体段长度', () => {
      const originalUpperArm = analyzer.anthropometry.segmentLengths.upperArm;
      
      analyzer.setBodyParameters({ height: 1.8 });
      
      const newUpperArm = analyzer.anthropometry.segmentLengths.upperArm;
      expect(newUpperArm).toBeCloseTo(originalUpperArm * (1.8 / 1.7), 3);
    });
  });

  describe('关节角度计算', () => {
    test('应该计算肩关节角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.shoulder.left).toBeDefined();
      expect(angles.shoulder.right).toBeDefined();
      expect(angles.shoulder.left.flexion).toBeGreaterThan(-180);
      expect(angles.shoulder.left.flexion).toBeLessThan(180);
    });

    test('应该计算肘关节角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.elbow.left).toBeDefined();
      expect(angles.elbow.right).toBeDefined();
      expect(angles.elbow.left.flexion).toBeGreaterThan(0);
      expect(angles.elbow.left.flexion).toBeLessThan(180);
    });

    test('应该计算髋关节角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.hip.left).toBeDefined();
      expect(angles.hip.right).toBeDefined();
      expect(angles.hip.left.flexion).toBeGreaterThan(-90);
      expect(angles.hip.left.flexion).toBeLessThan(180);
    });

    test('应该计算膝关节角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.knee.left).toBeDefined();
      expect(angles.knee.right).toBeDefined();
      expect(angles.knee.left.flexion).toBeGreaterThan(0);
      expect(angles.knee.left.flexion).toBeLessThan(180);
    });

    test('应该计算踝关节角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.ankle.left).toBeDefined();
      expect(angles.ankle.right).toBeDefined();
      expect(angles.ankle.left.dorsiflexion).toBeGreaterThan(-90);
      expect(angles.ankle.left.dorsiflexion).toBeLessThan(90);
    });

    test('应该计算躯干角度', () => {
      const keypoints = createMockKeypoints();
      
      const angles = analyzer._calculateJointAngles(keypoints);
      
      expect(angles.trunk).toBeDefined();
      expect(angles.trunk.flexion).toBeGreaterThan(-90);
      expect(angles.trunk.flexion).toBeLessThan(90);
    });

    test('应该处理缺失的关键点', () => {
      const incompleteKeypoints = {
        leftShoulder: { x: 280, y: 150, confidence: 0.9 },
        rightShoulder: { x: 360, y: 150, confidence: 0.9 }
        // 缺少其他关键点
      };
      
      const angles = analyzer._calculateJointAngles(incompleteKeypoints);
      
      // 应该返回可计算的角度，其他为null或默认值
      expect(angles).toBeDefined();
    });
  });

  describe('关节力矩计算', () => {
    test('应该计算关节力矩', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      
      const moments = analyzer._calculateJointMoments(keypoints, angles);
      
      expect(moments.shoulder.left).toBeDefined();
      expect(moments.elbow.left).toBeDefined();
      expect(moments.hip.left).toBeDefined();
      expect(moments.knee.left).toBeDefined();
      expect(moments.ankle.left).toBeDefined();
    });

    test('应该考虑重力影响', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      
      // 修改重力值
      analyzer.mechanics.gravity = 0;
      const momentsNoGravity = analyzer._calculateJointMoments(keypoints, angles);
      
      analyzer.mechanics.gravity = 9.81;
      const momentsWithGravity = analyzer._calculateJointMoments(keypoints, angles);
      
      // 有重力时力矩应该不同
      expect(momentsWithGravity.shoulder.left).not.toEqual(momentsNoGravity.shoulder.left);
    });

    test('应该考虑身体质量分布', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      
      // 修改体重
      analyzer.mechanics.weight = 50;
      const momentsLight = analyzer._calculateJointMoments(keypoints, angles);
      
      analyzer.mechanics.weight = 100;
      const momentsHeavy = analyzer._calculateJointMoments(keypoints, angles);
      
      // 体重不同时力矩应该不同
      expect(Math.abs(momentsHeavy.hip.left)).toBeGreaterThan(Math.abs(momentsLight.hip.left));
    });
  });

  describe('功率计算', () => {
    test('应该计算关节功率', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      const moments = analyzer._calculateJointMoments(keypoints, angles);
      
      // 模拟角速度
      const angularVelocities = {
        shoulder: { left: 0.5, right: 0.5 },
        elbow: { left: 1.0, right: 1.0 },
        hip: { left: 0.3, right: 0.3 },
        knee: { left: 0.8, right: 0.8 },
        ankle: { left: 0.2, right: 0.2 }
      };
      
      const power = analyzer._calculatePower(moments, angularVelocities);
      
      expect(power.shoulder.left).toBeDefined();
      expect(power.elbow.left).toBeDefined();
      expect(power.hip.left).toBeDefined();
      expect(power.knee.left).toBeDefined();
      expect(power.ankle.left).toBeDefined();
      expect(power.total).toBeDefined();
    });

    test('应该区分正负功率', () => {
      const moments = {
        shoulder: { left: 10, right: 10 },
        elbow: { left: 5, right: 5 },
        hip: { left: 15, right: 15 },
        knee: { left: 8, right: 8 },
        ankle: { left: 3, right: 3 }
      };
      
      const positiveVelocities = {
        shoulder: { left: 1, right: 1 },
        elbow: { left: 1, right: 1 },
        hip: { left: 1, right: 1 },
        knee: { left: 1, right: 1 },
        ankle: { left: 1, right: 1 }
      };
      
      const negativeVelocities = {
        shoulder: { left: -1, right: -1 },
        elbow: { left: -1, right: -1 },
        hip: { left: -1, right: -1 },
        knee: { left: -1, right: -1 },
        ankle: { left: -1, right: -1 }
      };
      
      const positivePower = analyzer._calculatePower(moments, positiveVelocities);
      const negativePower = analyzer._calculatePower(moments, negativeVelocities);
      
      expect(positivePower.total).toBeGreaterThan(0);
      expect(negativePower.total).toBeLessThan(0);
    });
  });

  describe('运动效率计算', () => {
    test('应该计算运动效率', () => {
      const power = {
        shoulder: { left: 10, right: 10 },
        elbow: { left: 5, right: 5 },
        hip: { left: 15, right: 15 },
        knee: { left: 8, right: 8 },
        ankle: { left: 3, right: 3 },
        total: 64
      };
      
      const keypoints = createMockKeypoints();
      
      const efficiency = analyzer._calculateEfficiency(power, keypoints);
      
      expect(efficiency.mechanical).toBeGreaterThan(0);
      expect(efficiency.mechanical).toBeLessThanOrEqual(1);
      expect(efficiency.metabolic).toBeGreaterThan(0);
      expect(efficiency.overall).toBeGreaterThan(0);
      expect(efficiency.overall).toBeLessThanOrEqual(1);
    });

    test('应该考虑运动类型对效率的影响', () => {
      const walkingPower = {
        total: 50,
        shoulder: { left: 2, right: 2 },
        hip: { left: 20, right: 20 },
        knee: { left: 3, right: 3 }
      };
      
      const runningPower = {
        total: 200,
        shoulder: { left: 10, right: 10 },
        hip: { left: 80, right: 80 },
        knee: { left: 20, right: 20 }
      };
      
      const keypoints = createMockKeypoints();
      
      const walkingEfficiency = analyzer._calculateEfficiency(walkingPower, keypoints);
      const runningEfficiency = analyzer._calculateEfficiency(runningPower, keypoints);
      
      // 步行通常比跑步效率更高
      expect(walkingEfficiency.overall).toBeGreaterThan(runningEfficiency.overall);
    });
  });

  describe('对称性分析', () => {
    test('应该分析运动对称性', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      
      const symmetry = analyzer._analyzeSymmetry(keypoints, angles);
      
      expect(symmetry.overall).toBeGreaterThan(0);
      expect(symmetry.overall).toBeLessThanOrEqual(1);
      expect(symmetry.joints.shoulder).toBeDefined();
      expect(symmetry.joints.elbow).toBeDefined();
      expect(symmetry.joints.hip).toBeDefined();
      expect(symmetry.joints.knee).toBeDefined();
      expect(symmetry.joints.ankle).toBeDefined();
    });

    test('应该检测不对称运动', () => {
      // 创建不对称的关键点数据
      const asymmetricKeypoints = createMockKeypoints({
        leftShoulder: { x: 280, y: 150, confidence: 0.9 },
        rightShoulder: { x: 360, y: 180, confidence: 0.9 }, // 右肩更高
        leftElbow: { x: 250, y: 200, confidence: 0.8 },
        rightElbow: { x: 390, y: 250, confidence: 0.8 } // 右肘更低
      });
      
      const angles = analyzer._calculateJointAngles(asymmetricKeypoints);
      const symmetry = analyzer._analyzeSymmetry(asymmetricKeypoints, angles);
      
      expect(symmetry.overall).toBeLessThan(0.9); // 对称性应该较低
      expect(symmetry.joints.shoulder).toBeLessThan(0.9);
    });

    test('应该分析位置对称性', () => {
      const keypoints = createMockKeypoints();
      
      const positionSymmetry = analyzer._analyzePositionSymmetry(keypoints);
      
      expect(positionSymmetry.shoulder).toBeGreaterThan(0);
      expect(positionSymmetry.elbow).toBeGreaterThan(0);
      expect(positionSymmetry.hip).toBeGreaterThan(0);
      expect(positionSymmetry.knee).toBeGreaterThan(0);
      expect(positionSymmetry.ankle).toBeGreaterThan(0);
    });
  });

  describe('稳定性分析', () => {
    test('应该分析运动稳定性', () => {
      const keypoints = createMockKeypoints();
      
      const stability = analyzer._analyzeStability(keypoints);
      
      expect(stability.overall).toBeGreaterThan(0);
      expect(stability.overall).toBeLessThanOrEqual(1);
      expect(stability.centerOfMass).toBeDefined();
      expect(stability.supportBase).toBeDefined();
      expect(stability.postural).toBeGreaterThan(0);
    });

    test('应该计算重心位置', () => {
      const keypoints = createMockKeypoints();
      
      const com = analyzer._calculateCenterOfMass(keypoints);
      
      expect(com.x).toBeDefined();
      expect(com.y).toBeDefined();
      expect(com.z).toBeDefined();
      expect(com.x).toBeGreaterThan(0);
      expect(com.y).toBeGreaterThan(0);
    });

    test('应该计算支撑面', () => {
      const keypoints = createMockKeypoints();
      
      const supportBase = analyzer._calculateSupportBase(keypoints);
      
      expect(supportBase.area).toBeGreaterThan(0);
      expect(supportBase.center).toBeDefined();
      expect(supportBase.width).toBeGreaterThan(0);
      expect(supportBase.length).toBeGreaterThan(0);
    });

    test('应该检测不稳定姿态', () => {
      // 创建不稳定的姿态（重心偏移）
      const unstableKeypoints = createMockKeypoints({
        leftHip: { x: 290, y: 300, confidence: 0.9 },
        rightHip: { x: 350, y: 300, confidence: 0.9 },
        leftAnkle: { x: 200, y: 500, confidence: 0.8 }, // 左脚向左偏移
        rightAnkle: { x: 400, y: 500, confidence: 0.8 }  // 右脚向右偏移
      });
      
      const stability = analyzer._analyzeStability(unstableKeypoints);
      
      expect(stability.overall).toBeLessThan(0.8); // 稳定性应该较低
    });
  });

  describe('能量消耗估算', () => {
    test('应该估算能量消耗', () => {
      const keypoints = createMockKeypoints();
      const power = {
        total: 100,
        shoulder: { left: 10, right: 10 },
        elbow: { left: 5, right: 5 },
        hip: { left: 30, right: 30 },
        knee: { left: 5, right: 5 },
        ankle: { left: 0, right: 0 }
      };
      
      const energyExpenditure = analyzer._estimateEnergyExpenditure(keypoints, power);
      
      expect(energyExpenditure.mechanical).toBeGreaterThan(0);
      expect(energyExpenditure.metabolic).toBeGreaterThan(0);
      expect(energyExpenditure.total).toBeGreaterThan(0);
      expect(energyExpenditure.rate).toBeGreaterThan(0); // J/s
    });

    test('应该考虑体重对能量消耗的影响', () => {
      const keypoints = createMockKeypoints();
      const power = { total: 100 };
      
      analyzer.mechanics.weight = 60;
      const lightEnergy = analyzer._estimateEnergyExpenditure(keypoints, power);
      
      analyzer.mechanics.weight = 90;
      const heavyEnergy = analyzer._estimateEnergyExpenditure(keypoints, power);
      
      expect(heavyEnergy.total).toBeGreaterThan(lightEnergy.total);
    });
  });

  describe('受伤风险评估', () => {
    test('应该评估受伤风险', () => {
      const keypoints = createMockKeypoints();
      const angles = analyzer._calculateJointAngles(keypoints);
      const moments = analyzer._calculateJointMoments(keypoints, angles);
      
      const riskAssessment = analyzer._assessInjuryRisk(keypoints, angles, moments);
      
      expect(riskAssessment.overall).toBeGreaterThanOrEqual(0);
      expect(riskAssessment.overall).toBeLessThanOrEqual(1);
      expect(riskAssessment.factors).toBeDefined();
      expect(riskAssessment.recommendations).toBeInstanceOf(Array);
    });

    test('应该检查关节角度风险', () => {
      // 创建极端角度的关键点
      const extremeKeypoints = createMockKeypoints({
        leftShoulder: { x: 280, y: 150, confidence: 0.9 },
        leftElbow: { x: 280, y: 100, confidence: 0.8 }, // 肘关节过度伸展
        leftWrist: { x: 280, y: 50, confidence: 0.8 }
      });
      
      const angles = analyzer._calculateJointAngles(extremeKeypoints);
      const angleRisks = analyzer._checkJointAngleRisks(angles);
      
      expect(angleRisks.some(risk => risk.joint === 'elbow')).toBe(true);
      expect(angleRisks.some(risk => risk.severity === 'high')).toBe(true);
    });

    test('应该检查速度风险', () => {
      const keypoints = createMockKeypoints();
      
      // 模拟高速运动
      const highVelocities = {
        shoulder: { left: 10, right: 10 }, // 高角速度
        elbow: { left: 15, right: 15 },
        hip: { left: 8, right: 8 },
        knee: { left: 12, right: 12 },
        ankle: { left: 5, right: 5 }
      };
      
      const velocityRisks = analyzer._checkVelocityRisks(keypoints, highVelocities);
      
      expect(velocityRisks.length).toBeGreaterThan(0);
      expect(velocityRisks.some(risk => risk.type === 'high_velocity')).toBe(true);
    });

    test('应该检查负荷分布风险', () => {
      const moments = {
        shoulder: { left: 50, right: 10 }, // 不平衡负荷
        elbow: { left: 30, right: 5 },
        hip: { left: 80, right: 20 },
        knee: { left: 40, right: 10 },
        ankle: { left: 15, right: 5 }
      };
      
      const loadRisks = analyzer._checkLoadDistributionRisks(moments);
      
      expect(loadRisks.length).toBeGreaterThan(0);
      expect(loadRisks.some(risk => risk.type === 'load_imbalance')).toBe(true);
    });
  });

  describe('完整分析流程', () => {
    test('应该执行完整的生物力学分析', () => {
      const keypoints = createMockKeypoints();
      
      const analysis = analyzer.analyze(keypoints);
      
      expect(analysis).toHaveProperty('timestamp');
      expect(analysis).toHaveProperty('kinematics');
      expect(analysis).toHaveProperty('kinetics');
      expect(analysis).toHaveProperty('efficiency');
      expect(analysis).toHaveProperty('symmetry');
      expect(analysis).toHaveProperty('stability');
      expect(analysis).toHaveProperty('energyExpenditure');
      expect(analysis).toHaveProperty('injuryRisk');
      
      // 验证运动学数据
      expect(analysis.kinematics.angles).toBeDefined();
      expect(analysis.kinematics.angularVelocities).toBeDefined();
      expect(analysis.kinematics.angularAccelerations).toBeDefined();
      
      // 验证动力学数据
      expect(analysis.kinetics.moments).toBeDefined();
      expect(analysis.kinetics.power).toBeDefined();
      
      // 验证其他分析结果
      expect(analysis.efficiency.overall).toBeGreaterThan(0);
      expect(analysis.symmetry.overall).toBeGreaterThan(0);
      expect(analysis.stability.overall).toBeGreaterThan(0);
      expect(analysis.energyExpenditure.total).toBeGreaterThan(0);
      expect(analysis.injuryRisk.overall).toBeGreaterThanOrEqual(0);
    });

    test('应该更新历史数据', () => {
      const keypoints = createMockKeypoints();
      
      expect(analyzer.history).toHaveLength(0);
      
      analyzer.analyze(keypoints);
      
      expect(analyzer.history).toHaveLength(1);
      expect(analyzer.history[0]).toHaveProperty('timestamp');
      expect(analyzer.history[0]).toHaveProperty('analysis');
    });

    test('应该限制历史数据长度', () => {
      const keypoints = createMockKeypoints();
      
      // 执行多次分析
      for (let i = 0; i < 150; i++) {
        analyzer.analyze(keypoints);
      }
      
      expect(analyzer.history.length).toBeLessThanOrEqual(100); // 默认最大历史长度
    });
  });

  describe('辅助方法', () => {
    test('应该验证关键点数据', () => {
      const validKeypoints = createMockKeypoints();
      const invalidKeypoints = { leftShoulder: { x: 'invalid', y: 100 } };
      
      expect(analyzer._validateKeypoints(validKeypoints)).toBe(true);
      expect(analyzer._validateKeypoints(invalidKeypoints)).toBe(false);
      expect(analyzer._validateKeypoints(null)).toBe(false);
      expect(analyzer._validateKeypoints({})).toBe(false);
    });

    test('应该计算角度', () => {
      const point1 = { x: 0, y: 0 };
      const point2 = { x: 1, y: 0 };
      const point3 = { x: 1, y: 1 };
      
      const angle = analyzer._calculateAngle(point1, point2, point3);
      
      expect(angle).toBeCloseTo(90, 1); // 90度角
    });

    test('应该获取身体段质量', () => {
      const upperArmMass = analyzer._getSegmentMass('upperArm');
      const forearmMass = analyzer._getSegmentMass('forearm');
      
      expect(upperArmMass).toBeGreaterThan(0);
      expect(forearmMass).toBeGreaterThan(0);
      expect(upperArmMass).toBeGreaterThan(forearmMass); // 上臂通常比前臂重
    });

    test('应该获取身体段长度', () => {
      const upperArmLength = analyzer._getSegmentLength('upperArm');
      const forearmLength = analyzer._getSegmentLength('forearm');
      
      expect(upperArmLength).toBeGreaterThan(0);
      expect(forearmLength).toBeGreaterThan(0);
    });

    test('应该计算最优功率', () => {
      const power = {
        shoulder: { left: 10, right: 12 },
        elbow: { left: 5, right: 6 },
        hip: { left: 20, right: 18 },
        knee: { left: 8, right: 9 },
        ankle: { left: 2, right: 3 }
      };
      
      const optimalPower = analyzer._getOptimalPower(power);
      
      expect(optimalPower).toBeGreaterThan(0);
      expect(optimalPower).toBeLessThan(100); // 合理范围
    });
  });

  describe('统计和历史', () => {
    test('应该获取统计信息', () => {
      const keypoints = createMockKeypoints();
      
      // 执行多次分析
      for (let i = 0; i < 10; i++) {
        analyzer.analyze(keypoints);
      }
      
      const stats = analyzer.getStatistics();
      
      expect(stats).toHaveProperty('totalAnalyses');
      expect(stats).toHaveProperty('averageEfficiency');
      expect(stats).toHaveProperty('averageSymmetry');
      expect(stats).toHaveProperty('averageStability');
      expect(stats).toHaveProperty('averageInjuryRisk');
      
      expect(stats.totalAnalyses).toBe(10);
      expect(stats.averageEfficiency).toBeGreaterThan(0);
    });

    test('应该重置分析器', () => {
      const keypoints = createMockKeypoints();
      
      analyzer.analyze(keypoints);
      expect(analyzer.history).toHaveLength(1);
      
      analyzer.reset();
      expect(analyzer.history).toHaveLength(0);
    });
  });

  describe('错误处理', () => {
    test('应该处理无效输入', () => {
      expect(() => {
        analyzer.analyze(null);
      }).toThrow('关键点数据无效');
      
      expect(() => {
        analyzer.analyze({});
      }).toThrow('关键点数据无效');
    });

    test('应该处理缺失的关键点', () => {
      const incompleteKeypoints = {
        leftShoulder: { x: 280, y: 150, confidence: 0.9 }
        // 缺少大部分关键点
      };
      
      // 应该不抛出错误，但返回有限的分析结果
      expect(() => {
        analyzer.analyze(incompleteKeypoints);
      }).not.toThrow();
    });

    test('应该处理低置信度的关键点', () => {
      const lowConfidenceKeypoints = createMockKeypoints();
      
      // 设置低置信度
      Object.keys(lowConfidenceKeypoints).forEach(key => {
        lowConfidenceKeypoints[key].confidence = 0.1;
      });
      
      const analysis = analyzer.analyze(lowConfidenceKeypoints);
      
      // 应该在分析结果中反映低置信度
      expect(analysis.injuryRisk.overall).toBeGreaterThan(0.3); // 低置信度应增加风险
    });
  });
});

// 集成测试
describe('BiomechanicsAnalyzer 集成测试', () => {
  let analyzer;

  beforeEach(() => {
    analyzer = new BiomechanicsAnalyzer();
    jest.clearAllMocks();
  });

  test('应该分析步行运动', () => {
    // 设置步行相关的身体参数
    analyzer.setBodyParameters({
      height: 1.75,
      weight: 70,
      age: 30,
      gender: 'male'
    });
    
    // 模拟步行姿态序列
    const walkingSequence = [
      // 左脚着地
      createMockKeypoints({
        leftHip: { x: 290, y: 300, confidence: 0.9 },
        leftKnee: { x: 285, y: 400, confidence: 0.8 },
        leftAnkle: { x: 280, y: 500, confidence: 0.8 },
        rightHip: { x: 350, y: 300, confidence: 0.9 },
        rightKnee: { x: 360, y: 380, confidence: 0.8 },
        rightAnkle: { x: 370, y: 480, confidence: 0.8 }
      }),
      // 中间支撑期
      createMockKeypoints({
        leftHip: { x: 290, y: 300, confidence: 0.9 },
        leftKnee: { x: 285, y: 400, confidence: 0.8 },
        leftAnkle: { x: 280, y: 500, confidence: 0.8 },
        rightHip: { x: 350, y: 300, confidence: 0.9 },
        rightKnee: { x: 355, y: 390, confidence: 0.8 },
        rightAnkle: { x: 360, y: 490, confidence: 0.8 }
      }),
      // 右脚着地
      createMockKeypoints({
        leftHip: { x: 290, y: 300, confidence: 0.9 },
        leftKnee: { x: 280, y: 380, confidence: 0.8 },
        leftAnkle: { x: 270, y: 480, confidence: 0.8 },
        rightHip: { x: 350, y: 300, confidence: 0.9 },
        rightKnee: { x: 355, y: 400, confidence: 0.8 },
        rightAnkle: { x: 360, y: 500, confidence: 0.8 }
      })
    ];
    
    const analyses = walkingSequence.map(keypoints => analyzer.analyze(keypoints));
    
    // 验证步行特征
    analyses.forEach(analysis => {
      expect(analysis.stability.overall).toBeGreaterThan(0.6); // 步行应该相对稳定
      expect(analysis.symmetry.overall).toBeGreaterThan(0.7); // 正常步行应该相对对称
      expect(analysis.injuryRisk.overall).toBeLessThan(0.3); // 正常步行风险较低
    });
    
    // 验证能量消耗合理性
    const avgEnergyExpenditure = analyses.reduce((sum, a) => sum + a.energyExpenditure.total, 0) / analyses.length;
    expect(avgEnergyExpenditure).toBeGreaterThan(0);
    expect(avgEnergyExpenditure).toBeLessThan(1000); // 合理的能量消耗范围
  });

  test('应该检测异常运动模式', () => {
    // 模拟异常姿态（跛行）
    const limpingKeypoints = createMockKeypoints({
      leftHip: { x: 290, y: 320, confidence: 0.9 }, // 左髋下沉
      rightHip: { x: 350, y: 280, confidence: 0.9 }, // 右髋抬高
      leftKnee: { x: 285, y: 420, confidence: 0.8 },
      rightKnee: { x: 355, y: 380, confidence: 0.8 },
      leftAnkle: { x: 280, y: 520, confidence: 0.8 },
      rightAnkle: { x: 360, y: 480, confidence: 0.8 }
    });
    
    const analysis = analyzer.analyze(limpingKeypoints);
    
    // 异常模式应该被检测出来
    expect(analysis.symmetry.overall).toBeLessThan(0.7); // 对称性差
    expect(analysis.stability.overall).toBeLessThan(0.6); // 稳定性差
    expect(analysis.injuryRisk.overall).toBeGreaterThan(0.4); // 风险较高
    expect(analysis.injuryRisk.recommendations.length).toBeGreaterThan(0); // 应该有建议
  });

  test('应该分析运动员表现', () => {
    // 设置运动员参数
    analyzer.setBodyParameters({
      height: 1.85,
      weight: 80,
      age: 25,
      gender: 'male'
    });
    
    // 模拟高强度运动姿态
    const athleticKeypoints = createMockKeypoints({
      // 更大的关节角度和更好的姿态控制
      leftShoulder: { x: 260, y: 140, confidence: 0.95 },
      rightShoulder: { x: 380, y: 140, confidence: 0.95 },
      leftElbow: { x: 230, y: 180, confidence: 0.9 },
      rightElbow: { x: 410, y: 180, confidence: 0.9 },
      leftHip: { x: 290, y: 290, confidence: 0.95 },
      rightHip: { x: 350, y: 290, confidence: 0.95 },
      leftKnee: { x: 285, y: 390, confidence: 0.9 },
      rightKnee: { x: 355, y: 390, confidence: 0.9 }
    });
    
    const analysis = analyzer.analyze(athleticKeypoints);
    
    // 运动员应该表现出更好的生物力学特征
    expect(analysis.efficiency.overall).toBeGreaterThan(0.7); // 高效率
    expect(analysis.symmetry.overall).toBeGreaterThan(0.8); // 好对称性
    expect(analysis.stability.overall).toBeGreaterThan(0.7); // 好稳定性
    
    // 功率输出应该更高
    expect(analysis.kinetics.power.total).toBeGreaterThan(50);
  });

  test('应该追踪长期趋势', () => {
    const keypoints = createMockKeypoints();
    
    // 模拟多次分析以建立趋势
    for (let i = 0; i < 20; i++) {
      // 逐渐改善的姿态
      const improvedKeypoints = createMockKeypoints({
        leftShoulder: { x: 280 + i * 0.5, y: 150, confidence: 0.9 },
        rightShoulder: { x: 360 - i * 0.5, y: 150, confidence: 0.9 }
      });
      
      analyzer.analyze(improvedKeypoints);
    }
    
    const stats = analyzer.getStatistics();
    
    expect(stats.totalAnalyses).toBe(20);
    expect(stats.averageSymmetry).toBeGreaterThan(0.7);
    
    // 验证历史数据的趋势
    const firstAnalysis = analyzer.history[0].analysis;
    const lastAnalysis = analyzer.history[analyzer.history.length - 1].analysis;
    
    expect(lastAnalysis.symmetry.overall).toBeGreaterThan(firstAnalysis.symmetry.overall);
  });
});