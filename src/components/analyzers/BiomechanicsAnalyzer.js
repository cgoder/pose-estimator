/**
 * 生物力学分析器
 * 提供高级的生物力学分析功能，包括关节力矩、功率、效率等计算
 */
import KinematicsAnalyzer from './KinematicsAnalyzer.js';

class BiomechanicsAnalyzer {
    constructor() {
        this.name = 'BiomechanicsAnalyzer';
        this.kinematicsAnalyzer = new KinematicsAnalyzer();
        
        // 人体测量学参数（相对比例）
        this.anthropometrics = {
            // 身体段长度比例（相对于身高）
            headHeight: 0.130,
            neckLength: 0.052,
            shoulderWidth: 0.259,
            upperArmLength: 0.186,
            forearmLength: 0.146,
            handLength: 0.108,
            torsoLength: 0.288,
            pelvisWidth: 0.191,
            thighLength: 0.245,
            shinLength: 0.246,
            footLength: 0.152,
            
            // 身体段质量比例（相对于总体重）
            headMass: 0.081,
            neckMass: 0.011,
            torsoMass: 0.497,
            upperArmMass: 0.028,
            forearmMass: 0.016,
            handMass: 0.006,
            thighMass: 0.100,
            shinMass: 0.0465,
            footMass: 0.0145
        };
        
        // 关节角度范围（正常运动范围）
        this.jointRanges = {
            shoulder: { flexion: [0, 180], extension: [0, 60], abduction: [0, 180] },
            elbow: { flexion: [0, 150], extension: [0, 10] },
            hip: { flexion: [0, 125], extension: [0, 30], abduction: [0, 45] },
            knee: { flexion: [0, 135], extension: [0, 10] },
            ankle: { dorsiflexion: [0, 20], plantarflexion: [0, 50] }
        };
        
        // 力学参数
        this.gravity = 9.81; // m/s²
        this.bodyHeight = 1.7; // 默认身高（米），应该从用户输入获取
        this.bodyMass = 70; // 默认体重（公斤），应该从用户输入获取
        
        // 分析历史
        this.forceHistory = new Map();
        this.powerHistory = new Map();
        this.efficiencyHistory = new Map();
    }

    /**
     * 设置用户的身体参数
     * @param {number} height - 身高（米）
     * @param {number} mass - 体重（公斤）
     */
    setBodyParameters(height, mass) {
        this.bodyHeight = height;
        this.bodyMass = mass;
    }

    /**
     * 执行完整的生物力学分析
     * @param {Array} keypoints - 关键点数组
     * @param {number} timestamp - 时间戳
     * @param {number} deltaTime - 时间间隔
     * @param {string} exerciseType - 运动类型
     */
    analyze(keypoints, timestamp, deltaTime, exerciseType) {
        // 更新运动学数据
        this.kinematicsAnalyzer.updateKinematics(keypoints, timestamp, deltaTime);
        
        // 计算关节角度
        const jointAngles = this._calculateJointAngles(keypoints);
        
        // 更新历史数据
        this._updateHistory(jointAngles, keypoints);
        
        // 计算关节力矩
        const jointMoments = this._calculateJointMoments(keypoints, jointAngles, deltaTime);
        
        // 计算功率
        const power = this._calculatePower(jointAngles, jointMoments, deltaTime);
        
        // 计算运动效率
        const efficiency = this._calculateEfficiency(power, exerciseType);
        
        // 分析运动对称性
        const symmetry = this._analyzeSymmetry(keypoints, jointAngles);
        
        // 分析运动稳定性
        const stability = this._analyzeStability(keypoints);
        
        // 计算能量消耗估算
        const energyExpenditure = this._estimateEnergyExpenditure(power, deltaTime);
        
        // 风险评估
        const riskAssessment = this._assessInjuryRisk(jointAngles, keypoints, exerciseType);
        
        return {
            timestamp,
            jointAngles,
            jointMoments,
            power,
            efficiency,
            symmetry,
            stability,
            energyExpenditure,
            riskAssessment,
            kinematics: this._getKinematicsData(keypoints)
        };
    }

