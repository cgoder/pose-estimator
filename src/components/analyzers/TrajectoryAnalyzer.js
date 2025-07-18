/**
 * 运动轨迹分析器
 * 分析人体关键点的运动轨迹，提供运动模式识别和分析
 * 支持3D轨迹重建、运动预测和异常检测
 */

import { MathUtils } from '../../utils/MathUtils.js';
import { GeometryUtils } from '../../utils/GeometryUtils.js';

// 轨迹类型
export const TrajectoryType = {
  LINEAR: 'linear',
  CIRCULAR: 'circular',
  ELLIPTICAL: 'elliptical',
  PARABOLIC: 'parabolic',
  SPIRAL: 'spiral',
  IRREGULAR: 'irregular',
  OSCILLATORY: 'oscillatory',
  COMPLEX: 'complex'
};

// 运动模式
export const MovementPattern = {
  WALKING: 'walking',
  RUNNING: 'running',
  JUMPING: 'jumping',
  SQUATTING: 'squatting',
  REACHING: 'reaching',
  LIFTING: 'lifting',
  THROWING: 'throwing',
  KICKING: 'kicking',
  DANCING: 'dancing',
  EXERCISE: 'exercise',
  UNKNOWN: 'unknown'
};

// 分析维度
export const AnalysisDimension = {
  TWO_D: '2d',
  THREE_D: '3d',
  TEMPORAL: 'temporal',
  FREQUENCY: 'frequency'
};

// 轨迹质量等级
export const TrajectoryQuality = {
  EXCELLENT: 'excellent',
  GOOD: 'good',
  FAIR: 'fair',
  POOR: 'poor',
  INVALID: 'invalid'
};

/**
 * 3D点类
 */
class Point3D {
  constructor(x = 0, y = 0, z = 0, timestamp = Date.now(), confidence = 1.0) {
    this.x = x;
    this.y = y;
    this.z = z;
    this.timestamp = timestamp;
    this.confidence = confidence;
  }

  distanceTo(other) {
    return Math.sqrt(
      Math.pow(this.x - other.x, 2) +
      Math.pow(this.y - other.y, 2) +
      Math.pow(this.z - other.z, 2)
    );
  }

  clone() {
    return new Point3D(this.x, this.y, this.z, this.timestamp, this.confidence);
  }

  toArray() {
    return [this.x, this.y, this.z];
  }

  static fromArray(arr, timestamp = Date.now(), confidence = 1.0) {
    return new Point3D(arr[0] || 0, arr[1] || 0, arr[2] || 0, timestamp, confidence);
  }
}

/**
 * 运动轨迹类
 */
class Trajectory {
  constructor(keypoint, maxPoints = 1000) {
    this.keypoint = keypoint; // 关键点名称
    this.points = []; // 轨迹点数组
    this.maxPoints = maxPoints;
    this.startTime = null;
    this.endTime = null;
    this.totalDistance = 0;
    this.averageVelocity = 0;
    this.maxVelocity = 0;
    this.acceleration = [];
    this.smoothedPoints = [];
    this.type = TrajectoryType.IRREGULAR;
    this.quality = TrajectoryQuality.FAIR;
    this.confidence = 0;
    this.metadata = {};
  }

  addPoint(point) {
    if (!(point instanceof Point3D)) {
      throw new Error('Point must be an instance of Point3D');
    }

    this.points.push(point);
    
    // 维护最大点数限制
    if (this.points.length > this.maxPoints) {
      this.points.shift();
    }

    // 更新时间范围
    if (this.startTime === null || point.timestamp < this.startTime) {
      this.startTime = point.timestamp;
    }
    if (this.endTime === null || point.timestamp > this.endTime) {
      this.endTime = point.timestamp;
    }

    // 更新距离
    if (this.points.length > 1) {
      const prevPoint = this.points[this.points.length - 2];
      this.totalDistance += point.distanceTo(prevPoint);
    }

    // 触发实时分析
    this.updateRealTimeMetrics();
  }

  updateRealTimeMetrics() {
    if (this.points.length < 2) return;

    // 计算平均速度
    const duration = (this.endTime - this.startTime) / 1000; // 转换为秒
    this.averageVelocity = duration > 0 ? this.totalDistance / duration : 0;

    // 计算瞬时速度和最大速度
    const velocities = this.calculateVelocities();
    this.maxVelocity = Math.max(...velocities.map(v => v.magnitude));

    // 更新轨迹质量
    this.updateQuality();
  }

  calculateVelocities() {
    const velocities = [];
    
    for (let i = 1; i < this.points.length; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const dt = (p2.timestamp - p1.timestamp) / 1000; // 秒
      
      if (dt > 0) {
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const dz = p2.z - p1.z;
        const magnitude = Math.sqrt(dx * dx + dy * dy + dz * dz) / dt;
        
        velocities.push({
          x: dx / dt,
          y: dy / dt,
          z: dz / dt,
          magnitude,
          timestamp: p2.timestamp
        });
      }
    }
    
    return velocities;
  }

  calculateAccelerations() {
    const velocities = this.calculateVelocities();
    const accelerations = [];
    
    for (let i = 1; i < velocities.length; i++) {
      const v1 = velocities[i - 1];
      const v2 = velocities[i];
      const dt = (v2.timestamp - v1.timestamp) / 1000;
      
      if (dt > 0) {
        accelerations.push({
          x: (v2.x - v1.x) / dt,
          y: (v2.y - v1.y) / dt,
          z: (v2.z - v1.z) / dt,
          magnitude: (v2.magnitude - v1.magnitude) / dt,
          timestamp: v2.timestamp
        });
      }
    }
    
    this.acceleration = accelerations;
    return accelerations;
  }

