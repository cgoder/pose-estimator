/**
 * 轨迹分析器
 * 分析人体关键点的运动轨迹、模式识别和运动预测
 */

import { Logger } from '../utils/Logger.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { EventBus } from '../utils/EventBus.js';

export class TrajectoryAnalyzer {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 轨迹设置
            maxTrajectoryLength: options.maxTrajectoryLength || 100,
            minTrajectoryLength: options.minTrajectoryLength || 5,
            smoothingWindow: options.smoothingWindow || 5,
            samplingRate: options.samplingRate || 30, // FPS
            
            // 分析设置
            enablePatternRecognition: options.enablePatternRecognition !== false,
            enableMotionPrediction: options.enableMotionPrediction !== false,
            enableVelocityAnalysis: options.enableVelocityAnalysis !== false,
            enableAccelerationAnalysis: options.enableAccelerationAnalysis !== false,
            enableDirectionAnalysis: options.enableDirectionAnalysis !== false,
            enableGestureRecognition: options.enableGestureRecognition !== false,
            
            // 阈值设置
            minConfidence: options.minConfidence || 0.5,
            velocityThreshold: options.velocityThreshold || 10, // 像素/帧
            accelerationThreshold: options.accelerationThreshold || 5, // 像素/帧²
            directionChangeThreshold: options.directionChangeThreshold || 30, // 度
            stationaryThreshold: options.stationaryThreshold || 2, // 像素
            
            // 模式识别
            patternMatchThreshold: options.patternMatchThreshold || 0.8,
            gestureTemplates: options.gestureTemplates || {},
            
            // 预测设置
            predictionHorizon: options.predictionHorizon || 10, // 帧数
            predictionMethod: options.predictionMethod || 'linear', // linear, polynomial, kalman
            
            // 调试设置
            debug: options.debug || false,
            enableVisualization: options.enableVisualization !== false,
            