    /**
     * 计算主要关节角度
     */
    _calculateJointAngles(keypoints) {
        const angles = {};
        
        // 肩关节角度
        if (this._validatePoints(keypoints, [5, 7, 9])) { // 左肩
            angles.leftShoulder = this._calculateAngle(keypoints[7], keypoints[5], keypoints[9]);
        }
        if (this._validatePoints(keypoints, [6, 8, 10])) { // 右肩
            angles.rightShoulder = this._calculateAngle(keypoints[8], keypoints[6], keypoints[10]);
        }
        
        // 肘关节角度
        if (this._validatePoints(keypoints, [5, 7, 9])) { // 左肘
            angles.leftElbow = this._calculateAngle(keypoints[5], keypoints[7], keypoints[9]);
        }
        if (this._validatePoints(keypoints, [6, 8, 10])) { // 右肘
            angles.rightElbow = this._calculateAngle(keypoints[6], keypoints[8], keypoints[10]);
        }
        
        // 髋关节角度
        if (this._validatePoints(keypoints, [11, 13, 15])) { // 左髋
            angles.leftHip = this._calculateAngle(keypoints[11], keypoints[13], keypoints[15]);
        }
        if (this._validatePoints(keypoints, [12, 14, 16])) { // 右髋
            angles.rightHip = this._calculateAngle(keypoints[12], keypoints[14], keypoints[16]);
        }
        
        // 膝关节角度
        if (this._validatePoints(keypoints, [11, 13, 15])) { // 左膝
            angles.leftKnee = this._calculateAngle(keypoints[11], keypoints[13], keypoints[15]);
        }
        if (this._validatePoints(keypoints, [12, 14, 16])) { // 右膝
            angles.rightKnee = this._calculateAngle(keypoints[12], keypoints[14], keypoints[16]);
        }
        
        // 踝关节角度（简化计算）
        if (this._validatePoints(keypoints, [13, 15]) && keypoints[15]) {
            // 使用垂直线作为参考
            const shinVector = { x: 0, y: keypoints[13].y - keypoints[15].y };
            const footVector = { x: 1, y: 0 }; // 假设脚部水平
            angles.leftAnkle = this._calculateVectorAngle(shinVector, footVector);
        }
        if (this._validatePoints(keypoints, [14, 16]) && keypoints[16]) {
            const shinVector = { x: 0, y: keypoints[14].y - keypoints[16].y };
            const footVector = { x: 1, y: 0 };
            angles.rightAnkle = this._calculateVectorAngle(shinVector, footVector);
        }
        
        // 躯干角度（相对于垂直线）
        if (this._validatePoints(keypoints, [5, 6, 11, 12])) {
            const shoulderCenter = {
                x: (keypoints[5].x + keypoints[6].x) / 2,
                y: (keypoints[5].y + keypoints[6].y) / 2
            };
            const hipCenter = {
                x: (keypoints[11].x + keypoints[12].x) / 2,
                y: (keypoints[11].y + keypoints[12].y) / 2
            };
            const torsoVector = {
                x: shoulderCenter.x - hipCenter.x,
                y: shoulderCenter.y - hipCenter.y
            };
            const verticalVector = { x: 0, y: -1 };
            angles.torso = this._calculateVectorAngle(torsoVector, verticalVector);
        }
        
        return angles;
    }