  updateQuality() {
    let qualityScore = 0;
    
    // 基于点数量
    if (this.points.length >= 50) qualityScore += 25;
    else if (this.points.length >= 20) qualityScore += 15;
    else if (this.points.length >= 10) qualityScore += 10;
    
    // 基于置信度
    const avgConfidence = this.points.reduce((sum, p) => sum + p.confidence, 0) / this.points.length;
    qualityScore += avgConfidence * 25;
    
    // 基于时间连续性
    const timeGaps = this.calculateTimeGaps();
    const avgGap = timeGaps.reduce((sum, gap) => sum + gap, 0) / timeGaps.length;
    if (avgGap < 50) qualityScore += 25; // 小于50ms间隔
    else if (avgGap < 100) qualityScore += 15;
    else if (avgGap < 200) qualityScore += 10;
    
    // 基于平滑度
    const smoothness = this.calculateSmoothness();
    qualityScore += smoothness * 25;
    
    // 确定质量等级
    if (qualityScore >= 80) this.quality = TrajectoryQuality.EXCELLENT;
    else if (qualityScore >= 65) this.quality = TrajectoryQuality.GOOD;
    else if (qualityScore >= 45) this.quality = TrajectoryQuality.FAIR;
    else if (qualityScore >= 25) this.quality = TrajectoryQuality.POOR;
    else this.quality = TrajectoryQuality.INVALID;
    
    this.confidence = qualityScore / 100;
  }

  calculateTimeGaps() {
    const gaps = [];
    for (let i = 1; i < this.points.length; i++) {
      gaps.push(this.points[i].timestamp - this.points[i - 1].timestamp);
    }
    return gaps;
  }

  calculateSmoothness() {
    if (this.points.length < 3) return 0;
    
    let totalCurvature = 0;
    let validPoints = 0;
    
    for (let i = 1; i < this.points.length - 1; i++) {
      const p1 = this.points[i - 1];
      const p2 = this.points[i];
      const p3 = this.points[i + 1];
      
      // 计算曲率
      const curvature = this.calculateCurvature(p1, p2, p3);
      if (!isNaN(curvature)) {
        totalCurvature += curvature;
        validPoints++;
      }
    }
    
    const avgCurvature = validPoints > 0 ? totalCurvature / validPoints : 0;
    return Math.max(0, 1 - avgCurvature); // 曲率越小，平滑度越高
  }

  calculateCurvature(p1, p2, p3) {
    // 使用三点计算曲率
    const v1 = { x: p2.x - p1.x, y: p2.y - p1.y, z: p2.z - p1.z };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y, z: p3.z - p2.z };
    
    const cross = {
      x: v1.y * v2.z - v1.z * v2.y,
      y: v1.z * v2.x - v1.x * v2.z,
      z: v1.x * v2.y - v1.y * v2.x
    };
    
    const crossMagnitude = Math.sqrt(cross.x * cross.x + cross.y * cross.y + cross.z * cross.z);
    const v1Magnitude = Math.sqrt(v1.x * v1.x + v1.y * v1.y + v1.z * v1.z);
    
    return v1Magnitude > 0 ? crossMagnitude / Math.pow(v1Magnitude, 3) : 0;
  }

  smooth(windowSize = 5) {
    if (this.points.length < windowSize) {
      this.smoothedPoints = [...this.points];
      return;
    }

    this.smoothedPoints = [];
    const halfWindow = Math.floor(windowSize / 2);

    for (let i = 0; i < this.points.length; i++) {
      const start = Math.max(0, i - halfWindow);
      const end = Math.min(this.points.length - 1, i + halfWindow);
      
      let sumX = 0, sumY = 0, sumZ = 0, count = 0;
      
      for (let j = start; j <= end; j++) {
        sumX += this.points[j].x;
        sumY += this.points[j].y;
        sumZ += this.points[j].z;
        count++;
      }
      
      this.smoothedPoints.push(new Point3D(
        sumX / count,
        sumY / count,
        sumZ / count,
        this.points[i].timestamp,
        this.points[i].confidence
      ));
    }
  }

  getDuration() {
    return this.endTime && this.startTime ? this.endTime - this.startTime : 0;
  }

  getPointCount() {
    return this.points.length;
  }

  getBoundingBox() {
    if (this.points.length === 0) return null;
    
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    this.points.forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
      minZ = Math.min(minZ, point.z);
      maxZ = Math.max(maxZ, point.z);
    });
    
    return {
      min: new Point3D(minX, minY, minZ),
      max: new Point3D(maxX, maxY, maxZ),
      center: new Point3D(
        (minX + maxX) / 2,
        (minY + maxY) / 2,
        (minZ + maxZ) / 2
      ),
      dimensions: {
        width: maxX - minX,
        height: maxY - minY,
        depth: maxZ - minZ
      }
    };
  }

  clear() {
    this.points = [];
    this.smoothedPoints = [];
    this.acceleration = [];
    this.startTime = null;
    this.endTime = null;
    this.totalDistance = 0;
    this.averageVelocity = 0;
    this.maxVelocity = 0;
    this.quality = TrajectoryQuality.FAIR;
    this.confidence = 0;
  }

  toJSON() {
    return {
      keypoint: this.keypoint,
      points: this.points,
      startTime: this.startTime,
      endTime: this.endTime,
      totalDistance: this.totalDistance,
      averageVelocity: this.averageVelocity,
      maxVelocity: this.maxVelocity,
      type: this.type,
      quality: this.quality,
      confidence: this.confidence,
      metadata: this.metadata
    };
  }
}

