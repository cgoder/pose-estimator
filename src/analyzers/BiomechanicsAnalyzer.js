/**
 * 生物力学分析器
 * 分析人体运动的生物力学特征，包括关节角度、运动范围、力学参数等
 */

import { Logger } from '../utils/Logger.js';
import { PerformanceMonitor } from '../utils/PerformanceMonitor.js';
import { EventBus } from '../utils/EventBus.js';

export class BiomechanicsAnalyzer {
    constructor(options = {}) {
        // 配置选项
        this.options = {
            // 分析设置
            enableAngleAnalysis: options.enableAngleAnalysis !== false,
            enableVelocityAnalysis: options.enableVelocityAnalysis !== false,
            enableAccelerationAnalysis: options.enableAccelerationAnalysis !== false,
            enableForceAnalysis: options.enableForceAnalysis !== false,
            enableSymmetryAnalysis: options.enableSymmetryAnalysis !== false,
            enableStabilityAnalysis: options.enableStabilityAnalysis !== false,
            
            // 计算参数
            smoothingWindow: options.smoothingWindow || 5,
            velocityWindow: options.velocityWindow || 3,
            accelerationWindow: options.accelerationWindow || 3,
            frameRate: options.frameRate || 30,
            
            // 阈值设置
            minConfidence: options.minConfidence || 0.5,
            angleThreshold: options.angleThreshold || 5, // 度
            velocityThreshold: options.velocityThreshold || 100, // 像素/秒
            accelerationThreshold: options.accelerationThreshold || 500, // 像素/秒²
            
            // 人体模型参数
            bodySegments: options.bodySegments || {
                head: { mass: 0.081, length: 0.23 },
                trunk: { mass: 0.497, length: 0.43 },
                upperArm: { mass: 0.028, length: 0.186 },
                forearm: { mass: 0.016, length: 0.146 },
                hand: { mass: 0.006, length: 0.108 },
                thigh: { mass: 0.100, length: 0.245 },
                shank: { mass: 0.0465, length: 0.246 },
                foot: { mass: 0.0145, length: 0.152 }
            },
            
            // 关节定义
            joints: options.joints || {
                neck: ['nose', 'left_shoulder', 'right_shoulder'],
                leftShoulder: ['left_shoulder', 'left_elbow', 'left_hip'],
                rightShoulder: ['right_shoulder', 'right_elbow', 'right_hip'],
                leftElbow: ['left_shoulder', 'left_elbow', 'left_wrist'],
                rightElbow: ['right_shoulder', 'right_elbow', 'right_wrist'],
                leftHip: ['left_shoulder', 'left_hip', 'left_knee'],
                rightHip: ['right_shoulder', 'right_hip', 'right_knee'],
                leftKnee: ['left_hip', 'left_knee', 'left_ankle'],
                rightKnee: ['right_hip', 'right_knee', 'right_ankle'],
                leftAnkle: ['left_knee', 'left_ankle', 'left_foot_index'],
                rightAnkle: ['right_knee', 'right_ankle', 'right_foot_index']
            },
            
            // 调试设置
            debug: options.debug || false,
            enableVisualization: options.enableVisualization !== false,
            
            ...options
        };
        
        // 历史数据
        this.poseHistory = [];
        this.angleHistory = new Map();
        this.velocityHistory = new Map();
        this.accelerationHistory = new Map();
        
        // 分析结果
        this.currentAnalysis = {
            angles: new Map(),
            velocities: new Map(),
            accelerations: new Map(),
            forces: new Map(),
            symmetry: {},
            stability: {},
            timestamp: null
        };
        
        // 统计信息
        this.stats = {
            totalAnalyses: 0,
            averageProcessingTime: 0,
            angleCalculations: 0,
            velocityCalculations: 0,
            accelerationCalculations: 0,
            forceCalculations: 0
        };
        
        // 工具实例
        this.logger = new Logger({ prefix: 'BiomechanicsAnalyzer' });
        this.performanceMonitor = new PerformanceMonitor();
        this.eventBus = options.eventBus || new EventBus();
        
        // 缓存
        this.cache = new Map();
        
        this.init();
    }
    