    /**
     * 计算关节力矩（简化模型）
     */
    _calculateJointMoments(keypoints, jointAngles, deltaTime) {
        const moments = {};
        
        // 获取角速度
        const angularVelocities = this._getAngularVelocities(jointAngles, deltaTime);
        
        // 计算各关节的力矩（基于简化的逆动力学）
        Object.keys(jointAngles).forEach(joint => {
            const segmentMass = this._getSegmentMass(joint);
            const segmentLength = this._getSegmentLength(joint);
            const angularVel = angularVelocities[joint] || 0;
            const angularAcc = this._getAngularAcceleration(joint, deltaTime);
            
            // 简化的力矩计算：I * α + 重力影响
            const momentOfInertia = segmentMass * Math.pow(segmentLength, 2) / 3; // 简化为杆状物体
            const dynamicMoment = momentOfInertia * angularAcc;
            const gravitationalMoment = segmentMass * this.gravity * segmentLength * Math.sin(jointAngles[joint] * Math.PI / 180) / 2;
            
            moments[joint] = dynamicMoment + gravitationalMoment;
        });
        
        return moments;
    }

    /**
     * 计算功率
     */
    _calculatePower(jointAngles, jointMoments, deltaTime) {
        const power = {};
        let totalPower = 0;
        
        Object.keys(jointMoments).forEach(joint => {
            const angularVel = this._getAngularVelocity(joint) || 0;
            const moment = jointMoments[joint] || 0;
            
            // 功率 = 力矩 × 角速度
            power[joint] = Math.abs(moment * angularVel * Math.PI / 180); // 转换为弧度
            totalPower += power[joint];
        });
        
        power.total = totalPower;
        
        // 记录功率历史
        if (!this.powerHistory.has('total')) {
            this.powerHistory.set('total', []);
        }
        this.powerHistory.get('total').push({
            value: totalPower,
            timestamp: Date.now()
        });
        
        return power;
    }

    /**
     * 计算运动效率
     */
    _calculateEfficiency(power, exerciseType) {
        const totalPower = power.total || 0;
        
        // 基于运动类型的理论最优功率
        const optimalPower = this._getOptimalPower(exerciseType);
        
        // 效率计算（简化模型）
        const mechanicalEfficiency = optimalPower > 0 ? Math.min(1, optimalPower / totalPower) : 0;
        
        // 功率分布效率（各关节功率的均匀性）
        const powerValues = Object.values(power).filter(p => typeof p === 'number' && p > 0);
        const powerDistributionEfficiency = this._calculateUniformity(powerValues);
        
        const efficiency = {
            mechanical: mechanicalEfficiency,
            powerDistribution: powerDistributionEfficiency,
            overall: (mechanicalEfficiency + powerDistributionEfficiency) / 2
        };
        
        // 记录效率历史
        if (!this.efficiencyHistory.has('overall')) {
            this.efficiencyHistory.set('overall', []);
        }
        this.efficiencyHistory.get('overall').push({
            value: efficiency.overall,
            timestamp: Date.now()
        });
        
        return efficiency;
    }

    /**
     * 分析运动对称性
     */
    _analyzeSymmetry(keypoints, jointAngles) {
        const symmetry = {};
        
        // 关节角度对称性
        const jointPairs = [
            ['leftShoulder', 'rightShoulder'],
            ['leftElbow', 'rightElbow'],
            ['leftHip', 'rightHip'],
            ['leftKnee', 'rightKnee'],
            ['leftAnkle', 'rightAnkle']
        ];
        
        jointPairs.forEach(([left, right]) => {
            if (jointAngles[left] !== undefined && jointAngles[right] !== undefined) {
                const difference = Math.abs(jointAngles[left] - jointAngles[right]);
                const average = (jointAngles[left] + jointAngles[right]) / 2;
                const asymmetryPercentage = average > 0 ? (difference / average) * 100 : 0;
                
                symmetry[left.replace('left', '').toLowerCase()] = {
                    difference,
                    asymmetryPercentage,
                    isSymmetric: asymmetryPercentage < 10 // 10%以内认为对称
                };
            }
        });
        
        // 位置对称性
        const positionSymmetry = this._analyzePositionSymmetry(keypoints);
        symmetry.position = positionSymmetry;
        
        // 整体对称性评分
        const symmetryScores = Object.values(symmetry)
            .filter(s => typeof s === 'object' && s.asymmetryPercentage !== undefined)
            .map(s => Math.max(0, 100 - s.asymmetryPercentage));
        
        symmetry.overallScore = symmetryScores.length > 0 ? 
            symmetryScores.reduce((sum, score) => sum + score, 0) / symmetryScores.length : 0;
        
        return symmetry;
    }