/**
 * 轨迹模式识别器
 */
class TrajectoryPatternRecognizer {
  constructor() {
    this.patterns = new Map();
    this.initializePatterns();
  }

  initializePatterns() {
    // 初始化基本运动模式
    this.patterns.set(MovementPattern.WALKING, {
      characteristics: {
        rhythmic: true,
        cyclical: true,
        avgVelocity: { min: 0.5, max: 2.5 }, // m/s
        frequency: { min: 0.5, max: 2.0 }, // Hz
        verticalOscillation: { min: 0.02, max: 0.08 } // m
      },
      keypoints: ['left_ankle', 'right_ankle', 'left_hip', 'right_hip']
    });

    this.patterns.set(MovementPattern.RUNNING, {
      characteristics: {
        rhythmic: true,
        cyclical: true,
        avgVelocity: { min: 2.0, max: 8.0 },
        frequency: { min: 1.5, max: 4.0 },
        verticalOscillation: { min: 0.05, max: 0.15 }
      },
      keypoints: ['left_ankle', 'right_ankle', 'left_knee', 'right_knee']
    });

    this.patterns.set(MovementPattern.JUMPING, {
      characteristics: {
        explosive: true,
        highAcceleration: true,
        avgVelocity: { min: 1.0, max: 5.0 },
        verticalComponent: { min: 0.3, max: 2.0 },
        duration: { min: 0.5, max: 3.0 } // seconds
      },
      keypoints: ['left_ankle', 'right_ankle', 'center_hip']
    });

    this.patterns.set(MovementPattern.SQUATTING, {
      characteristics: {
        vertical: true,
        controlled: true,
        avgVelocity: { min: 0.1, max: 1.0 },
        range: { min: 0.2, max: 0.8 }, // vertical range
        symmetrical: true
      },
      keypoints: ['center_hip', 'left_knee', 'right_knee']
    });

    this.patterns.set(MovementPattern.REACHING, {
      characteristics: {
        directional: true,
        smooth: true,
        avgVelocity: { min: 0.2, max: 2.0 },
        acceleration: { min: 0.5, max: 5.0 },
        extension: true
      },
      keypoints: ['left_wrist', 'right_wrist', 'left_elbow', 'right_elbow']
    });
  }

  recognizePattern(trajectories) {
    const results = [];
    
    for (const [pattern, config] of this.patterns) {
      const score = this.calculatePatternScore(trajectories, config);
      if (score > 0.3) { // 阈值
        results.push({
          pattern,
          score,
          confidence: this.calculateConfidence(score, trajectories),
          details: this.analyzePatternDetails(trajectories, config)
        });
      }
    }
    
    // 按分数排序
    return results.sort((a, b) => b.score - a.score);
  }

  calculatePatternScore(trajectories, config) {
    let totalScore = 0;
    let validTrajectories = 0;
    
    // 检查相关关键点
    for (const keypoint of config.keypoints) {
      const trajectory = trajectories.get(keypoint);
      if (!trajectory || trajectory.points.length < 10) continue;
      
      let score = 0;
      const characteristics = config.characteristics;
      
      // 检查速度特征
      if (characteristics.avgVelocity) {
        const vel = trajectory.averageVelocity;
        if (vel >= characteristics.avgVelocity.min && vel <= characteristics.avgVelocity.max) {
          score += 0.3;
        }
      }
      
      // 检查节律性
      if (characteristics.rhythmic) {
        const rhythmScore = this.analyzeRhythm(trajectory);
        score += rhythmScore * 0.25;
      }
      
      // 检查周期性
      if (characteristics.cyclical) {
        const cyclicalScore = this.analyzeCyclical(trajectory);
        score += cyclicalScore * 0.25;
      }
      
      // 检查垂直振荡
      if (characteristics.verticalOscillation) {
        const oscillation = this.calculateVerticalOscillation(trajectory);
        if (oscillation >= characteristics.verticalOscillation.min && 
            oscillation <= characteristics.verticalOscillation.max) {
          score += 0.2;
        }
      }
      
      totalScore += score;
      validTrajectories++;
    }
    
    return validTrajectories > 0 ? totalScore / validTrajectories : 0;
  }

  analyzeRhythm(trajectory) {
    // 分析轨迹的节律性
    const velocities = trajectory.calculateVelocities();
    if (velocities.length < 10) return 0;
    
    // 计算速度的周期性
    const magnitudes = velocities.map(v => v.magnitude);
    const fft = this.simpleFFT(magnitudes);
    
    // 寻找主频率
    const dominantFreq = this.findDominantFrequency(fft);
    
    // 评估节律强度
    return dominantFreq.strength;
  }

  analyzeCyclical(trajectory) {
    // 分析轨迹的周期性
    if (trajectory.points.length < 20) return 0;
    
    const positions = trajectory.points.map(p => [p.x, p.y, p.z]);
    
    // 计算自相关
    const autocorr = this.calculateAutocorrelation(positions);
    
    // 寻找周期性峰值
    const peaks = this.findPeaks(autocorr);
    
    return peaks.length > 0 ? Math.min(peaks[0].value, 1.0) : 0;
  }