    /**
     * 初始化分析器
     */
    init() {
        try {
            // 初始化历史数据结构
            for (const jointName of Object.keys(this.options.joints)) {
                this.angleHistory.set(jointName, []);
                this.velocityHistory.set(jointName, []);
                this.accelerationHistory.set(jointName, []);
            }
            
            if (this.options.debug) {
                this.logger.info('生物力学分析器已初始化', this.options);
            }
            
        } catch (error) {
            this.logger.error('生物力学分析器初始化失败:', error);
            throw error;
        }
    }
    
    /**
     * 分析姿态数据
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
            
            // 选择最佳姿态（置信度最高）
            const bestPose = this.selectBestPose(poses);
            if (!bestPose) {
                return null;
            }
            
            // 添加到历史记录
            this.addToHistory(bestPose, timestamp);
            
            // 执行各种分析
            const analysis = {
                timestamp,
                pose: bestPose,
                angles: this.options.enableAngleAnalysis ? this.analyzeAngles(bestPose) : null,
                velocities: this.options.enableVelocityAnalysis ? this.analyzeVelocities() : null,
                accelerations: this.options.enableAccelerationAnalysis ? this.analyzeAccelerations() : null,
                forces: this.options.enableForceAnalysis ? this.analyzeForces() : null,
                symmetry: this.options.enableSymmetryAnalysis ? this.analyzeSymmetry(bestPose) : null,
                stability: this.options.enableStabilityAnalysis ? this.analyzeStability() : null
            };
            
            // 更新当前分析结果
            this.currentAnalysis = analysis;
            
            // 更新统计信息
            this.updateStats(performance.now() - startTime);
            
            // 触发事件
            this.eventBus.emit('biomechanicsAnalyzed', analysis);
            
            if (this.options.debug) {
                this.logger.debug('生物力学分析完成', {
                    processingTime: performance.now() - startTime,
                    angles: analysis.angles ? Object.keys(analysis.angles).length : 0,
                    velocities: analysis.velocities ? Object.keys(analysis.velocities).length : 0
                });
            }
            
            return analysis;
            
        } catch (error) {
            this.logger.error('生物力学分析失败:', error);
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
            const score = this.calculatePoseQuality(pose);
            
            if (score > bestScore && score >= this.options.minConfidence) {
                bestScore = score;
                bestPose = pose;
            }
        }
        
        return bestPose;
    }
    
    /**
     * 计算姿态质量分数
     * @param {Object} pose - 姿态数据
     * @returns {number} 质量分数
     */
    calculatePoseQuality(pose) {
        if (!pose.keypoints) return 0;
        
        let totalScore = 0;
        let validKeypoints = 0;
        
        for (const keypoint of pose.keypoints) {
            if (keypoint.score && keypoint.score > 0) {
                totalScore += keypoint.score;
                validKeypoints++;
            }
        }
        
        return validKeypoints > 0 ? totalScore / validKeypoints : 0;
    }
    
    /**
     * 添加到历史记录
     * @param {Object} pose - 姿态数据
     * @param {number} timestamp - 时间戳
     */
    addToHistory(pose, timestamp) {
        this.poseHistory.push({
            pose,
            timestamp
        });
        
        // 限制历史记录大小
        const maxHistory = Math.max(this.options.smoothingWindow * 3, 30);
        if (this.poseHistory.length > maxHistory) {
            this.poseHistory = this.poseHistory.slice(-maxHistory);
        }
    }
    