    /**
     * 分析位置对称性
     */
    _analyzePositionSymmetry(keypoints) {
        // 计算身体中线
        const nose = keypoints[0];
        const neck = keypoints[1];
        const midHip = {
            x: (keypoints[11].x + keypoints[12].x) / 2,
            y: (keypoints[11].y + keypoints[12].y) / 2
        };
        
        if (!nose || !neck) return { score: 0, isSymmetric: false };
        
        const centerLine = {
            x: (nose.x + neck.x + midHip.x) / 3,
            y: 0 // 不考虑Y轴偏移
        };
        
        // 检查左右关键点相对于中线的对称性
        const leftPoints = [5, 7, 9, 11, 13, 15]; // 左侧关键点
        const rightPoints = [6, 8, 10, 12, 14, 16]; // 右侧关键点
        
        let totalAsymmetry = 0;
        let validPairs = 0;
        
        for (let i = 0; i < leftPoints.length; i++) {
            const leftPoint = keypoints[leftPoints[i]];
            const rightPoint = keypoints[rightPoints[i]];
            
            if (leftPoint && rightPoint) {
                const leftDistance = Math.abs(leftPoint.x - centerLine.x);
                const rightDistance = Math.abs(rightPoint.x - centerLine.x);
                const asymmetry = Math.abs(leftDistance - rightDistance);
                
                totalAsymmetry += asymmetry;
                validPairs++;
            }
        }
        
        const averageAsymmetry = validPairs > 0 ? totalAsymmetry / validPairs : 0;
        const symmetryScore = Math.max(0, 100 - averageAsymmetry);
        
        return {
            score: symmetryScore,
            averageAsymmetry,
            isSymmetric: symmetryScore > 80
        };
    }

    /**
     * 分析运动稳定性
     */
    _analyzeStability(keypoints) {
        const stability = {};
        
        // 重心稳定性
        const centerOfMass = this._calculateCenterOfMass(keypoints);
        const baseOfSupport = this._calculateBaseOfSupport(keypoints);
        
        stability.centerOfMass = centerOfMass;
        stability.baseOfSupport = baseOfSupport;
        stability.isStable = this._isWithinBaseOfSupport(centerOfMass, baseOfSupport);
        
        // 姿态稳定性（基于关键点的变化）
        const postureStability = this._analyzePostureStability(keypoints);
        stability.posture = postureStability;
        
        // 整体稳定性评分
        stability.overallScore = this._calculateStabilityScore(stability);
        
        return stability;
    }

    /**
     * 计算重心
     */
    _calculateCenterOfMass(keypoints) {
        let totalMass = 0;
        let weightedX = 0;
        let weightedY = 0;
        
        // 身体段质心位置和质量
        const segments = [
            { points: [0], mass: this.anthropometrics.headMass, name: 'head' },
            { points: [5, 6, 11, 12], mass: this.anthropometrics.torsoMass, name: 'torso' },
            { points: [5, 7], mass: this.anthropometrics.upperArmMass, name: 'leftUpperArm' },
            { points: [6, 8], mass: this.anthropometrics.upperArmMass, name: 'rightUpperArm' },
            { points: [7, 9], mass: this.anthropometrics.forearmMass, name: 'leftForearm' },
            { points: [8, 10], mass: this.anthropometrics.forearmMass, name: 'rightForearm' },
            { points: [11, 13], mass: this.anthropometrics.thighMass, name: 'leftThigh' },
            { points: [12, 14], mass: this.anthropometrics.thighMass, name: 'rightThigh' },
            { points: [13, 15], mass: this.anthropometrics.shinMass, name: 'leftShin' },
            { points: [14, 16], mass: this.anthropometrics.shinMass, name: 'rightShin' }
        ];
        
        segments.forEach(segment => {
            const segmentCenter = this._calculateSegmentCenter(keypoints, segment.points);
            if (segmentCenter) {
                const segmentMass = segment.mass * this.bodyMass;
                totalMass += segmentMass;
                weightedX += segmentCenter.x * segmentMass;
                weightedY += segmentCenter.y * segmentMass;
            }
        });
        
        return totalMass > 0 ? {
            x: weightedX / totalMass,
            y: weightedY / totalMass
        } : null;
    }