  calculateVerticalOscillation(trajectory) {
    if (trajectory.points.length < 2) return 0;
    
    const yValues = trajectory.points.map(p => p.y);
    const min = Math.min(...yValues);
    const max = Math.max(...yValues);
    
    return max - min;
  }

  simpleFFT(data) {
    // 简化的FFT实现（实际项目中应使用专业FFT库）
    const N = data.length;
    const result = [];
    
    for (let k = 0; k < N / 2; k++) {
      let real = 0, imag = 0;
      
      for (let n = 0; n < N; n++) {
        const angle = -2 * Math.PI * k * n / N;
        real += data[n] * Math.cos(angle);
        imag += data[n] * Math.sin(angle);
      }
      
      result.push({
        frequency: k / N,
        magnitude: Math.sqrt(real * real + imag * imag),
        phase: Math.atan2(imag, real)
      });
    }
    
    return result;
  }

  findDominantFrequency(fftResult) {
    let maxMagnitude = 0;
    let dominantFreq = 0;
    
    fftResult.forEach((bin, index) => {
      if (bin.magnitude > maxMagnitude && index > 0) { // 忽略DC分量
        maxMagnitude = bin.magnitude;
        dominantFreq = bin.frequency;
      }
    });
    
    // 计算强度（归一化）
    const totalEnergy = fftResult.reduce((sum, bin) => sum + bin.magnitude, 0);
    const strength = totalEnergy > 0 ? maxMagnitude / totalEnergy : 0;
    
    return { frequency: dominantFreq, strength };
  }

  calculateAutocorrelation(data) {
    const N = data.length;
    const result = [];
    
    for (let lag = 0; lag < N / 2; lag++) {
      let correlation = 0;
      let count = 0;
      
      for (let i = 0; i < N - lag; i++) {
        if (Array.isArray(data[i]) && Array.isArray(data[i + lag])) {
          // 多维数据
          let dotProduct = 0;
          for (let j = 0; j < data[i].length; j++) {
            dotProduct += data[i][j] * data[i + lag][j];
          }
          correlation += dotProduct;
        } else {
          // 一维数据
          correlation += data[i] * data[i + lag];
        }
        count++;
      }
      
      result.push(count > 0 ? correlation / count : 0);
    }
    
    return result;
  }

  findPeaks(data, minHeight = 0.1) {
    const peaks = [];
    
    for (let i = 1; i < data.length - 1; i++) {
      if (data[i] > data[i - 1] && data[i] > data[i + 1] && data[i] > minHeight) {
        peaks.push({ index: i, value: data[i] });
      }
    }
    
    return peaks.sort((a, b) => b.value - a.value);
  }

  calculateConfidence(score, trajectories) {
    // 基于多个因素计算置信度
    let confidence = score;
    
    // 考虑轨迹质量
    const avgQuality = Array.from(trajectories.values())
      .reduce((sum, traj) => sum + traj.confidence, 0) / trajectories.size;
    confidence *= avgQuality;
    
    // 考虑数据量
    const avgPointCount = Array.from(trajectories.values())
      .reduce((sum, traj) => sum + traj.points.length, 0) / trajectories.size;
    const dataFactor = Math.min(avgPointCount / 50, 1.0); // 50个点为满分
    confidence *= dataFactor;
    
    return Math.min(confidence, 1.0);
  }

  analyzePatternDetails(trajectories, config) {
    const details = {
      keypoints: [],
      metrics: {},
      characteristics: {}
    };
    
    // 分析每个关键点
    for (const keypoint of config.keypoints) {
      const trajectory = trajectories.get(keypoint);
      if (trajectory) {
        details.keypoints.push({
          name: keypoint,
          quality: trajectory.quality,
          confidence: trajectory.confidence,
          pointCount: trajectory.points.length,
          distance: trajectory.totalDistance,
          velocity: trajectory.averageVelocity
        });
      }
    }
    
    // 计算整体指标
    const allTrajectories = Array.from(trajectories.values());
    details.metrics = {
      avgVelocity: allTrajectories.reduce((sum, t) => sum + t.averageVelocity, 0) / allTrajectories.length,
      maxVelocity: Math.max(...allTrajectories.map(t => t.maxVelocity)),
      totalDistance: allTrajectories.reduce((sum, t) => sum + t.totalDistance, 0),
      avgQuality: allTrajectories.reduce((sum, t) => sum + t.confidence, 0) / allTrajectories.length
    };
    
    return details;
  }
}

/**
 * 轨迹预测器
 */
class TrajectoryPredictor {
  constructor() {
    this.models = new Map();
    this.predictionHorizon = 1000; // 1秒预测
    this.minPointsForPrediction = 10;
  }

  predictTrajectory(trajectory, steps = 10) {
    if (trajectory.points.length < this.minPointsForPrediction) {
      return null;
    }

    const method = this.selectPredictionMethod(trajectory);
    
    switch (method) {
      case 'linear':
        return this.linearPrediction(trajectory, steps);
      case 'polynomial':
        return this.polynomialPrediction(trajectory, steps);
      case 'kalman':
        return this.kalmanPrediction(trajectory, steps);
      default:
        return this.linearPrediction(trajectory, steps);
    }
  }