    /**
     * 分析关节角度
     * @param {Object} pose - 姿态数据
     * @returns {Object} 角度分析结果
     */
    analyzeAngles(pose) {
        const angles = {};
        
        try {
            for (const [jointName, jointDef] of Object.entries(this.options.joints)) {
                const angle = this.calculateJointAngle(pose, jointDef);
                if (angle !== null) {
                    angles[jointName] = {
                        current: angle,
                        range: this.getAngleRange(jointName),
                        normal: this.isAngleNormal(jointName, angle),
                        change: this.getAngleChange(jointName, angle)
                    };
                    
                    // 添加到历史记录
                    this.addAngleToHistory(jointName, angle);
                    
                    this.stats.angleCalculations++;
                }
            }
            
        } catch (error) {
            this.logger.error('角度分析失败:', error);
        }
        
        return angles;
    }
    
    /**
     * 计算关节角度
     * @param {Object} pose - 姿态数据
     * @param {Array} jointDef - 关节定义
     * @returns {number} 角度（度）
     */
    calculateJointAngle(pose, jointDef) {
        if (!pose.keypoints || jointDef.length !== 3) {
            return null;
        }
        
        // 获取三个关键点
        const points = jointDef.map(name => this.getKeypointByName(pose, name));
        
        // 检查所有点是否有效
        if (points.some(p => !p || p.score < this.options.minConfidence)) {
            return null;
        }
        
        // 计算向量
        const vector1 = {
            x: points[0].x - points[1].x,
            y: points[0].y - points[1].y
        };
        
        const vector2 = {
            x: points[2].x - points[1].x,
            y: points[2].y - points[1].y
        };
        
        // 计算角度
        const dot = vector1.x * vector2.x + vector1.y * vector2.y;
        const mag1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const mag2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        if (mag1 === 0 || mag2 === 0) {
            return null;
        }
        
        const cosAngle = dot / (mag1 * mag2);
        const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle))) * (180 / Math.PI);
        
        return angle;
    }
    
    /**
     * 根据名称获取关键点
     * @param {Object} pose - 姿态数据
     * @param {string} name - 关键点名称
     * @returns {Object} 关键点
     */
    getKeypointByName(pose, name) {
        // COCO姿态模型的关键点映射
        const keypointMap = {
            'nose': 0,
            'left_eye': 1,
            'right_eye': 2,
            'left_ear': 3,
            'right_ear': 4,
            'left_shoulder': 5,
            'right_shoulder': 6,
            'left_elbow': 7,
            'right_elbow': 8,
            'left_wrist': 9,
            'right_wrist': 10,
            'left_hip': 11,
            'right_hip': 12,
            'left_knee': 13,
            'right_knee': 14,
            'left_ankle': 15,
            'right_ankle': 16,
            'left_foot_index': 15, // 简化映射
            'right_foot_index': 16 // 简化映射
        };
        
        const index = keypointMap[name];
        return index !== undefined ? pose.keypoints[index] : null;
    }
    
    /**
     * 获取角度范围
     * @param {string} jointName - 关节名称
     * @returns {Object} 角度范围
     */
    getAngleRange(jointName) {
        const history = this.angleHistory.get(jointName) || [];
        if (history.length === 0) {
            return { min: null, max: null, range: null };
        }
        
        const min = Math.min(...history);
        const max = Math.max(...history);
        
        return {
            min,
            max,
            range: max - min
        };
    }
    
    /**
     * 检查角度是否正常
     * @param {string} jointName - 关节名称
     * @param {number} angle - 角度
     * @returns {boolean} 是否正常
     */
    isAngleNormal(jointName, angle) {
        // 正常角度范围（简化版本）
        const normalRanges = {
            leftElbow: [30, 180],
            rightElbow: [30, 180],
            leftKnee: [30, 180],
            rightKnee: [30, 180],
            leftShoulder: [0, 180],
            rightShoulder: [0, 180],
            leftHip: [0, 180],
            rightHip: [0, 180]
        };
        
        const range = normalRanges[jointName];
        if (!range) return true;
        
        return angle >= range[0] && angle <= range[1];
    }
    
    /**
     * 获取角度变化
     * @param {string} jointName - 关节名称
     * @param {number} currentAngle - 当前角度
     * @returns {number} 角度变化
     */
    getAngleChange(jointName, currentAngle) {
        const history = this.angleHistory.get(jointName) || [];
        if (history.length === 0) {
            return 0;
        }
        
        const lastAngle = history[history.length - 1];
        return currentAngle - lastAngle;
    }
    
    /**
     * 添加角度到历史记录
     * @param {string} jointName - 关节名称
     * @param {number} angle - 角度
     */
    addAngleToHistory(jointName, angle) {
        const history = this.angleHistory.get(jointName) || [];
        history.push(angle);
        
        // 限制历史记录大小
        if (history.length > this.options.smoothingWindow * 2) {
            history.shift();
        }
        
        this.angleHistory.set(jointName, history);
    }
    
    /**
     * 分析速度
     * @returns {Object} 速度分析结果
     */
    analyzeVelocities() {
        const velocities = {};
        
        try {
            if (this.poseHistory.length < 2) {
                return velocities;
            }
            
            const current = this.poseHistory[this.poseHistory.length - 1];
            const previous = this.poseHistory[this.poseHistory.length - 2];
            
            const deltaTime = (current.timestamp - previous.timestamp) / 1000; // 秒
            
            if (deltaTime <= 0) {
                return velocities;
            }
            
            for (let i = 0; i < current.pose.keypoints.length; i++) {
                const currentKp = current.pose.keypoints[i];
                const previousKp = previous.pose.keypoints[i];
                
                if (currentKp.score >= this.options.minConfidence && 
                    previousKp.score >= this.options.minConfidence) {
                    
                    const deltaX = currentKp.x - previousKp.x;
                    const deltaY = currentKp.y - previousKp.y;
                    
                    const velocity = {
                        x: deltaX / deltaTime,
                        y: deltaY / deltaTime,
                        magnitude: Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime,
                        direction: Math.atan2(deltaY, deltaX) * (180 / Math.PI)
                    };
                    
                    velocities[`keypoint_${i}`] = velocity;
                    this.stats.velocityCalculations++;
                }
            }
            
        } catch (error) {
            this.logger.error('速度分析失败:', error);
        }
        
        return velocities;
    }
    
    /**
     * 分析加速度
     * @returns {Object} 加速度分析结果
     */
    analyzeAccelerations() {
        const accelerations = {};
        
        try {
            if (this.poseHistory.length < 3) {
                return accelerations;
            }
            
            const current = this.poseHistory[this.poseHistory.length - 1];
            const middle = this.poseHistory[this.poseHistory.length - 2];
            const previous = this.poseHistory[this.poseHistory.length - 3];
            
            const deltaTime1 = (middle.timestamp - previous.timestamp) / 1000;
            const deltaTime2 = (current.timestamp - middle.timestamp) / 1000;
            
            if (deltaTime1 <= 0 || deltaTime2 <= 0) {
                return accelerations;
            }
            
            for (let i = 0; i < current.pose.keypoints.length; i++) {
                const currentKp = current.pose.keypoints[i];
                const middleKp = middle.pose.keypoints[i];
                const previousKp = previous.pose.keypoints[i];
                
                if (currentKp.score >= this.options.minConfidence && 
                    middleKp.score >= this.options.minConfidence &&
                    previousKp.score >= this.options.minConfidence) {
                    
                    // 计算速度
                    const v1x = (middleKp.x - previousKp.x) / deltaTime1;
                    const v1y = (middleKp.y - previousKp.y) / deltaTime1;
                    const v2x = (currentKp.x - middleKp.x) / deltaTime2;
                    const v2y = (currentKp.y - middleKp.y) / deltaTime2;
                    
                    // 计算加速度
                    const avgDeltaTime = (deltaTime1 + deltaTime2) / 2;
                    const ax = (v2x - v1x) / avgDeltaTime;
                    const ay = (v2y - v1y) / avgDeltaTime;
                    
                    const acceleration = {
                        x: ax,
                        y: ay,
                        magnitude: Math.sqrt(ax * ax + ay * ay),
                        direction: Math.atan2(ay, ax) * (180 / Math.PI)
                    };
                    
                    accelerations[`keypoint_${i}`] = acceleration;
                    this.stats.accelerationCalculations++;
                }
            }
            
        } catch (error) {
            this.logger.error('加速度分析失败:', error);
        }
        
        return accelerations;
    }
    
    /**
     * 分析力
     * @returns {Object} 力分析结果
     */
    analyzeForces() {
        const forces = {};
        
        try {
            // 简化的力分析，基于加速度和估计质量
            const accelerations = this.currentAnalysis.accelerations;
            if (!accelerations) {
                return forces;
            }
            
            // 估计身体各部分质量（基于总体重的比例）
            const estimatedBodyMass = 70; // kg，可以从用户输入获取
            
            for (const [keypointName, acceleration] of Object.entries(accelerations)) {
                // 根据关键点估计对应身体部分的质量
                const segmentMass = this.estimateSegmentMass(keypointName, estimatedBodyMass);
                
                const force = {
                    x: acceleration.x * segmentMass,
                    y: acceleration.y * segmentMass,
                    magnitude: acceleration.magnitude * segmentMass,
                    direction: acceleration.direction
                };
                
                forces[keypointName] = force;
                this.stats.forceCalculations++;
            }
            
        } catch (error) {
            this.logger.error('力分析失败:', error);
        }
        
        return forces;
    }
    
    /**
     * 估计身体部分质量
     * @param {string} keypointName - 关键点名称
     * @param {number} totalMass - 总质量
     * @returns {number} 估计质量
     */
    estimateSegmentMass(keypointName, totalMass) {
        // 简化的身体部分质量比例
        const massRatios = {
            'keypoint_0': 0.081, // 头部
            'keypoint_5': 0.028, // 左肩（上臂）
            'keypoint_6': 0.028, // 右肩（上臂）
            'keypoint_7': 0.016, // 左肘（前臂）
            'keypoint_8': 0.016, // 右肘（前臂）
            'keypoint_9': 0.006, // 左手
            'keypoint_10': 0.006, // 右手
            'keypoint_11': 0.100, // 左髋（大腿）
            'keypoint_12': 0.100, // 右髋（大腿）
            'keypoint_13': 0.0465, // 左膝（小腿）
            'keypoint_14': 0.0465, // 右膝（小腿）
            'keypoint_15': 0.0145, // 左脚
            'keypoint_16': 0.0145  // 右脚
        };
        
        const ratio = massRatios[keypointName] || 0.01;
        return totalMass * ratio;
    }
    
    /**
     * 分析对称性
     * @param {Object} pose - 姿态数据
     * @returns {Object} 对称性分析结果
     */
    analyzeSymmetry(pose) {
        const symmetry = {};
        
        try {
            // 定义对称关节对
            const symmetricPairs = [
                ['leftShoulder', 'rightShoulder'],
                ['leftElbow', 'rightElbow'],
                ['leftHip', 'rightHip'],
                ['leftKnee', 'rightKnee']
            ];
            
            for (const [leftJoint, rightJoint] of symmetricPairs) {
                const leftAngle = this.currentAnalysis.angles?.[leftJoint]?.current;
                const rightAngle = this.currentAnalysis.angles?.[rightJoint]?.current;
                
                if (leftAngle !== undefined && rightAngle !== undefined) {
                    const difference = Math.abs(leftAngle - rightAngle);
                    const asymmetryRatio = difference / Math.max(leftAngle, rightAngle);
                    
                    symmetry[`${leftJoint}_${rightJoint}`] = {
                        leftAngle,
                        rightAngle,
                        difference,
                        asymmetryRatio,
                        isSymmetric: difference <= this.options.angleThreshold
                    };
                }
            }
            
            // 计算整体对称性分数
            const symmetryScores = Object.values(symmetry).map(s => s.isSymmetric ? 1 : 0);
            const overallSymmetry = symmetryScores.length > 0 ? 
                symmetryScores.reduce((a, b) => a + b, 0) / symmetryScores.length : 0;
            
            symmetry.overall = {
                score: overallSymmetry,
                isSymmetric: overallSymmetry >= 0.8
            };
            
        } catch (error) {
            this.logger.error('对称性分析失败:', error);
        }
        
        return symmetry;
    }
    
    /**
     * 分析稳定性
     * @returns {Object} 稳定性分析结果
     */
    analyzeStability() {
        const stability = {};
        
        try {
            if (this.poseHistory.length < this.options.smoothingWindow) {
                return stability;
            }
            
            // 计算重心稳定性
            const centerOfMass = this.calculateCenterOfMass();
            stability.centerOfMass = centerOfMass;
            
            // 计算姿态稳定性（基于关键点位置变化）
            const postureStability = this.calculatePostureStability();
            stability.posture = postureStability;
            
            // 计算平衡性（基于支撑面积）
            const balance = this.calculateBalance();
            stability.balance = balance;
            
        } catch (error) {
            this.logger.error('稳定性分析失败:', error);
        }
        
        return stability;
    }
    
    /**
     * 计算重心
     * @returns {Object} 重心信息
     */
    calculateCenterOfMass() {
        const recentPoses = this.poseHistory.slice(-this.options.smoothingWindow);
        const centerHistory = [];
        
        for (const poseData of recentPoses) {
            const pose = poseData.pose;
            let totalMass = 0;
            let weightedX = 0;
            let weightedY = 0;
            
            for (let i = 0; i < pose.keypoints.length; i++) {
                const kp = pose.keypoints[i];
                if (kp.score >= this.options.minConfidence) {
                    const mass = this.estimateSegmentMass(`keypoint_${i}`, 70);
                    totalMass += mass;
                    weightedX += kp.x * mass;
                    weightedY += kp.y * mass;
                }
            }
            
            if (totalMass > 0) {
                centerHistory.push({
                    x: weightedX / totalMass,
                    y: weightedY / totalMass,
                    timestamp: poseData.timestamp
                });
            }
        }
        
        if (centerHistory.length === 0) {
            return null;
        }
        
        // 计算重心变化
        const current = centerHistory[centerHistory.length - 1];
        const displacement = centerHistory.length > 1 ? {
            x: current.x - centerHistory[0].x,
            y: current.y - centerHistory[0].y
        } : { x: 0, y: 0 };
        
        const stability = Math.sqrt(displacement.x * displacement.x + displacement.y * displacement.y);
        
        return {
            current,
            displacement,
            stability,
            isStable: stability < 50 // 像素阈值
        };
    }
    
    /**
     * 计算姿态稳定性
     * @returns {Object} 姿态稳定性
     */
    calculatePostureStability() {
        const recentPoses = this.poseHistory.slice(-this.options.smoothingWindow);
        
        if (recentPoses.length < 2) {
            return null;
        }
        
        let totalVariation = 0;
        let validComparisons = 0;
        
        for (let i = 1; i < recentPoses.length; i++) {
            const current = recentPoses[i].pose;
            const previous = recentPoses[i - 1].pose;
            
            let poseVariation = 0;
            let validKeypoints = 0;
            
            for (let j = 0; j < current.keypoints.length; j++) {
                const currentKp = current.keypoints[j];
                const previousKp = previous.keypoints[j];
                
                if (currentKp.score >= this.options.minConfidence && 
                    previousKp.score >= this.options.minConfidence) {
                    
                    const dx = currentKp.x - previousKp.x;
                    const dy = currentKp.y - previousKp.y;
                    poseVariation += Math.sqrt(dx * dx + dy * dy);
                    validKeypoints++;
                }
            }
            
            if (validKeypoints > 0) {
                totalVariation += poseVariation / validKeypoints;
                validComparisons++;
            }
        }
        
        const averageVariation = validComparisons > 0 ? totalVariation / validComparisons : 0;
        
        return {
            variation: averageVariation,
            isStable: averageVariation < 10, // 像素阈值
            stability: Math.max(0, 1 - averageVariation / 50) // 归一化稳定性分数
        };
    }
    
    /**
     * 计算平衡性
     * @returns {Object} 平衡性信息
     */
    calculateBalance() {
        if (this.poseHistory.length === 0) {
            return null;
        }
        
        const currentPose = this.poseHistory[this.poseHistory.length - 1].pose;
        
        // 获取脚部关键点
        const leftAnkle = this.getKeypointByName(currentPose, 'left_ankle');
        const rightAnkle = this.getKeypointByName(currentPose, 'right_ankle');
        
        if (!leftAnkle || !rightAnkle || 
            leftAnkle.score < this.options.minConfidence || 
            rightAnkle.score < this.options.minConfidence) {
            return null;
        }
        
        // 计算支撑面积（简化为脚部距离）
        const supportWidth = Math.abs(rightAnkle.x - leftAnkle.x);
        
        // 获取重心
        const centerOfMass = this.calculateCenterOfMass();
        if (!centerOfMass) {
            return null;
        }
        
        // 计算重心相对于支撑面的位置
        const centerX = (leftAnkle.x + rightAnkle.x) / 2;
        const lateralDeviation = Math.abs(centerOfMass.current.x - centerX);
        
        // 计算平衡分数
        const balanceScore = Math.max(0, 1 - lateralDeviation / (supportWidth / 2));
        
        return {
            supportWidth,
            lateralDeviation,
            balanceScore,
            isBalanced: balanceScore > 0.7
        };
    }
    
    /**
     * 更新统计信息
     * @param {number} processingTime - 处理时间
     */
    updateStats(processingTime) {
        this.stats.totalAnalyses++;
        this.stats.averageProcessingTime = 
            (this.stats.averageProcessingTime * (this.stats.totalAnalyses - 1) + processingTime) / 
            this.stats.totalAnalyses;
    }
    
    /**
     * 获取当前分析结果
     * @returns {Object} 当前分析结果
     */
    getCurrentAnalysis() {
        return { ...this.currentAnalysis };
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            historySize: this.poseHistory.length,
            cacheSize: this.cache.size
        };
    }
    
    /**
     * 重置分析器
     */
    reset() {
        this.poseHistory.length = 0;
        
        for (const history of this.angleHistory.values()) {
            history.length = 0;
        }
        
        for (const history of this.velocityHistory.values()) {
            history.length = 0;
        }
        
        for (const history of this.accelerationHistory.values()) {
            history.length = 0;
        }
        
        this.currentAnalysis = {
            angles: new Map(),
            velocities: new Map(),
            accelerations: new Map(),
            forces: new Map(),
            symmetry: {},
            stability: {},
            timestamp: null
        };
        
        this.cache.clear();
        
        if (this.options.debug) {
            this.logger.info('生物力学分析器已重置');
        }
    }
    
    /**
     * 更新配置
     * @param {Object} newOptions - 新配置
     */
    updateOptions(newOptions) {
        this.options = { ...this.options, ...newOptions };
        
        if (this.options.debug) {
            this.logger.info('生物力学分析器配置已更新', newOptions);
        }
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.reset();
        
        this.angleHistory.clear();
        this.velocityHistory.clear();
        this.accelerationHistory.clear();
        
        if (this.options.debug) {
            this.logger.info('生物力学分析器资源已清理');
        }
    }
}

export default BiomechanicsAnalyzer;