    /**
     * 计算支撑面
     */
    _calculateBaseOfSupport(keypoints) {
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!leftAnkle || !rightAnkle) return null;
        
        // 简化为两脚之间的矩形区域
        return {
            left: Math.min(leftAnkle.x, rightAnkle.x) - 50, // 假设脚宽
            right: Math.max(leftAnkle.x, rightAnkle.x) + 50,
            front: Math.min(leftAnkle.y, rightAnkle.y) - 100, // 假设脚长
            back: Math.max(leftAnkle.y, rightAnkle.y) + 50
        };
    }

    /**
     * 估算能量消耗
     */
    _estimateEnergyExpenditure(power, deltaTime) {
        const totalPower = power.total || 0;
        const timeInSeconds = deltaTime / 1000;
        
        // 能量消耗 = 功率 × 时间
        const mechanicalWork = totalPower * timeInSeconds; // 焦耳
        
        // 考虑人体效率（约25%）
        const metabolicCost = mechanicalWork / 0.25;
        
        // 转换为卡路里（1焦耳 ≈ 0.000239卡路里）
        const calories = metabolicCost * 0.000239;
        
        return {
            mechanicalWork, // 焦耳
            metabolicCost, // 焦耳
            calories, // 卡路里
            powerWatts: totalPower // 瓦特
        };
    }

    /**
     * 评估受伤风险
     */
    _assessInjuryRisk(jointAngles, keypoints, exerciseType) {
        const risks = [];
        let overallRisk = 0;
        
        // 检查关节角度是否超出安全范围
        Object.keys(jointAngles).forEach(joint => {
            const angle = jointAngles[joint];
            const risk = this._checkJointAngleRisk(joint, angle, exerciseType);
            if (risk.level > 0) {
                risks.push(risk);
                overallRisk = Math.max(overallRisk, risk.level);
            }
        });
        
        // 检查运动速度风险
        const velocityRisk = this._checkVelocityRisk(keypoints);
        if (velocityRisk.level > 0) {
            risks.push(velocityRisk);
            overallRisk = Math.max(overallRisk, velocityRisk.level);
        }
        
        // 检查负荷分布风险
        const loadRisk = this._checkLoadDistributionRisk(keypoints);
        if (loadRisk.level > 0) {
            risks.push(loadRisk);
            overallRisk = Math.max(overallRisk, loadRisk.level);
        }
        
        return {
            overallRisk,
            riskLevel: this._getRiskLevel(overallRisk),
            specificRisks: risks,
            recommendations: this._generateRiskRecommendations(risks)
        };
    }

    // 辅助方法
    _validatePoints(keypoints, indices) {
        return indices.every(i => keypoints[i] && 
            typeof keypoints[i].x === 'number' && 
            typeof keypoints[i].y === 'number');
    }

    _calculateAngle(point1, vertex, point2) {
        if (!point1 || !vertex || !point2) return 0;
        
        const vector1 = {
            x: point1.x - vertex.x,
            y: point1.y - vertex.y
        };
        
        const vector2 = {
            x: point2.x - vertex.x,
            y: point2.y - vertex.y
        };
        
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        const cosAngle = dotProduct / (magnitude1 * magnitude2);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleRad = Math.acos(clampedCos);
        
        return angleRad * 180 / Math.PI;
    }

    _calculateVectorAngle(vector1, vector2) {
        const dotProduct = vector1.x * vector2.x + vector1.y * vector2.y;
        const magnitude1 = Math.sqrt(vector1.x * vector1.x + vector1.y * vector1.y);
        const magnitude2 = Math.sqrt(vector2.x * vector2.x + vector2.y * vector2.y);
        
        if (magnitude1 === 0 || magnitude2 === 0) return 0;
        
        const cosAngle = dotProduct / (magnitude1 * magnitude2);
        const clampedCos = Math.max(-1, Math.min(1, cosAngle));
        const angleRad = Math.acos(clampedCos);
        
        return angleRad * 180 / Math.PI;
    }

    _getSegmentMass(joint) {
        const massMap = {
            'leftShoulder': this.anthropometrics.upperArmMass,
            'rightShoulder': this.anthropometrics.upperArmMass,
            'leftElbow': this.anthropometrics.forearmMass,
            'rightElbow': this.anthropometrics.forearmMass,
            'leftHip': this.anthropometrics.thighMass,
            'rightHip': this.anthropometrics.thighMass,
            'leftKnee': this.anthropometrics.shinMass,
            'rightKnee': this.anthropometrics.shinMass,
            'torso': this.anthropometrics.torsoMass
        };
        return (massMap[joint] || 0.05) * this.bodyMass;
    }

    _getSegmentLength(joint) {
        const lengthMap = {
            'leftShoulder': this.anthropometrics.upperArmLength,
            'rightShoulder': this.anthropometrics.upperArmLength,
            'leftElbow': this.anthropometrics.forearmLength,
            'rightElbow': this.anthropometrics.forearmLength,
            'leftHip': this.anthropometrics.thighLength,
            'rightHip': this.anthropometrics.thighLength,
            'leftKnee': this.anthropometrics.shinLength,
            'rightKnee': this.anthropometrics.shinLength,
            'torso': this.anthropometrics.torsoLength
        };
        return (lengthMap[joint] || 0.2) * this.bodyHeight;
    }

    _getOptimalPower(exerciseType) {
        // 基于运动类型的理论最优功率（瓦特/公斤体重）
        const powerMap = {
            'squat': 15,
            'pushup': 8,
            'plank': 3,
            'jumping': 20,
            'running': 12,
            'walking': 5
        };
        return (powerMap[exerciseType] || 10) * this.bodyMass;
    }

    _calculateUniformity(values) {
        if (values.length < 2) return 1;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const coefficient = mean > 0 ? Math.sqrt(variance) / mean : 0;
        
        return Math.max(0, 1 - coefficient);
    }

    _getKinematicsData(keypoints) {
        const data = {};
        
        // 获取主要关键点的运动学数据
        const importantPoints = [5, 6, 7, 8, 11, 12, 13, 14, 15, 16];
        
        importantPoints.forEach(pointIndex => {
            const velocity = this.kinematicsAnalyzer.getVelocity(pointIndex);
            const acceleration = this.kinematicsAnalyzer.getAcceleration(pointIndex);
            const smoothness = this.kinematicsAnalyzer.calculateSmoothness(pointIndex);
            const motionPattern = this.kinematicsAnalyzer.detectMotionPattern(pointIndex);
            
            if (velocity || acceleration || smoothness || motionPattern) {
                data[`point_${pointIndex}`] = {
                    velocity,
                    acceleration,
                    smoothness,
                    motionPattern
                };
            }
        });
        
        return data;
    }

    // 缺失的辅助方法实现
    _getAngularVelocities(jointAngles, deltaTime) {
        const velocities = {};
        Object.keys(jointAngles).forEach(joint => {
            velocities[joint] = this._getAngularVelocity(joint, deltaTime);
        });
        return velocities;
    }

    _getAngularVelocity(joint, deltaTime = 0.033) {
        if (!this.previousAngles || !this.previousAngles[joint]) {
            return 0;
        }
        const currentAngle = this.currentAngles ? this.currentAngles[joint] : 0;
        const previousAngle = this.previousAngles[joint];
        return (currentAngle - previousAngle) / deltaTime;
    }

    _getAngularAcceleration(joint, deltaTime) {
        if (!this.previousVelocities || !this.previousVelocities[joint]) {
            return 0;
        }
        const currentVel = this._getAngularVelocity(joint, deltaTime);
        const previousVel = this.previousVelocities[joint];
        return (currentVel - previousVel) / deltaTime;
    }

    _calculateSegmentCenter(keypoints, pointIndices) {
        const validPoints = pointIndices
            .map(i => keypoints[i])
            .filter(point => point && typeof point.x === 'number' && typeof point.y === 'number');
        
        if (validPoints.length === 0) return null;
        
        const sumX = validPoints.reduce((sum, point) => sum + point.x, 0);
        const sumY = validPoints.reduce((sum, point) => sum + point.y, 0);
        
        return {
            x: sumX / validPoints.length,
            y: sumY / validPoints.length
        };
    }

    _isWithinBaseOfSupport(centerOfMass, baseOfSupport) {
        if (!centerOfMass || !baseOfSupport) return false;
        
        return centerOfMass.x >= baseOfSupport.left &&
               centerOfMass.x <= baseOfSupport.right &&
               centerOfMass.y >= baseOfSupport.front &&
               centerOfMass.y <= baseOfSupport.back;
    }

    _analyzePostureStability(keypoints) {
        // 计算关键点的变化率
        const stabilityPoints = [0, 1, 5, 6, 11, 12]; // 头、颈、肩、髋
        let totalVariation = 0;
        let validPoints = 0;
        
        stabilityPoints.forEach(pointIndex => {
            const point = keypoints[pointIndex];
            if (point && this.previousKeypoints && this.previousKeypoints[pointIndex]) {
                const dx = point.x - this.previousKeypoints[pointIndex].x;
                const dy = point.y - this.previousKeypoints[pointIndex].y;
                const variation = Math.sqrt(dx * dx + dy * dy);
                totalVariation += variation;
                validPoints++;
            }
        });
        
        const averageVariation = validPoints > 0 ? totalVariation / validPoints : 0;
        const stabilityScore = Math.max(0, 100 - averageVariation);
        
        return {
            score: stabilityScore,
            averageVariation,
            isStable: stabilityScore > 70
        };
    }

    _calculateStabilityScore(stability) {
        let score = 0;
        let factors = 0;
        
        if (stability.isStable !== undefined) {
            score += stability.isStable ? 50 : 0;
            factors++;
        }
        
        if (stability.posture && stability.posture.score !== undefined) {
            score += stability.posture.score * 0.5;
            factors++;
        }
        
        return factors > 0 ? score / factors : 0;
    }

    _checkJointAngleRisk(joint, angle, exerciseType) {
        const jointName = joint.replace(/^(left|right)/, '').toLowerCase();
        const ranges = this.jointRanges[jointName];
        
        if (!ranges) {
            return { level: 0, message: '', joint };
        }
        
        // 检查是否超出正常范围
        let riskLevel = 0;
        let message = '';
        
        Object.keys(ranges).forEach(movement => {
            const [min, max] = ranges[movement];
            if (angle < min - 10 || angle > max + 10) {
                riskLevel = Math.max(riskLevel, 3); // 高风险
                message = `${joint} ${movement} 角度超出安全范围`;
            } else if (angle < min || angle > max) {
                riskLevel = Math.max(riskLevel, 2); // 中等风险
                message = `${joint} ${movement} 角度接近极限`;
            }
        });
        
        return { level: riskLevel, message, joint };
    }

    _checkVelocityRisk(keypoints) {
        // 检查运动速度是否过快
        let maxVelocity = 0;
        const importantPoints = [5, 6, 7, 8, 11, 12, 13, 14];
        
        importantPoints.forEach(pointIndex => {
            const velocity = this.kinematicsAnalyzer.getVelocity(pointIndex);
            if (velocity && velocity.magnitude) {
                maxVelocity = Math.max(maxVelocity, velocity.magnitude);
            }
        });
        
        let riskLevel = 0;
        let message = '';
        
        if (maxVelocity > 1000) { // 像素/秒
            riskLevel = 3;
            message = '运动速度过快，可能导致受伤';
        } else if (maxVelocity > 500) {
            riskLevel = 2;
            message = '运动速度较快，注意控制';
        }
        
        return { level: riskLevel, message, type: 'velocity' };
    }

    _checkLoadDistributionRisk(keypoints) {
        // 检查负荷分布是否均匀
        const leftPoints = [5, 7, 9, 11, 13, 15];
        const rightPoints = [6, 8, 10, 12, 14, 16];
        
        let leftLoad = 0;
        let rightLoad = 0;
        
        leftPoints.forEach(pointIndex => {
            const velocity = this.kinematicsAnalyzer.getVelocity(pointIndex);
            if (velocity && velocity.magnitude) {
                leftLoad += velocity.magnitude;
            }
        });
        
        rightPoints.forEach(pointIndex => {
            const velocity = this.kinematicsAnalyzer.getVelocity(pointIndex);
            if (velocity && velocity.magnitude) {
                rightLoad += velocity.magnitude;
            }
        });
        
        const totalLoad = leftLoad + rightLoad;
        const imbalance = totalLoad > 0 ? Math.abs(leftLoad - rightLoad) / totalLoad : 0;
        
        let riskLevel = 0;
        let message = '';
        
        if (imbalance > 0.3) {
            riskLevel = 2;
            message = '左右负荷分布不均，注意平衡';
        } else if (imbalance > 0.2) {
            riskLevel = 1;
            message = '轻微负荷不平衡';
        }
        
        return { level: riskLevel, message, type: 'load_distribution', imbalance };
    }

    _getRiskLevel(overallRisk) {
        if (overallRisk >= 3) return 'high';
        if (overallRisk >= 2) return 'medium';
        if (overallRisk >= 1) return 'low';
        return 'none';
    }

    _generateRiskRecommendations(risks) {
        const recommendations = [];
        
        risks.forEach(risk => {
            switch (risk.type) {
                case 'velocity':
                    recommendations.push('减慢运动速度，注意动作控制');
                    break;
                case 'load_distribution':
                    recommendations.push('注意左右平衡，均匀分配负荷');
                    break;
                default:
                    if (risk.joint) {
                        recommendations.push(`注意${risk.joint}的动作幅度和姿态`);
                    }
            }
        });
        
        return recommendations;
    }

    /**
     * 更新历史数据（在analyze方法中调用）
     */
    _updateHistory(jointAngles, keypoints) {
        this.previousAngles = this.currentAngles;
        this.currentAngles = jointAngles;
        
        this.previousVelocities = this.currentVelocities;
        this.currentVelocities = this._getAngularVelocities(jointAngles, 0.033);
        
        this.previousKeypoints = keypoints;
    }

    /**
     * 重置分析器
     */
    reset() {
        this.kinematicsAnalyzer.reset();
        this.forceHistory.clear();
        this.powerHistory.clear();
        this.efficiencyHistory.clear();
        
        // 重置历史数据
        this.previousAngles = null;
        this.currentAngles = null;
        this.previousVelocities = null;
        this.currentVelocities = null;
        this.previousKeypoints = null;
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            kinematics: this.kinematicsAnalyzer.getStats(),
            forceEntries: Array.from(this.forceHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
            powerEntries: Array.from(this.powerHistory.values()).reduce((sum, hist) => sum + hist.length, 0),
            efficiencyEntries: Array.from(this.efficiencyHistory.values()).reduce((sum, hist) => sum + hist.length, 0)
        };
    }
}

export default BiomechanicsAnalyzer;