  selectPredictionMethod(trajectory) {
    // 基于轨迹特征选择预测方法
    const velocities = trajectory.calculateVelocities();
    const accelerations = trajectory.calculateAccelerations();
    
    // 计算速度变化的方差
    const velVariance = this.calculateVariance(velocities.map(v => v.magnitude));
    
    // 计算加速度变化的方差
    const accVariance = accelerations.length > 0 ? 
      this.calculateVariance(accelerations.map(a => a.magnitude)) : 0;
    
    if (velVariance < 0.1 && accVariance < 0.1) {
      return 'linear'; // 匀速运动
    } else if (accVariance < 0.5) {
      return 'polynomial'; // 匀加速运动
    } else {
      return 'kalman'; // 复杂运动
    }
  }

  linearPrediction(trajectory, steps) {
    const recentPoints = trajectory.points.slice(-5); // 使用最近5个点
    if (recentPoints.length < 2) return null;
    
    // 计算平均速度
    const velocities = [];
    for (let i = 1; i < recentPoints.length; i++) {
      const p1 = recentPoints[i - 1];
      const p2 = recentPoints[i];
      const dt = (p2.timestamp - p1.timestamp) / 1000;
      
      if (dt > 0) {
        velocities.push({
          x: (p2.x - p1.x) / dt,
          y: (p2.y - p1.y) / dt,
          z: (p2.z - p1.z) / dt
        });
      }
    }
    
    if (velocities.length === 0) return null;
    
    // 平均速度
    const avgVel = {
      x: velocities.reduce((sum, v) => sum + v.x, 0) / velocities.length,
      y: velocities.reduce((sum, v) => sum + v.y, 0) / velocities.length,
      z: velocities.reduce((sum, v) => sum + v.z, 0) / velocities.length
    };
    
    // 预测未来点
    const predictions = [];
    const lastPoint = recentPoints[recentPoints.length - 1];
    const timeStep = 100; // 100ms间隔
    
    for (let i = 1; i <= steps; i++) {
      const dt = (timeStep * i) / 1000; // 转换为秒
      predictions.push(new Point3D(
        lastPoint.x + avgVel.x * dt,
        lastPoint.y + avgVel.y * dt,
        lastPoint.z + avgVel.z * dt,
        lastPoint.timestamp + timeStep * i,
        Math.max(0.1, lastPoint.confidence - i * 0.1) // 置信度递减
      ));
    }
    
    return {
      method: 'linear',
      predictions,
      confidence: this.calculatePredictionConfidence(trajectory, 'linear')
    };
  }

  polynomialPrediction(trajectory, steps) {
    const recentPoints = trajectory.points.slice(-10);
    if (recentPoints.length < 5) return this.linearPrediction(trajectory, steps);
    
    // 使用最小二乘法拟合二次多项式
    const timeBase = recentPoints[0].timestamp;
    const normalizedTimes = recentPoints.map(p => (p.timestamp - timeBase) / 1000);
    
    // 分别对x, y, z坐标拟合
    const xCoeffs = this.fitPolynomial(normalizedTimes, recentPoints.map(p => p.x), 2);
    const yCoeffs = this.fitPolynomial(normalizedTimes, recentPoints.map(p => p.y), 2);
    const zCoeffs = this.fitPolynomial(normalizedTimes, recentPoints.map(p => p.z), 2);
    
    // 预测未来点
    const predictions = [];
    const lastTime = normalizedTimes[normalizedTimes.length - 1];
    const timeStep = 0.1; // 0.1秒间隔
    
    for (let i = 1; i <= steps; i++) {
      const t = lastTime + timeStep * i;
      const x = this.evaluatePolynomial(xCoeffs, t);
      const y = this.evaluatePolynomial(yCoeffs, t);
      const z = this.evaluatePolynomial(zCoeffs, t);
      
      predictions.push(new Point3D(
        x, y, z,
        timeBase + t * 1000,
        Math.max(0.1, 0.8 - i * 0.05)
      ));
    }
    
    return {
      method: 'polynomial',
      predictions,
      confidence: this.calculatePredictionConfidence(trajectory, 'polynomial'),
      coefficients: { x: xCoeffs, y: yCoeffs, z: zCoeffs }
    };
  }

  kalmanPrediction(trajectory, steps) {
    // 简化的卡尔曼滤波预测
    const recentPoints = trajectory.points.slice(-15);
    if (recentPoints.length < 10) return this.polynomialPrediction(trajectory, steps);
    
    // 状态向量: [x, y, z, vx, vy, vz]
    let state = this.initializeKalmanState(recentPoints);
    const processNoise = 0.1;
    const measurementNoise = 0.05;
    
    // 状态转移矩阵 (简化为匀速模型)
    const dt = 0.1; // 时间步长
    const F = [
      [1, 0, 0, dt, 0, 0],
      [0, 1, 0, 0, dt, 0],
      [0, 0, 1, 0, 0, dt],
      [0, 0, 0, 1, 0, 0],
      [0, 0, 0, 0, 1, 0],
      [0, 0, 0, 0, 0, 1]
    ];
    
    const predictions = [];
    const lastPoint = recentPoints[recentPoints.length - 1];
    
    for (let i = 1; i <= steps; i++) {
      // 预测步骤
      state = this.matrixVectorMultiply(F, state);
      
      predictions.push(new Point3D(
        state[0], state[1], state[2],
        lastPoint.timestamp + dt * 1000 * i,
        Math.max(0.1, 0.9 - i * 0.03)
      ));
    }
    
    return {
      method: 'kalman',
      predictions,
      confidence: this.calculatePredictionConfidence(trajectory, 'kalman')
    };
  }