            ...options
        };
        
        // 轨迹数据
        this.trajectories = new Map(); // 每个关键点的轨迹
        this.smoothedTrajectories = new Map(); // 平滑后的轨迹
        this.velocityTrajectories = new Map(); // 速度轨迹
        this.accelerationTrajectories = new Map(); // 加速度轨迹
        
        // 分析结果
        this.currentAnalysis = {
            trajectories: {},
            patterns: {},
            predictions: {},
            gestures: {},
            statistics: {},
            timestamp: null
        };
        
        // 模式库
        this.patternLibrary = new Map();
        this.gestureLibrary = new Map();
        
        // 统计信息
        this.stats = {
            totalFrames: 0,
            totalTrajectories: 0,
            patternsDetected: 0,
            gesturesRecognized: 0,
            predictionsGenerated: 0,
            averageProcessingTime: 0
        };
        
        // 工具实例
        this.logger = new Logger({ prefix: 'TrajectoryAnalyzer' });
        this.performanceMonitor = new PerformanceMonitor();
        this.eventBus = options.eventBus || new EventBus();
        
        // 缓存
        this.cache = new Map();
        
        this.init();
    }
    
    /**
     * 初始化轨迹分析器
     */
    init() {
        try {
            // 初始化默认手势模板
            this.initializeGestureTemplates();
            
            // 初始化模式库
            this.initializePatternLibrary();
            
            if (this.options.debug) {
                this.logger.info('轨迹分析器已初始化', this.options);
            }
            
        } catch (error) {
            this.logger.error('轨迹分析器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 初始化手势模板
     */
    initializeGestureTemplates() {
        // 基本手势模板
        const basicGestures = {
            wave: {
                name: 'wave',
                description: '挥手',
                keypoints: ['left_wrist', 'right_wrist'],
                pattern: 'oscillation',
                minDuration: 1000, // 毫秒
                maxDuration: 3000,
                minAmplitude: 50, // 像素
                frequency: [1, 3] // Hz
            },
            
            clap: {
                name: 'clap',
                description: '拍手',
                keypoints: ['left_wrist', 'right_wrist'],
                pattern: 'convergence',
                minDuration: 200,
                maxDuration: 1000,
                maxDistance: 100 // 像素
            },
            
            jump: {
                name: 'jump',
                description: '跳跃',
                keypoints: ['left_ankle', 'right_ankle', 'left_hip', 'right_hip'],
                pattern: 'vertical_movement',
                minDuration: 500,
                maxDuration: 2000,
                minAmplitude: 30
            },
            
            squat: {
                name: 'squat',
                description: '深蹲',
                keypoints: ['left_knee', 'right_knee', 'left_hip', 'right_hip'],
                pattern: 'vertical_oscillation',
                minDuration: 2000,
                maxDuration: 5000,
                minAmplitude: 50
            },
            
            walk: {
                name: 'walk',
                description: '行走',
                keypoints: ['left_ankle', 'right_ankle'],
                pattern: 'alternating_movement',
                minDuration: 2000,
                maxDuration: 10000,
                minAmplitude: 20
            }
        };
        
        for (const [name, template] of Object.entries(basicGestures)) {
            this.gestureLibrary.set(name, template);
        }
        
        // 添加用户自定义模板
        for (const [name, template] of Object.entries(this.options.gestureTemplates)) {
            this.gestureLibrary.set(name, template);
        }
    }
    
    /**
     * 初始化模式库
     */
    initializePatternLibrary() {
        const basicPatterns = {
            linear: {
                name: 'linear',
                description: '直线运动',
                detector: this.detectLinearPattern.bind(this)
            },
            
            circular: {
                name: 'circular',
                description: '圆形运动',
                detector: this.detectCircularPattern.bind(this)
            },
            
            oscillation: {
                name: 'oscillation',
                description: '振荡运动',
                detector: this.detectOscillationPattern.bind(this)
            },
            
            spiral: {
                name: 'spiral',
                description: '螺旋运动',
                detector: this.detectSpiralPattern.bind(this)
            },
            
            zigzag: {
                name: 'zigzag',
                description: '锯齿运动',
                detector: this.detectZigzagPattern.bind(this)
            }
        };
        
        for (const [name, pattern] of Object.entries(basicPatterns)) {
            this.patternLibrary.set(name, pattern);
        }
    }
    
    /**
     * 分析轨迹
     * @param {Array} poses - 姿态数据
     * @param {number} timestamp - 时间戳
     * @returns {Object} 分析结果
     */
    analyze(poses, timestamp = Date.now()) {
        const startTime = performance.now();
        
        try {
            if (!poses || poses.length === 0) {
                return null;
            }
            
            // 选择最佳姿态
            const bestPose = this.selectBestPose(poses);
            if (!bestPose) {
                return null;
            }
            
            // 更新轨迹数据
            this.updateTrajectories(bestPose, timestamp);
            
            // 执行各种分析
            const analysis = {
                timestamp,
                trajectories: this.analyzeTrajectoryProperties(),
                patterns: this.options.enablePatternRecognition ? this.recognizePatterns() : {},
                predictions: this.options.enableMotionPrediction ? this.predictMotion() : {},
                gestures: this.options.enableGestureRecognition ? this.recognizeGestures() : {},
                statistics: this.calculateStatistics()
            };
            
            // 更新当前分析结果
            this.currentAnalysis = analysis;
            
            // 更新统计信息
            this.updateStats(performance.now() - startTime);
            
            // 触发事件
            this.eventBus.emit('trajectoryAnalyzed', analysis);
            
            if (this.options.debug) {
                this.logger.debug('轨迹分析完成', {
                    processingTime: performance.now() - startTime,
                    trajectoryCount: Object.keys(analysis.trajectories).length,
                    patternsFound: Object.keys(analysis.patterns).length
                });
            }
            
            return analysis;
            
        } catch (error) {
            this.logger.error('轨迹分析失败:', error);
            return null;
        }
    }
    
    /**
     * 选择最佳姿态
     * @param {Array} poses - 姿态数组
     * @returns {Object} 最佳姿态
     */
    selectBestPose(poses) {
        let bestPose = null;
        let bestScore = 0;
        
        for (const pose of poses) {
            if (!pose.keypoints) continue;
            
            // 计算姿态质量分数
            let totalScore = 0;
            let validKeypoints = 0;
            
            for (const keypoint of pose.keypoints) {
                if (keypoint.score && keypoint.score >= this.options.minConfidence) {
                    totalScore += keypoint.score;
                    validKeypoints++;
                }
            }
            
            const averageScore = validKeypoints > 0 ? totalScore / validKeypoints : 0;
            
            if (averageScore > bestScore) {
                bestScore = averageScore;
                bestPose = pose;
            }
        }
        
        return bestPose;
    }
    
    /**
     * 更新轨迹数据
     * @param {Object} pose - 姿态数据
     * @param {number} timestamp - 时间戳
     */
    updateTrajectories(pose, timestamp) {
        for (let i = 0; i < pose.keypoints.length; i++) {
            const keypoint = pose.keypoints[i];
            
            if (keypoint.score >= this.options.minConfidence) {
                const keypointName = `keypoint_${i}`;
                
                // 获取或创建轨迹
                if (!this.trajectories.has(keypointName)) {
                    this.trajectories.set(keypointName, []);
                    this.smoothedTrajectories.set(keypointName, []);
                    this.velocityTrajectories.set(keypointName, []);
                    this.accelerationTrajectories.set(keypointName, []);
                }
                
                const trajectory = this.trajectories.get(keypointName);
                
                // 添加新点
                const point = {
                    x: keypoint.x,
                    y: keypoint.y,
                    z: keypoint.z || 0,
                    confidence: keypoint.score,
                    timestamp
                };
                
                trajectory.push(point);
                
                // 限制轨迹长度
                if (trajectory.length > this.options.maxTrajectoryLength) {
                    trajectory.shift();
                }
                
                // 更新平滑轨迹
                this.updateSmoothedTrajectory(keypointName);
                
                // 更新速度和加速度轨迹
                if (this.options.enableVelocityAnalysis) {
                    this.updateVelocityTrajectory(keypointName);
                }
                
                if (this.options.enableAccelerationAnalysis) {
                    this.updateAccelerationTrajectory(keypointName);
                }
            }
        }
        
        this.stats.totalFrames++;
    }
    
    /**
     * 更新平滑轨迹
     * @param {string} keypointName - 关键点名称
     */
    updateSmoothedTrajectory(keypointName) {
        const trajectory = this.trajectories.get(keypointName);
        const smoothedTrajectory = this.smoothedTrajectories.get(keypointName);
        
        if (trajectory.length < this.options.smoothingWindow) {
            return;
        }
        
        // 使用移动平均进行平滑
        const recentPoints = trajectory.slice(-this.options.smoothingWindow);
        
        const smoothedPoint = {
            x: recentPoints.reduce((sum, p) => sum + p.x, 0) / recentPoints.length,
            y: recentPoints.reduce((sum, p) => sum + p.y, 0) / recentPoints.length,
            z: recentPoints.reduce((sum, p) => sum + p.z, 0) / recentPoints.length,
            confidence: recentPoints.reduce((sum, p) => sum + p.confidence, 0) / recentPoints.length,
            timestamp: recentPoints[recentPoints.length - 1].timestamp
        };
        
        smoothedTrajectory.push(smoothedPoint);
        
        // 限制平滑轨迹长度
        if (smoothedTrajectory.length > this.options.maxTrajectoryLength) {
            smoothedTrajectory.shift();
        }
    }
    
    /**
     * 更新速度轨迹
     * @param {string} keypointName - 关键点名称
     */
    updateVelocityTrajectory(keypointName) {
        const smoothedTrajectory = this.smoothedTrajectories.get(keypointName);
        const velocityTrajectory = this.velocityTrajectories.get(keypointName);
        
        if (smoothedTrajectory.length < 2) {
            return;
        }
        
        const current = smoothedTrajectory[smoothedTrajectory.length - 1];
        const previous = smoothedTrajectory[smoothedTrajectory.length - 2];
        
        const deltaTime = (current.timestamp - previous.timestamp) / 1000; // 秒
        
        if (deltaTime > 0) {
            const velocity = {
                x: (current.x - previous.x) / deltaTime,
                y: (current.y - previous.y) / deltaTime,
                z: (current.z - previous.z) / deltaTime,
                magnitude: Math.sqrt(
                    Math.pow(current.x - previous.x, 2) + 
                    Math.pow(current.y - previous.y, 2) + 
                    Math.pow(current.z - previous.z, 2)
                ) / deltaTime,
                direction: Math.atan2(current.y - previous.y, current.x - previous.x) * (180 / Math.PI),
                timestamp: current.timestamp
            };
            
            velocityTrajectory.push(velocity);
            
            // 限制速度轨迹长度
            if (velocityTrajectory.length > this.options.maxTrajectoryLength) {
                velocityTrajectory.shift();
            }
        }
    }
    
    /**
     * 更新加速度轨迹
     * @param {string} keypointName - 关键点名称
     */
    updateAccelerationTrajectory(keypointName) {
        const velocityTrajectory = this.velocityTrajectories.get(keypointName);
        const accelerationTrajectory = this.accelerationTrajectories.get(keypointName);
        
        if (velocityTrajectory.length < 2) {
            return;
        }
        
        const current = velocityTrajectory[velocityTrajectory.length - 1];
        const previous = velocityTrajectory[velocityTrajectory.length - 2];
        
        const deltaTime = (current.timestamp - previous.timestamp) / 1000; // 秒
        
        if (deltaTime > 0) {
            const acceleration = {
                x: (current.x - previous.x) / deltaTime,
                y: (current.y - previous.y) / deltaTime,
                z: (current.z - previous.z) / deltaTime,
                magnitude: (current.magnitude - previous.magnitude) / deltaTime,
                timestamp: current.timestamp
            };
            
            accelerationTrajectory.push(acceleration);
            
            // 限制加速度轨迹长度
            if (accelerationTrajectory.length > this.options.maxTrajectoryLength) {
                accelerationTrajectory.shift();
            }
        }
    }
    
    /**
     * 分析轨迹属性
     * @returns {Object} 轨迹属性
     */
    analyzeTrajectoryProperties() {
        const properties = {};
        
        for (const [keypointName, trajectory] of this.trajectories) {
            if (trajectory.length < this.options.minTrajectoryLength) {
                continue;
            }
            
            const smoothedTrajectory = this.smoothedTrajectories.get(keypointName) || [];
            const velocityTrajectory = this.velocityTrajectories.get(keypointName) || [];
            const accelerationTrajectory = this.accelerationTrajectories.get(keypointName) || [];
            
            properties[keypointName] = {
                length: trajectory.length,
                duration: this.calculateTrajectoryDuration(trajectory),
                distance: this.calculateTrajectoryDistance(smoothedTrajectory),
                displacement: this.calculateDisplacement(trajectory),
                curvature: this.calculateCurvature(smoothedTrajectory),
                smoothness: this.calculateSmoothness(trajectory),
                velocity: this.analyzeVelocityProperties(velocityTrajectory),
                acceleration: this.analyzeAccelerationProperties(accelerationTrajectory),
                direction: this.analyzeDirectionProperties(velocityTrajectory),
                stationaryPeriods: this.findStationaryPeriods(velocityTrajectory)
            };
        }
        
        return properties;
    }
    
    /**
     * 计算轨迹持续时间
     * @param {Array} trajectory - 轨迹数据
     * @returns {number} 持续时间（毫秒）
     */
    calculateTrajectoryDuration(trajectory) {
        if (trajectory.length < 2) {
            return 0;
        }
        
        return trajectory[trajectory.length - 1].timestamp - trajectory[0].timestamp;
    }
    
    /**
     * 计算轨迹距离
     * @param {Array} trajectory - 轨迹数据
     * @returns {number} 总距离
     */
    calculateTrajectoryDistance(trajectory) {
        if (trajectory.length < 2) {
            return 0;
        }
        
        let totalDistance = 0;
        
        for (let i = 1; i < trajectory.length; i++) {
            const current = trajectory[i];
            const previous = trajectory[i - 1];
            
            const distance = Math.sqrt(
                Math.pow(current.x - previous.x, 2) + 
                Math.pow(current.y - previous.y, 2) + 
                Math.pow(current.z - previous.z, 2)
            );
            
            totalDistance += distance;
        }
        
        return totalDistance;
    }
    
    /**
     * 计算位移
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 位移信息
     */
    calculateDisplacement(trajectory) {
        if (trajectory.length < 2) {
            return { x: 0, y: 0, z: 0, magnitude: 0 };
        }
        
        const start = trajectory[0];
        const end = trajectory[trajectory.length - 1];
        
        const displacement = {
            x: end.x - start.x,
            y: end.y - start.y,
            z: end.z - start.z
        };
        
        displacement.magnitude = Math.sqrt(
            displacement.x * displacement.x + 
            displacement.y * displacement.y + 
            displacement.z * displacement.z
        );
        
        return displacement;
    }
    
    /**
     * 计算曲率
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 曲率信息
     */
    calculateCurvature(trajectory) {
        if (trajectory.length < 3) {
            return { average: 0, maximum: 0, points: [] };
        }
        
        const curvatures = [];
        
        for (let i = 1; i < trajectory.length - 1; i++) {
            const p1 = trajectory[i - 1];
            const p2 = trajectory[i];
            const p3 = trajectory[i + 1];
            
            // 计算三点曲率
            const curvature = this.calculateThreePointCurvature(p1, p2, p3);
            curvatures.push(curvature);
        }
        
        return {
            average: curvatures.reduce((sum, c) => sum + c, 0) / curvatures.length,
            maximum: Math.max(...curvatures),
            points: curvatures
        };
    }
    
    /**
     * 计算三点曲率
     * @param {Object} p1 - 点1
     * @param {Object} p2 - 点2
     * @param {Object} p3 - 点3
     * @returns {number} 曲率
     */
    calculateThreePointCurvature(p1, p2, p3) {
        // 使用三点法计算曲率
        const a = Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
        const b = Math.sqrt((p3.x - p2.x) ** 2 + (p3.y - p2.y) ** 2);
        const c = Math.sqrt((p3.x - p1.x) ** 2 + (p3.y - p1.y) ** 2);
        
        if (a === 0 || b === 0 || c === 0) {
            return 0;
        }
        
        // 使用海伦公式计算面积
        const s = (a + b + c) / 2;
        const area = Math.sqrt(s * (s - a) * (s - b) * (s - c));
        
        // 曲率 = 4 * 面积 / (a * b * c)
        return (4 * area) / (a * b * c);
    }
    
    /**
     * 计算平滑度
     * @param {Array} trajectory - 轨迹数据
     * @returns {number} 平滑度分数
     */
    calculateSmoothness(trajectory) {
        if (trajectory.length < 3) {
            return 1;
        }
        
        let totalVariation = 0;
        
        for (let i = 1; i < trajectory.length - 1; i++) {
            const prev = trajectory[i - 1];
            const curr = trajectory[i];
            const next = trajectory[i + 1];
            
            // 计算方向变化
            const angle1 = Math.atan2(curr.y - prev.y, curr.x - prev.x);
            const angle2 = Math.atan2(next.y - curr.y, next.x - curr.x);
            
            let angleDiff = Math.abs(angle2 - angle1);
            if (angleDiff > Math.PI) {
                angleDiff = 2 * Math.PI - angleDiff;
            }
            
            totalVariation += angleDiff;
        }
        
        // 归一化平滑度分数（0-1，1为最平滑）
        const maxVariation = (trajectory.length - 2) * Math.PI;
        return Math.max(0, 1 - totalVariation / maxVariation);
    }
    
    /**
     * 分析速度属性
     * @param {Array} velocityTrajectory - 速度轨迹
     * @returns {Object} 速度属性
     */
    analyzeVelocityProperties(velocityTrajectory) {
        if (velocityTrajectory.length === 0) {
            return null;
        }
        
        const magnitudes = velocityTrajectory.map(v => v.magnitude);
        
        return {
            average: magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length,
            maximum: Math.max(...magnitudes),
            minimum: Math.min(...magnitudes),
            variance: this.calculateVariance(magnitudes),
            peaks: this.findPeaks(magnitudes),
            isMoving: magnitudes.some(m => m > this.options.velocityThreshold)
        };
    }
    
    /**
     * 分析加速度属性
     * @param {Array} accelerationTrajectory - 加速度轨迹
     * @returns {Object} 加速度属性
     */
    analyzeAccelerationProperties(accelerationTrajectory) {
        if (accelerationTrajectory.length === 0) {
            return null;
        }
        
        const magnitudes = accelerationTrajectory.map(a => a.magnitude);
        
        return {
            average: magnitudes.reduce((sum, m) => sum + m, 0) / magnitudes.length,
            maximum: Math.max(...magnitudes),
            minimum: Math.min(...magnitudes),
            variance: this.calculateVariance(magnitudes),
            peaks: this.findPeaks(magnitudes),
            isAccelerating: magnitudes.some(m => Math.abs(m) > this.options.accelerationThreshold)
        };
    }
    
    /**
     * 分析方向属性
     * @param {Array} velocityTrajectory - 速度轨迹
     * @returns {Object} 方向属性
     */
    analyzeDirectionProperties(velocityTrajectory) {
        if (velocityTrajectory.length === 0) {
            return null;
        }
        
        const directions = velocityTrajectory.map(v => v.direction);
        const directionChanges = [];
        
        for (let i = 1; i < directions.length; i++) {
            let change = Math.abs(directions[i] - directions[i - 1]);
            if (change > 180) {
                change = 360 - change;
            }
            directionChanges.push(change);
        }
        
        return {
            averageDirection: this.calculateAverageAngle(directions),
            directionVariance: this.calculateVariance(directions),
            directionChanges: directionChanges,
            averageDirectionChange: directionChanges.length > 0 ? 
                directionChanges.reduce((sum, c) => sum + c, 0) / directionChanges.length : 0,
            significantDirectionChanges: directionChanges.filter(c => c > this.options.directionChangeThreshold).length
        };
    }
    
    /**
     * 查找静止期间
     * @param {Array} velocityTrajectory - 速度轨迹
     * @returns {Array} 静止期间
     */
    findStationaryPeriods(velocityTrajectory) {
        const stationaryPeriods = [];
        let currentPeriod = null;
        
        for (let i = 0; i < velocityTrajectory.length; i++) {
            const velocity = velocityTrajectory[i];
            const isStationary = velocity.magnitude <= this.options.stationaryThreshold;
            
            if (isStationary) {
                if (!currentPeriod) {
                    currentPeriod = {
                        start: i,
                        startTime: velocity.timestamp,
                        end: i,
                        endTime: velocity.timestamp
                    };
                } else {
                    currentPeriod.end = i;
                    currentPeriod.endTime = velocity.timestamp;
                }
            } else {
                if (currentPeriod) {
                    currentPeriod.duration = currentPeriod.endTime - currentPeriod.startTime;
                    stationaryPeriods.push(currentPeriod);
                    currentPeriod = null;
                }
            }
        }
        
        // 处理最后一个静止期间
        if (currentPeriod) {
            currentPeriod.duration = currentPeriod.endTime - currentPeriod.startTime;
            stationaryPeriods.push(currentPeriod);
        }
        
        return stationaryPeriods;
    }
    
    /**
     * 识别模式
     * @returns {Object} 识别的模式
     */
    recognizePatterns() {
        const patterns = {};
        
        for (const [keypointName, trajectory] of this.smoothedTrajectories) {
            if (trajectory.length < this.options.minTrajectoryLength) {
                continue;
            }
            
            const keypointPatterns = {};
            
            // 对每种模式进行检测
            for (const [patternName, pattern] of this.patternLibrary) {
                try {
                    const result = pattern.detector(trajectory);
                    if (result && result.confidence >= this.options.patternMatchThreshold) {
                        keypointPatterns[patternName] = result;
                        this.stats.patternsDetected++;
                    }
                } catch (error) {
                    this.logger.error(`模式检测失败 ${patternName}:`, error);
                }
            }
            
            if (Object.keys(keypointPatterns).length > 0) {
                patterns[keypointName] = keypointPatterns;
            }
        }
        
        return patterns;
    }
    
    /**
     * 检测直线模式
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 检测结果
     */
    detectLinearPattern(trajectory) {
        if (trajectory.length < 3) {
            return null;
        }
        
        // 使用最小二乘法拟合直线
        const n = trajectory.length;
        let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
        
        for (const point of trajectory) {
            sumX += point.x;
            sumY += point.y;
            sumXY += point.x * point.y;
            sumX2 += point.x * point.x;
        }
        
        const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
        const intercept = (sumY - slope * sumX) / n;
        
        // 计算拟合度（R²）
        const meanY = sumY / n;
        let ssRes = 0, ssTot = 0;
        
        for (const point of trajectory) {
            const predicted = slope * point.x + intercept;
            ssRes += Math.pow(point.y - predicted, 2);
            ssTot += Math.pow(point.y - meanY, 2);
        }
        
        const rSquared = ssTot > 0 ? 1 - (ssRes / ssTot) : 0;
        
        return {
            confidence: Math.max(0, rSquared),
            parameters: {
                slope,
                intercept,
                rSquared
            },
            description: `直线运动，斜率: ${slope.toFixed(2)}`
        };
    }
    
    /**
     * 检测圆形模式
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 检测结果
     */
    detectCircularPattern(trajectory) {
        if (trajectory.length < 5) {
            return null;
        }
        
        // 简化的圆形检测：计算到中心点的距离变化
        const centerX = trajectory.reduce((sum, p) => sum + p.x, 0) / trajectory.length;
        const centerY = trajectory.reduce((sum, p) => sum + p.y, 0) / trajectory.length;
        
        const distances = trajectory.map(p => 
            Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
        );
        
        const averageRadius = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        const radiusVariance = this.calculateVariance(distances);
        
        // 计算角度变化的一致性
        const angles = trajectory.map(p => Math.atan2(p.y - centerY, p.x - centerX));
        let totalAngleChange = 0;
        
        for (let i = 1; i < angles.length; i++) {
            let angleDiff = angles[i] - angles[i - 1];
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            totalAngleChange += Math.abs(angleDiff);
        }
        
        // 圆形度评分
        const radiusConsistency = Math.max(0, 1 - radiusVariance / (averageRadius * averageRadius));
        const angleConsistency = totalAngleChange > Math.PI ? 1 : totalAngleChange / Math.PI;
        
        const confidence = (radiusConsistency + angleConsistency) / 2;
        
        return {
            confidence,
            parameters: {
                centerX,
                centerY,
                averageRadius,
                radiusVariance,
                totalAngleChange
            },
            description: `圆形运动，半径: ${averageRadius.toFixed(2)}`
        };
    }
    
    /**
     * 检测振荡模式
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 检测结果
     */
    detectOscillationPattern(trajectory) {
        if (trajectory.length < 6) {
            return null;
        }
        
        // 分析X和Y方向的振荡
        const xValues = trajectory.map(p => p.x);
        const yValues = trajectory.map(p => p.y);
        
        const xOscillation = this.analyzeOscillation(xValues);
        const yOscillation = this.analyzeOscillation(yValues);
        
        // 选择振荡更明显的方向
        const primaryOscillation = xOscillation.amplitude > yOscillation.amplitude ? xOscillation : yOscillation;
        const direction = xOscillation.amplitude > yOscillation.amplitude ? 'horizontal' : 'vertical';
        
        const confidence = Math.min(1, primaryOscillation.amplitude / 50); // 归一化
        
        return {
            confidence,
            parameters: {
                direction,
                amplitude: primaryOscillation.amplitude,
                frequency: primaryOscillation.frequency,
                peaks: primaryOscillation.peaks
            },
            description: `${direction === 'horizontal' ? '水平' : '垂直'}振荡，幅度: ${primaryOscillation.amplitude.toFixed(2)}`
        };
    }
    
    /**
     * 分析振荡
     * @param {Array} values - 数值数组
     * @returns {Object} 振荡分析结果
     */
    analyzeOscillation(values) {
        const peaks = this.findPeaks(values);
        const valleys = this.findPeaks(values.map(v => -v)).map(i => ({ index: i.index, value: -i.value }));
        
        // 计算幅度
        const maxValue = Math.max(...values);
        const minValue = Math.min(...values);
        const amplitude = (maxValue - minValue) / 2;
        
        // 估计频率（基于峰值间距）
        let averagePeakDistance = 0;
        if (peaks.length > 1) {
            const distances = [];
            for (let i = 1; i < peaks.length; i++) {
                distances.push(peaks[i].index - peaks[i - 1].index);
            }
            averagePeakDistance = distances.reduce((sum, d) => sum + d, 0) / distances.length;
        }
        
        const frequency = averagePeakDistance > 0 ? this.options.samplingRate / (2 * averagePeakDistance) : 0;
        
        return {
            amplitude,
            frequency,
            peaks: peaks.length,
            valleys: valleys.length
        };
    }
    
    /**
     * 检测螺旋模式
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 检测结果
     */
    detectSpiralPattern(trajectory) {
        if (trajectory.length < 8) {
            return null;
        }
        
        // 计算到中心的距离变化趋势
        const centerX = trajectory.reduce((sum, p) => sum + p.x, 0) / trajectory.length;
        const centerY = trajectory.reduce((sum, p) => sum + p.y, 0) / trajectory.length;
        
        const distances = trajectory.map(p => 
            Math.sqrt((p.x - centerX) ** 2 + (p.y - centerY) ** 2)
        );
        
        // 检查距离是否单调变化（螺旋特征）
        let increasing = 0, decreasing = 0;
        for (let i = 1; i < distances.length; i++) {
            if (distances[i] > distances[i - 1]) increasing++;
            else if (distances[i] < distances[i - 1]) decreasing++;
        }
        
        const monotonicity = Math.max(increasing, decreasing) / (distances.length - 1);
        
        // 检查角度变化（应该持续增加或减少）
        const angles = trajectory.map(p => Math.atan2(p.y - centerY, p.x - centerX));
        let totalAngleChange = 0;
        
        for (let i = 1; i < angles.length; i++) {
            let angleDiff = angles[i] - angles[i - 1];
            if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
            if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;
            totalAngleChange += angleDiff;
        }
        
        const spiralTurns = Math.abs(totalAngleChange) / (2 * Math.PI);
        const confidence = Math.min(1, monotonicity * Math.min(1, spiralTurns));
        
        return {
            confidence,
            parameters: {
                centerX,
                centerY,
                monotonicity,
                spiralTurns,
                direction: totalAngleChange > 0 ? 'counterclockwise' : 'clockwise'
            },
            description: `螺旋运动，${totalAngleChange > 0 ? '逆时针' : '顺时针'}，${spiralTurns.toFixed(1)}圈`
        };
    }
    
    /**
     * 检测锯齿模式
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 检测结果
     */
    detectZigzagPattern(trajectory) {
        if (trajectory.length < 6) {
            return null;
        }
        
        // 计算方向变化
        const directions = [];
        for (let i = 1; i < trajectory.length; i++) {
            const dx = trajectory[i].x - trajectory[i - 1].x;
            const dy = trajectory[i].y - trajectory[i - 1].y;
            directions.push(Math.atan2(dy, dx));
        }
        
        // 计算方向变化的频率和幅度
        const directionChanges = [];
        for (let i = 1; i < directions.length; i++) {
            let change = Math.abs(directions[i] - directions[i - 1]);
            if (change > Math.PI) change = 2 * Math.PI - change;
            directionChanges.push(change);
        }
        
        // 锯齿模式特征：频繁的大角度方向变化
        const significantChanges = directionChanges.filter(c => c > Math.PI / 4).length;
        const changeFrequency = significantChanges / directionChanges.length;
        
        const averageChange = directionChanges.reduce((sum, c) => sum + c, 0) / directionChanges.length;
        const confidence = Math.min(1, changeFrequency * (averageChange / (Math.PI / 2)));
        
        return {
            confidence,
            parameters: {
                significantChanges,
                changeFrequency,
                averageChange: averageChange * (180 / Math.PI) // 转换为度
            },
            description: `锯齿运动，${significantChanges}次显著方向变化`
        };
    }
    
    /**
     * 预测运动
     * @returns {Object} 运动预测
     */
    predictMotion() {
        const predictions = {};
        
        for (const [keypointName, trajectory] of this.smoothedTrajectories) {
            if (trajectory.length < this.options.minTrajectoryLength) {
                continue;
            }
            
            try {
                const prediction = this.predictKeypointMotion(trajectory);
                if (prediction) {
                    predictions[keypointName] = prediction;
                    this.stats.predictionsGenerated++;
                }
            } catch (error) {
                this.logger.error(`运动预测失败 ${keypointName}:`, error);
            }
        }
        
        return predictions;
    }
    
    /**
     * 预测关键点运动
     * @param {Array} trajectory - 轨迹数据
     * @returns {Object} 预测结果
     */
    predictKeypointMotion(trajectory) {
        const recentPoints = trajectory.slice(-Math.min(10, trajectory.length));
        
        if (recentPoints.length < 2) {
            return null;
        }
        
        switch (this.options.predictionMethod) {
            case 'linear':
                return this.linearPrediction(recentPoints);
            case 'polynomial':
                return this.polynomialPrediction(recentPoints);
            case 'kalman':
                return this.kalmanPrediction(recentPoints);
            default:
                return this.linearPrediction(recentPoints);
        }
    }
    
    /**
     * 线性预测
     * @param {Array} points - 轨迹点
     * @returns {Object} 预测结果
     */
    linearPrediction(points) {
        if (points.length < 2) {
            return null;
        }
        
        // 计算平均速度
        const velocities = [];
        for (let i = 1; i < points.length; i++) {
            const dt = (points[i].timestamp - points[i - 1].timestamp) / 1000;
            if (dt > 0) {
                velocities.push({
                    x: (points[i].x - points[i - 1].x) / dt,
                    y: (points[i].y - points[i - 1].y) / dt,
                    z: (points[i].z - points[i - 1].z) / dt
                });
            }
        }
        
        if (velocities.length === 0) {
            return null;
        }
        
        const avgVelocity = {
            x: velocities.reduce((sum, v) => sum + v.x, 0) / velocities.length,
            y: velocities.reduce((sum, v) => sum + v.y, 0) / velocities.length,
            z: velocities.reduce((sum, v) => sum + v.z, 0) / velocities.length
        };
        
        // 生成预测点
        const lastPoint = points[points.length - 1];
        const predictedPoints = [];
        const timeStep = 1000 / this.options.samplingRate; // 毫秒
        
        for (let i = 1; i <= this.options.predictionHorizon; i++) {
            const dt = (i * timeStep) / 1000; // 秒
            predictedPoints.push({
                x: lastPoint.x + avgVelocity.x * dt,
                y: lastPoint.y + avgVelocity.y * dt,
                z: lastPoint.z + avgVelocity.z * dt,
                timestamp: lastPoint.timestamp + i * timeStep,
                confidence: Math.max(0, 1 - i * 0.1) // 置信度随时间递减
            });
        }
        
        return {
            method: 'linear',
            points: predictedPoints,
            velocity: avgVelocity,
            confidence: 0.8
        };
    }
    
    /**
     * 多项式预测
     * @param {Array} points - 轨迹点
     * @returns {Object} 预测结果
     */
    polynomialPrediction(points) {
        // 简化实现：使用二次多项式拟合
        if (points.length < 3) {
            return this.linearPrediction(points);
        }
        
        // 这里可以实现更复杂的多项式拟合
        // 为简化，暂时返回线性预测
        return this.linearPrediction(points);
    }
    
    /**
     * 卡尔曼预测
     * @param {Array} points - 轨迹点
     * @returns {Object} 预测结果
     */
    kalmanPrediction(points) {
        // 简化实现：使用线性卡尔曼滤波器
        if (points.length < 2) {
            return null;
        }
        
        // 这里可以实现卡尔曼滤波器
        // 为简化，暂时返回线性预测
        return this.linearPrediction(points);
    }
    
    /**
     * 识别手势
     * @returns {Object} 识别的手势
     */
    recognizeGestures() {
        const gestures = {};
        
        for (const [gestureName, template] of this.gestureLibrary) {
            try {
                const result = this.matchGestureTemplate(template);
                if (result && result.confidence >= this.options.patternMatchThreshold) {
                    gestures[gestureName] = result;
                    this.stats.gesturesRecognized++;
                }
            } catch (error) {
                this.logger.error(`手势识别失败 ${gestureName}:`, error);
            }
        }
        
        return gestures;
    }
    
    /**
     * 匹配手势模板
     * @param {Object} template - 手势模板
     * @returns {Object} 匹配结果
     */
    matchGestureTemplate(template) {
        // 获取相关关键点的轨迹
        const relevantTrajectories = {};
        for (const keypointName of template.keypoints) {
            const trajectoryKey = this.getTrajectoryKeyByName(keypointName);
            if (trajectoryKey && this.smoothedTrajectories.has(trajectoryKey)) {
                relevantTrajectories[keypointName] = this.smoothedTrajectories.get(trajectoryKey);
            }
        }
        
        if (Object.keys(relevantTrajectories).length === 0) {
            return null;
        }
        
        // 根据手势类型进行匹配
        switch (template.pattern) {
            case 'oscillation':
                return this.matchOscillationGesture(template, relevantTrajectories);
            case 'convergence':
                return this.matchConvergenceGesture(template, relevantTrajectories);
            case 'vertical_movement':
                return this.matchVerticalMovementGesture(template, relevantTrajectories);
            case 'vertical_oscillation':
                return this.matchVerticalOscillationGesture(template, relevantTrajectories);
            case 'alternating_movement':
                return this.matchAlternatingMovementGesture(template, relevantTrajectories);
            default:
                return null;
        }
    }
    
    /**
     * 根据名称获取轨迹键
     * @param {string} name - 关键点名称
     * @returns {string} 轨迹键
     */
    getTrajectoryKeyByName(name) {
        // COCO姿态模型的关键点映射
        const keypointMap = {
            'nose': 'keypoint_0',
            'left_eye': 'keypoint_1',
            'right_eye': 'keypoint_2',
            'left_ear': 'keypoint_3',
            'right_ear': 'keypoint_4',
            'left_shoulder': 'keypoint_5',
            'right_shoulder': 'keypoint_6',
            'left_elbow': 'keypoint_7',
            'right_elbow': 'keypoint_8',
            'left_wrist': 'keypoint_9',
            'right_wrist': 'keypoint_10',
            'left_hip': 'keypoint_11',
            'right_hip': 'keypoint_12',
            'left_knee': 'keypoint_13',
            'right_knee': 'keypoint_14',
            'left_ankle': 'keypoint_15',
            'right_ankle': 'keypoint_16'
        };
        
        return keypointMap[name];
    }
    
    /**
     * 匹配振荡手势
     * @param {Object} template - 手势模板
     * @param {Object} trajectories - 相关轨迹
     * @returns {Object} 匹配结果
     */
    matchOscillationGesture(template, trajectories) {
        // 实现振荡手势匹配逻辑
        // 这里是简化实现
        return {
            confidence: 0.5,
            template: template.name,
            description: template.description
        };
    }
    
    /**
     * 匹配收敛手势
     * @param {Object} template - 手势模板
     * @param {Object} trajectories - 相关轨迹
     * @returns {Object} 匹配结果
     */
    matchConvergenceGesture(template, trajectories) {
        // 实现收敛手势匹配逻辑
        return {
            confidence: 0.5,
            template: template.name,
            description: template.description
        };
    }
    
    /**
     * 匹配垂直运动手势
     * @param {Object} template - 手势模板
     * @param {Object} trajectories - 相关轨迹
     * @returns {Object} 匹配结果
     */
    matchVerticalMovementGesture(template, trajectories) {
        // 实现垂直运动手势匹配逻辑
        return {
            confidence: 0.5,
            template: template.name,
            description: template.description
        };
    }
    
    /**
     * 匹配垂直振荡手势
     * @param {Object} template - 手势模板
     * @param {Object} trajectories - 相关轨迹
     * @returns {Object} 匹配结果
     */
    matchVerticalOscillationGesture(template, trajectories) {
        // 实现垂直振荡手势匹配逻辑
        return {
            confidence: 0.5,
            template: template.name,
            description: template.description
        };
    }
    
    /**
     * 匹配交替运动手势
     * @param {Object} template - 手势模板
     * @param {Object} trajectories - 相关轨迹
     * @returns {Object} 匹配结果
     */
    matchAlternatingMovementGesture(template, trajectories) {
        // 实现交替运动手势匹配逻辑
        return {
            confidence: 0.5,
            template: template.name,
            description: template.description
        };
    }
    
    /**
     * 计算统计信息
     * @returns {Object} 统计信息
     */
    calculateStatistics() {
        const statistics = {
            totalTrajectories: this.trajectories.size,
            activeTrajectories: 0,
            averageTrajectoryLength: 0,
            totalDistance: 0,
            averageVelocity: 0,
            maxVelocity: 0
        };
        
        let totalLength = 0;
        let totalDistance = 0;
        let velocitySum = 0;
        let maxVel = 0;
        let velocityCount = 0;
        
        for (const [keypointName, trajectory] of this.trajectories) {
            if (trajectory.length > 0) {
                statistics.activeTrajectories++;
                totalLength += trajectory.length;
                
                // 计算轨迹距离
                const distance = this.calculateTrajectoryDistance(trajectory);
                totalDistance += distance;
                
                // 计算速度统计
                const velocityTrajectory = this.velocityTrajectories.get(keypointName);
                if (velocityTrajectory && velocityTrajectory.length > 0) {
                    for (const velocity of velocityTrajectory) {
                        velocitySum += velocity.magnitude;
                        maxVel = Math.max(maxVel, velocity.magnitude);
                        velocityCount++;
                    }
                }
            }
        }
        
        if (statistics.activeTrajectories > 0) {
            statistics.averageTrajectoryLength = totalLength / statistics.activeTrajectories;
            statistics.totalDistance = totalDistance;
        }
        
        if (velocityCount > 0) {
            statistics.averageVelocity = velocitySum / velocityCount;
            statistics.maxVelocity = maxVel;
        }
        
        return statistics;
    }
    
    /**
     * 计算方差
     * @param {Array} values - 数值数组
     * @returns {number} 方差
     */
    calculateVariance(values) {
        if (values.length === 0) {
            return 0;
        }
        
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
        return squaredDiffs.reduce((sum, d) => sum + d, 0) / values.length;
    }
    
    /**
     * 计算平均角度
     * @param {Array} angles - 角度数组（度）
     * @returns {number} 平均角度
     */
    calculateAverageAngle(angles) {
        if (angles.length === 0) {
            return 0;
        }
        
        // 转换为弧度并计算平均值
        let sumSin = 0, sumCos = 0;
        
        for (const angle of angles) {
            const radians = angle * (Math.PI / 180);
            sumSin += Math.sin(radians);
            sumCos += Math.cos(radians);
        }
        
        const avgRadians = Math.atan2(sumSin / angles.length, sumCos / angles.length);
        return avgRadians * (180 / Math.PI); // 转换回度
    }
    
    /**
     * 查找峰值
     * @param {Array} values - 数值数组
     * @returns {Array} 峰值索引和值
     */
    findPeaks(values) {
        const peaks = [];
        
        for (let i = 1; i < values.length - 1; i++) {
            if (values[i] > values[i - 1] && values[i] > values[i + 1]) {
                peaks.push({
                    index: i,
                    value: values[i]
                });
            }
        }
        
        return peaks;
    }
    
    /**
     * 更新统计信息
     * @param {number} processingTime - 处理时间
     */
    updateStats(processingTime) {
        this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime * (this.stats.totalFrames - 1) + processingTime) / this.stats.totalFrames;
    }
    
    /**
     * 添加手势模板
     * @param {string} name - 手势名称
     * @param {Object} template - 手势模板
     */
    addGestureTemplate(name, template) {
        this.gestureLibrary.set(name, template);
        this.logger.info(`添加手势模板: ${name}`);
    }
    
    /**
     * 移除手势模板
     * @param {string} name - 手势名称
     */
    removeGestureTemplate(name) {
        if (this.gestureLibrary.delete(name)) {
            this.logger.info(`移除手势模板: ${name}`);
        }
    }
    
    /**
     * 添加模式检测器
     * @param {string} name - 模式名称
     * @param {Object} pattern - 模式检测器
     */
    addPatternDetector(name, pattern) {
        this.patternLibrary.set(name, pattern);
        this.logger.info(`添加模式检测器: ${name}`);
    }
    
    /**
     * 移除模式检测器
     * @param {string} name - 模式名称
     */
    removePatternDetector(name) {
        if (this.patternLibrary.delete(name)) {
            this.logger.info(`移除模式检测器: ${name}`);
        }
    }
    
    /**
     * 清空轨迹数据
     */
    clearTrajectories() {
        this.trajectories.clear();
        this.smoothedTrajectories.clear();
        this.velocityTrajectories.clear();
        this.accelerationTrajectories.clear();
        
        this.logger.info('轨迹数据已清空');
    }
    
    /**
     * 获取轨迹数据
     * @param {string} keypointName - 关键点名称
     * @returns {Object} 轨迹数据
     */
    getTrajectoryData(keypointName) {
        return {
            raw: this.trajectories.get(keypointName) || [],
            smoothed: this.smoothedTrajectories.get(keypointName) || [],
            velocity: this.velocityTrajectories.get(keypointName) || [],
            acceleration: this.accelerationTrajectories.get(keypointName) || []
        };
    }
    
    /**
     * 获取所有轨迹数据
     * @returns {Object} 所有轨迹数据
     */
    getAllTrajectoryData() {
        const allData = {};
        
        for (const keypointName of this.trajectories.keys()) {
            allData[keypointName] = this.getTrajectoryData(keypointName);
        }
        
        return allData;
    }
    
    /**
     * 导出轨迹数据
     * @param {string} format - 导出格式 ('json', 'csv')
     * @returns {string} 导出的数据
     */
    exportTrajectoryData(format = 'json') {
        const data = {
            trajectories: this.getAllTrajectoryData(),
            analysis: this.currentAnalysis,
            statistics: this.stats,
            timestamp: Date.now()
        };
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                return this.convertToCSV(data);
            default:
                throw new Error(`不支持的导出格式: ${format}`);
        }
    }
    
    /**
     * 转换为CSV格式
     * @param {Object} data - 数据对象
     * @returns {string} CSV字符串
     */
    convertToCSV(data) {
        // 简化的CSV转换实现
        const lines = ['timestamp,keypoint,x,y,z,confidence,type'];
        
        for (const [keypointName, trajectoryData] of Object.entries(data.trajectories)) {
            // 原始轨迹
            for (const point of trajectoryData.raw) {
                lines.push(`${point.timestamp},${keypointName},${point.x},${point.y},${point.z},${point.confidence},raw`);
            }
            
            // 平滑轨迹
            for (const point of trajectoryData.smoothed) {
                lines.push(`${point.timestamp},${keypointName},${point.x},${point.y},${point.z},${point.confidence},smoothed`);
            }
        }
        
        return lines.join('\n');
    }
    
    /**
     * 导入轨迹数据
     * @param {string} data - 导入的数据
     * @param {string} format - 数据格式
     */
    importTrajectoryData(data, format = 'json') {
        try {
            switch (format.toLowerCase()) {
                case 'json':
                    const jsonData = JSON.parse(data);
                    this.loadTrajectoryData(jsonData);
                    break;
                default:
                    throw new Error(`不支持的导入格式: ${format}`);
            }
            
            this.logger.info('轨迹数据导入成功');
        } catch (error) {
            this.logger.error('轨迹数据导入失败:', error);
            throw error;
        }
    }
    
    /**
     * 加载轨迹数据
     * @param {Object} data - 轨迹数据
     */
    loadTrajectoryData(data) {
        if (data.trajectories) {
            for (const [keypointName, trajectoryData] of Object.entries(data.trajectories)) {
                if (trajectoryData.raw) {
                    this.trajectories.set(keypointName, trajectoryData.raw);
                }
                if (trajectoryData.smoothed) {
                    this.smoothedTrajectories.set(keypointName, trajectoryData.smoothed);
                }
                if (trajectoryData.velocity) {
                    this.velocityTrajectories.set(keypointName, trajectoryData.velocity);
                }
                if (trajectoryData.acceleration) {
                    this.accelerationTrajectories.set(keypointName, trajectoryData.acceleration);
                }
            }
        }
        
        if (data.analysis) {
            this.currentAnalysis = data.analysis;
        }
        
        if (data.statistics) {
            this.stats = { ...this.stats, ...data.statistics };
        }
    }
    
    /**
     * 获取当前分析结果
     * @returns {Object} 当前分析结果
     */
    getCurrentAnalysis() {
        return this.currentAnalysis;
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStatistics() {
        return {
            ...this.stats,
            memoryUsage: this.getMemoryUsage(),
            cacheSize: this.cache.size
        };
    }
    
    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryUsage() {
        let totalPoints = 0;
        let totalSize = 0;
        
        // 计算轨迹数据大小
        for (const trajectory of this.trajectories.values()) {
            totalPoints += trajectory.length;
            totalSize += trajectory.length * 64; // 估算每个点64字节
        }
        
        for (const trajectory of this.smoothedTrajectories.values()) {
            totalPoints += trajectory.length;
            totalSize += trajectory.length * 64;
        }
        
        for (const trajectory of this.velocityTrajectories.values()) {
            totalPoints += trajectory.length;
            totalSize += trajectory.length * 48; // 速度数据稍小
        }
        
        for (const trajectory of this.accelerationTrajectories.values()) {
            totalPoints += trajectory.length;
            totalSize += trajectory.length * 48;
        }
        
        return {
            totalPoints,
            estimatedSize: totalSize,
            trajectoryCount: this.trajectories.size,
            cacheSize: this.cache.size * 1024 // 估算缓存大小
        };
    }
    
    /**
     * 更新配置
     * @param {Object} newOptions - 新配置选项
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        // 重新初始化相关组件
        if (newOptions.gestureTemplates) {
            this.initializeGestureTemplates();
        }
        
        this.logger.info('轨迹分析器配置已更新', newOptions);
    }
    
    /**
     * 重置分析器
     */
    reset() {
        this.clearTrajectories();
        this.cache.clear();
        
        this.currentAnalysis = {
            trajectories: {},
            patterns: {},
            predictions: {},
            gestures: {},
            statistics: {},
            timestamp: null
        };
        
        this.stats = {
            totalFrames: 0,
            totalTrajectories: 0,
            patternsDetected: 0,
            gesturesRecognized: 0,
            predictionsGenerated: 0,
            averageProcessingTime: 0
        };
        
        this.logger.info('轨迹分析器已重置');
    }
    
    /**
     * 销毁分析器
     */
    destroy() {
        this.clearTrajectories();
        this.cache.clear();
        this.patternLibrary.clear();
        this.gestureLibrary.clear();
        
        this.logger.info('轨迹分析器已销毁');
    }
}