  initializeKalmanState(points) {
    const lastPoint = points[points.length - 1];
    const prevPoint = points[points.length - 2];
    
    const dt = (lastPoint.timestamp - prevPoint.timestamp) / 1000;
    const vx = dt > 0 ? (lastPoint.x - prevPoint.x) / dt : 0;
    const vy = dt > 0 ? (lastPoint.y - prevPoint.y) / dt : 0;
    const vz = dt > 0 ? (lastPoint.z - prevPoint.z) / dt : 0;
    
    return [lastPoint.x, lastPoint.y, lastPoint.z, vx, vy, vz];
  }

  fitPolynomial(x, y, degree) {
    const n = x.length;
    const A = [];
    const b = y.slice();
    
    // 构建设计矩阵
    for (let i = 0; i < n; i++) {
      const row = [];
      for (let j = 0; j <= degree; j++) {
        row.push(Math.pow(x[i], j));
      }
      A.push(row);
    }
    
    // 使用正规方程求解 (A^T * A) * coeffs = A^T * b
    return this.solveNormalEquations(A, b);
  }

  evaluatePolynomial(coeffs, x) {
    let result = 0;
    for (let i = 0; i < coeffs.length; i++) {
      result += coeffs[i] * Math.pow(x, i);
    }
    return result;
  }

  solveNormalEquations(A, b) {
    // 简化的正规方程求解（实际项目中应使用数值库）
    const AT = this.transpose(A);
    const ATA = this.matrixMultiply(AT, A);
    const ATb = this.matrixVectorMultiply(AT, b);
    
    // 使用高斯消元法求解
    return this.gaussianElimination(ATA, ATb);
  }

  transpose(matrix) {
    const rows = matrix.length;
    const cols = matrix[0].length;
    const result = [];
    
    for (let j = 0; j < cols; j++) {
      const row = [];
      for (let i = 0; i < rows; i++) {
        row.push(matrix[i][j]);
      }
      result.push(row);
    }
    
    return result;
  }

  matrixMultiply(A, B) {
    const rowsA = A.length;
    const colsA = A[0].length;
    const colsB = B[0].length;
    const result = [];
    
    for (let i = 0; i < rowsA; i++) {
      const row = [];
      for (let j = 0; j < colsB; j++) {
        let sum = 0;
        for (let k = 0; k < colsA; k++) {
          sum += A[i][k] * B[k][j];
        }
        row.push(sum);
      }
      result.push(row);
    }
    
    return result;
  }

  matrixVectorMultiply(matrix, vector) {
    const result = [];
    
    for (let i = 0; i < matrix.length; i++) {
      let sum = 0;
      for (let j = 0; j < vector.length; j++) {
        sum += matrix[i][j] * vector[j];
      }
      result.push(sum);
    }
    
    return result;
  }

  gaussianElimination(A, b) {
    const n = A.length;
    const augmented = A.map((row, i) => [...row, b[i]]);
    
    // 前向消元
    for (let i = 0; i < n; i++) {
      // 寻找主元
      let maxRow = i;
      for (let k = i + 1; k < n; k++) {
        if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
          maxRow = k;
        }
      }
      
      // 交换行
      [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
      
      // 消元
      for (let k = i + 1; k < n; k++) {
        const factor = augmented[k][i] / augmented[i][i];
        for (let j = i; j < n + 1; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
    
    // 回代
    const x = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      x[i] = augmented[i][n];
      for (let j = i + 1; j < n; j++) {
        x[i] -= augmented[i][j] * x[j];
      }
      x[i] /= augmented[i][i];
    }
    
    return x;
  }

  calculateVariance(data) {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return variance;
  }

  calculatePredictionConfidence(trajectory, method) {
    let confidence = 0.5; // 基础置信度
    
    // 基于轨迹质量
    confidence += trajectory.confidence * 0.3;
    
    // 基于数据量
    const dataFactor = Math.min(trajectory.points.length / 50, 1.0);
    confidence += dataFactor * 0.2;
    
    // 基于方法复杂度
    const methodFactors = {
      'linear': 0.6,
      'polynomial': 0.8,
      'kalman': 1.0
    };
    confidence *= methodFactors[method] || 0.5;
    
    return Math.min(confidence, 1.0);
  }
}

/**
 * 运动轨迹分析器主类
 */
export class TrajectoryAnalyzer {
  constructor(options = {}) {
    this.options = options;
    this.eventBus = options.eventBus;
    this.config = {
      maxTrajectories: 50,
      maxPointsPerTrajectory: 1000,
      smoothingWindow: 5,
      predictionSteps: 10,
      analysisInterval: 100, // ms
      enablePrediction: true,
      enablePatternRecognition: true,
      ...(options.config || {})
    };
    
    this.trajectories = new Map(); // keypoint -> Trajectory
    this.patternRecognizer = new TrajectoryPatternRecognizer();
    this.predictor = new TrajectoryPredictor();
    
    this.isAnalyzing = false;
    this.analysisTimer = null;
    this.eventListeners = new Map();
    
    this.analysisResults = {
      patterns: [],
      predictions: new Map(),
      statistics: {},
      anomalies: []
    };
    
    this.performanceMetrics = {
      analysisTime: 0,
      predictionTime: 0,
      patternRecognitionTime: 0,
      totalAnalyses: 0
    };
  }

  async initialize() {
    console.log('轨迹分析器已初始化');
    if (this.eventBus) {
      this.eventBus.emit('analyzer:initialized', { name: 'TrajectoryAnalyzer' });
    }
    this.emit('initialized', { timestamp: Date.now() });
  }

  startAnalysis() {
    if (this.isAnalyzing) return;
    
    this.isAnalyzing = true;
    this.analysisTimer = setInterval(() => {
      this.performAnalysis();
    }, this.config.analysisInterval);
    
    this.emit('analysisStarted', { timestamp: Date.now() });
    console.log('轨迹分析已开始');
  }

  stopAnalysis() {
    if (!this.isAnalyzing) return;
    
    this.isAnalyzing = false;
    if (this.analysisTimer) {
      clearInterval(this.analysisTimer);
      this.analysisTimer = null;
    }
    
    this.emit('analysisStopped', { timestamp: Date.now() });
    console.log('轨迹分析已停止');
  }

  addPoseData(poseData, timestamp = Date.now()) {
    if (!poseData || !poseData.keypoints) return;
    
    // 为每个关键点添加轨迹点
    poseData.keypoints.forEach(keypoint => {
      if (!keypoint.name || keypoint.confidence < 0.3) return;
      
      // 获取或创建轨迹
      if (!this.trajectories.has(keypoint.name)) {
        this.trajectories.set(keypoint.name, new Trajectory(
          keypoint.name, 
          this.config.maxPointsPerTrajectory
        ));
      }
      
      const trajectory = this.trajectories.get(keypoint.name);
      
      // 添加3D点（如果只有2D数据，z设为0）
      const point = new Point3D(
        keypoint.x || 0,
        keypoint.y || 0,
        keypoint.z || 0,
        timestamp,
        keypoint.confidence || 1.0
      );
      
      trajectory.addPoint(point);
    });
    
    // 限制轨迹数量
    if (this.trajectories.size > this.config.maxTrajectories) {
      const oldestTrajectory = Array.from(this.trajectories.entries())
        .sort((a, b) => a[1].startTime - b[1].startTime)[0];
      this.trajectories.delete(oldestTrajectory[0]);
    }
  }

  performAnalysis() {
    const startTime = performance.now();
    
    try {
      // 1. 平滑轨迹
      this.smoothTrajectories();
      
      // 2. 模式识别
      if (this.config.enablePatternRecognition) {
        this.performPatternRecognition();
      }
      
      // 3. 轨迹预测
      if (this.config.enablePrediction) {
        this.performTrajectoryPrediction();
      }
      
      // 4. 统计分析
      this.updateStatistics();
      
      // 5. 异常检测
      this.detectAnomalies();
      
      // 更新性能指标
      this.performanceMetrics.analysisTime = performance.now() - startTime;
      this.performanceMetrics.totalAnalyses++;
      
      // 触发分析完成事件
      this.emit('analysisCompleted', {
        results: this.analysisResults,
        metrics: this.performanceMetrics,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('轨迹分析错误:', error);
      this.emit('analysisError', { error, timestamp: Date.now() });
    }
  }

  smoothTrajectories() {
    for (const trajectory of this.trajectories.values()) {
      if (trajectory.points.length >= this.config.smoothingWindow) {
        trajectory.smooth(this.config.smoothingWindow);
      }
    }
  }

  performPatternRecognition() {
    const startTime = performance.now();
    
    // 只分析有足够数据的轨迹
    const validTrajectories = new Map();
    for (const [keypoint, trajectory] of this.trajectories) {
      if (trajectory.points.length >= 20 && trajectory.quality !== TrajectoryQuality.INVALID) {
        validTrajectories.set(keypoint, trajectory);
      }
    }
    
    if (validTrajectories.size > 0) {
      this.analysisResults.patterns = this.patternRecognizer.recognizePattern(validTrajectories);
    }
    
    this.performanceMetrics.patternRecognitionTime = performance.now() - startTime;
  }

  performTrajectoryPrediction() {
    const startTime = performance.now();
    
    this.analysisResults.predictions.clear();
    
    for (const [keypoint, trajectory] of this.trajectories) {
      if (trajectory.points.length >= 10 && trajectory.quality !== TrajectoryQuality.INVALID) {
        const prediction = this.predictor.predictTrajectory(
          trajectory, 
          this.config.predictionSteps
        );
        
        if (prediction) {
          this.analysisResults.predictions.set(keypoint, prediction);
        }
      }
    }
    
    this.performanceMetrics.predictionTime = performance.now() - startTime;
  }

  updateStatistics() {
    const trajectoryStats = [];
    let totalDistance = 0;
    let totalVelocity = 0;
    let validTrajectories = 0;
    
    for (const [keypoint, trajectory] of this.trajectories) {
      if (trajectory.points.length > 0) {
        const stats = {
          keypoint,
          pointCount: trajectory.points.length,
          duration: trajectory.getDuration(),
          distance: trajectory.totalDistance,
          averageVelocity: trajectory.averageVelocity,
          maxVelocity: trajectory.maxVelocity,
          quality: trajectory.quality,
          confidence: trajectory.confidence,
          boundingBox: trajectory.getBoundingBox()
        };
        
        trajectoryStats.push(stats);
        totalDistance += trajectory.totalDistance;
        totalVelocity += trajectory.averageVelocity;
        validTrajectories++;
      }
    }
    
    this.analysisResults.statistics = {
      trajectoryCount: this.trajectories.size,
      validTrajectoryCount: validTrajectories,
      totalDistance,
      averageVelocity: validTrajectories > 0 ? totalVelocity / validTrajectories : 0,
      trajectoryStats,
      analysisTime: this.performanceMetrics.analysisTime,
      lastUpdate: Date.now()
    };
  }

  detectAnomalies() {
    const anomalies = [];
    
    for (const [keypoint, trajectory] of this.trajectories) {
      // 检测速度异常
      if (trajectory.maxVelocity > 10) { // 10 m/s 阈值
        anomalies.push({
          type: 'high_velocity',
          keypoint,
          value: trajectory.maxVelocity,
          threshold: 10,
          severity: 'warning',
          timestamp: Date.now()
        });
      }
      
      // 检测轨迹质量异常
      if (trajectory.quality === TrajectoryQuality.POOR || 
          trajectory.quality === TrajectoryQuality.INVALID) {
        anomalies.push({
          type: 'poor_quality',
          keypoint,
          quality: trajectory.quality,
          confidence: trajectory.confidence,
          severity: 'error',
          timestamp: Date.now()
        });
      }
      
      // 检测数据缺失
      if (trajectory.points.length > 0) {
        const timeGaps = trajectory.calculateTimeGaps();
        const maxGap = Math.max(...timeGaps);
        if (maxGap > 500) { // 500ms间隔
          anomalies.push({
            type: 'data_gap',
            keypoint,
            maxGap,
            threshold: 500,
            severity: 'warning',
            timestamp: Date.now()
          });
        }
      }
    }
    
    this.analysisResults.anomalies = anomalies;
    
    // 触发异常事件
    if (anomalies.length > 0) {
      this.emit('anomaliesDetected', { anomalies, timestamp: Date.now() });
    }
  }

  getTrajectory(keypoint) {
    return this.trajectories.get(keypoint);
  }

  getAllTrajectories() {
    return new Map(this.trajectories);
  }

  getAnalysisResults() {
    return { ...this.analysisResults };
  }

  getPerformanceMetrics() {
    return { ...this.performanceMetrics };
  }

  clearTrajectories() {
    this.trajectories.clear();
    this.analysisResults.patterns = [];
    this.analysisResults.predictions.clear();
    this.analysisResults.statistics = {};
    this.analysisResults.anomalies = [];
    
    this.emit('trajectoriesCleared', { timestamp: Date.now() });
  }

  clearTrajectory(keypoint) {
    if (this.trajectories.has(keypoint)) {
      this.trajectories.get(keypoint).clear();
      this.emit('trajectoryCleared', { keypoint, timestamp: Date.now() });
    }
  }

  exportTrajectoryData(format = 'json') {
    const data = {
      trajectories: {},
      analysisResults: this.analysisResults,
      performanceMetrics: this.performanceMetrics,
      exportTime: Date.now()
    };
    
    // 导出轨迹数据
    for (const [keypoint, trajectory] of this.trajectories) {
      data.trajectories[keypoint] = trajectory.toJSON();
    }
    
    switch (format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      default:
        return data;
    }
  }

  convertToCSV(data) {
    const csvLines = [];
    csvLines.push('keypoint,timestamp,x,y,z,confidence,velocity,quality');
    
    for (const [keypoint, trajectoryData] of Object.entries(data.trajectories)) {
      trajectoryData.points.forEach(point => {
        csvLines.push([
          keypoint,
          point.timestamp,
          point.x,
          point.y,
          point.z,
          point.confidence,
          trajectoryData.averageVelocity,
          trajectoryData.quality
        ].join(','));
      });
    }
    
    return csvLines.join('\n');
  }

  importTrajectoryData(data, format = 'json') {
    try {
      let parsedData;
      
      if (format === 'json') {
        parsedData = typeof data === 'string' ? JSON.parse(data) : data;
      } else {
        throw new Error('暂不支持该格式的导入');
      }
      
      // 清空现有数据
      this.clearTrajectories();
      
      // 导入轨迹数据
      if (parsedData.trajectories) {
        for (const [keypoint, trajectoryData] of Object.entries(parsedData.trajectories)) {
          const trajectory = new Trajectory(keypoint, this.config.maxPointsPerTrajectory);
          
          // 恢复轨迹点
          trajectoryData.points.forEach(pointData => {
            const point = new Point3D(
              pointData.x,
              pointData.y,
              pointData.z,
              pointData.timestamp,
              pointData.confidence
            );
            trajectory.addPoint(point);
          });
          
          // 恢复其他属性
          trajectory.type = trajectoryData.type;
          trajectory.quality = trajectoryData.quality;
          trajectory.confidence = trajectoryData.confidence;
          trajectory.metadata = trajectoryData.metadata || {};
          
          this.trajectories.set(keypoint, trajectory);
        }
      }
      
      this.emit('dataImported', { 
        trajectoryCount: this.trajectories.size,
        timestamp: Date.now() 
      });
      
      console.log(`成功导入 ${this.trajectories.size} 条轨迹数据`);
      
    } catch (error) {
      console.error('导入轨迹数据失败:', error);
      this.emit('importError', { error, timestamp: Date.now() });
      throw error;
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
          console.error(`轨迹分析器事件回调错误 (${event}):`, error);
        }
      });
    }
  }

  destroy() {
    this.stopAnalysis();
    this.clearTrajectories();
    this.eventListeners.clear();
    
    console.log('轨迹分析器已销毁');
  }
}

// 导出相关类和枚举
export {
  Point3D,
  Trajectory,
  TrajectoryPatternRecognizer,
  TrajectoryPredictor,
  TrajectoryType,
  MovementPattern,
  AnalysisDimension,
  TrajectoryQuality
};

// 默认导出
export default TrajectoryAnalyzer;