import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 弓步蹲分析器
 */
class LungeAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'LungeAnalyzer';
        this.lungeState = 'standing'; // standing, lunging, returning
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.minStateDuration = 300;
        this.frontLeg = null; // 'left' or 'right'
        this.kneeAngleHistory = [];
        this.balanceHistory = [];
        this.depthHistory = [];
    }
    
    detectExercise(keypoints, history) {
        // 检测弓步蹲特征：腿部前后分开、膝盖弯曲、身体直立
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [11, 12, 13, 14, 15, 16])) {
            return 0;
        }
        
        let confidence = 0;
        
        // 检查腿部前后分开距离
        const legSeparation = Math.abs(leftAnkle.x - rightAnkle.x);
        const legDepthSeparation = Math.abs(leftAnkle.y - rightAnkle.y);
        
        // 弓步蹲时腿部应该前后分开
        if (legSeparation > 40 || legDepthSeparation > 30) {
            confidence += 0.4;
        }
        
        // 检查膝盖弯曲
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        
        // 至少一条腿的膝盖应该弯曲
        if (leftKneeAngle < 150 || rightKneeAngle < 150) {
            confidence += 0.3;
        }
        
        // 检查身体直立度
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        
        if (leftShoulder && rightShoulder) {
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const hipCenter = (leftHip.x + rightHip.x) / 2;
            const bodyAlignment = Math.abs(shoulderCenter - hipCenter);
            
            if (bodyAlignment < 30) {
                confidence += 0.3;
            }
        }
        
        return Math.min(confidence, 1);
    }
    
    analyze(keypoints, history, context = {}) {
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [11, 12, 13, 14, 15, 16])) {
            return { error: '关键点检测不足' };
        }
        
        // 确保 timestamp 存在
        const timestamp = context.timestamp || Date.now();
        
        // 确定前后腿
        const legPositions = this._determineLegPositions(keypoints);
        
        // 计算腿部角度
        const legAngles = this._calculateLegAngles(keypoints);
        
        // 计算平衡性
        const balance = this._calculateBalance(keypoints);
        
        // 计算弓步蹲深度
        const lungeDepth = this._calculateLungeDepth(keypoints);
        
        // 分析弓步蹲阶段
        const phaseResult = this._analyzeLungePhase(legAngles, lungeDepth, timestamp);
        
        // 记录历史数据
        this.kneeAngleHistory.push(legAngles.frontKnee);
        this.balanceHistory.push(balance);
        this.depthHistory.push(lungeDepth);
        
        if (this.kneeAngleHistory.length > 15) {
            this.kneeAngleHistory.shift();
        }
        if (this.balanceHistory.length > 15) {
            this.balanceHistory.shift();
        }
        if (this.depthHistory.length > 15) {
            this.depthHistory.shift();
        }
        
        // 质量评估
        const qualityResult = this._assessLungeQuality(keypoints, legAngles, balance, lungeDepth);
        
        return {
            exerciseType: 'lunge',
            state: this.lungeState,
            repetitionCount: this.repetitionCount,
            frontLeg: this.frontLeg,
            metrics: {
                legAngles: legAngles,
                balance: balance,
                depth: lungeDepth
            },
            quality: qualityResult,
            ...phaseResult
        };
    }
    
    _determineLegPositions(keypoints) {
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        // 基于脚踝的前后位置确定前腿
        if (Math.abs(leftAnkle.y - rightAnkle.y) > 20) {
            this.frontLeg = leftAnkle.y > rightAnkle.y ? 'left' : 'right';
        } else {
            // 如果前后位置不明显，基于左右位置
            this.frontLeg = leftAnkle.x < rightAnkle.x ? 'left' : 'right';
        }
        
        return {
            frontLeg: this.frontLeg,
            backLeg: this.frontLeg === 'left' ? 'right' : 'left'
        };
    }
    
    _calculateLegAngles(keypoints) {
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        
        return {
            left: leftKneeAngle,
            right: rightKneeAngle,
            frontKnee: this.frontLeg === 'left' ? leftKneeAngle : rightKneeAngle,
            backKnee: this.frontLeg === 'left' ? rightKneeAngle : leftKneeAngle
        };
    }
    
    _calculateBalance(keypoints) {
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        // 计算重心位置
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        const hipCenter = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };
        const ankleCenter = {
            x: (leftAnkle.x + rightAnkle.x) / 2,
            y: (leftAnkle.y + rightAnkle.y) / 2
        };
        
        // 计算身体各部分的对齐程度
        const shoulderHipAlignment = Math.abs(shoulderCenter.x - hipCenter.x);
        const hipAnkleAlignment = Math.abs(hipCenter.x - ankleCenter.x);
        
        // 平衡性评分（0-1，1为最佳）
        const alignmentScore = Math.max(0, 1 - (shoulderHipAlignment + hipAnkleAlignment) / 100);
        
        return alignmentScore;
    }
    
    _calculateLungeDepth(keypoints) {
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        // 计算前腿膝盖的下降程度
        const frontKnee = this.frontLeg === 'left' ? leftKnee : rightKnee;
        const frontHip = this.frontLeg === 'left' ? leftHip : rightHip;
        
        // 深度 = 髋部与膝盖的垂直距离
        const depth = Math.abs(frontHip.y - frontKnee.y);
        
        return depth;
    }
    
    _analyzeLungePhase(legAngles, depth, timestamp) {
        let stateChange = false;
        let newState = null;
        let repetitionCompleted = false;
        
        // 状态转换逻辑
        switch (this.lungeState) {
            case 'standing':
                // 前腿膝盖弯曲且有一定深度表示开始弓步蹲
                if (legAngles.frontKnee < 140 && depth > 40 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.lungeState = 'lunging';
                    stateChange = true;
                    newState = 'lunging';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'lunging':
                // 膝盖角度增大且深度减小表示开始返回
                if (legAngles.frontKnee > 160 && depth < 30 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.lungeState = 'returning';
                    stateChange = true;
                    newState = 'returning';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'returning':
                // 回到站立姿态
                if (legAngles.frontKnee > 170 && depth < 20 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.lungeState = 'standing';
                    stateChange = true;
                    newState = 'standing';
                    repetitionCompleted = true;
                    this.repetitionCount++;
                    this.lastStateChange = timestamp;
                }
                break;
        }
        
        return {
            stateChange,
            newState,
            repetitionCompleted
        };
    }
    
    _assessLungeQuality(keypoints, legAngles, balance, depth) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查弓步蹲深度
        if (this.lungeState === 'lunging' && depth < 50) {
            issues.push('弓步蹲深度不够');
            suggestions.push('前腿膝盖弯曲至90度左右');
            score -= 20;
        }
        
        // 检查前腿膝盖角度
        if (this.lungeState === 'lunging' && legAngles.frontKnee > 120) {
            issues.push('前腿弯曲不够');
            suggestions.push('前腿膝盖应弯曲至90度');
            score -= 15;
        }
        
        // 检查后腿膝盖角度
        if (this.lungeState === 'lunging' && legAngles.backKnee > 140) {
            issues.push('后腿伸展不够');
            suggestions.push('后腿应保持伸直或轻微弯曲');
            score -= 10;
        }
        
        // 检查平衡性
        if (balance < 0.7) {
            issues.push('身体平衡性差');
            suggestions.push('保持身体直立，重心稳定');
            score -= 15;
        }
        
        // 检查膝盖位置（前腿膝盖不应超过脚尖）
        const frontKnee = this.frontLeg === 'left' ? keypoints[13] : keypoints[14];
        const frontAnkle = this.frontLeg === 'left' ? keypoints[15] : keypoints[16];
        
        if (frontKnee && frontAnkle) {
            const kneeAnkleDistance = frontKnee.x - frontAnkle.x;
            if (Math.abs(kneeAnkleDistance) > 30) {
                issues.push('膝盖位置不当');
                suggestions.push('膝盖应在脚踝正上方');
                score -= 15;
            }
        }
        
        // 检查身体直立度
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const hipCenter = (leftHip.x + rightHip.x) / 2;
            const bodyLean = Math.abs(shoulderCenter - hipCenter);
            
            if (bodyLean > 40) {
                issues.push('身体倾斜过大');
                suggestions.push('保持上身直立');
                score -= 10;
            }
        }
        
        // 检查动作稳定性
        if (this.kneeAngleHistory.length > 5) {
            const stability = this.calculateStandardDeviation(this.kneeAngleHistory.slice(-5));
            if (stability > 15) {
                issues.push('动作不够稳定');
                suggestions.push('控制动作节奏，保持稳定');
                score -= 10;
            }
        }
        
        return {
            score: Math.max(0, score),
            issues,
            suggestions
        };
    }
    
    reset() {
        super.reset();
        this.lungeState = 'standing';
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.frontLeg = null;
        this.kneeAngleHistory = [];
        this.balanceHistory = [];
        this.depthHistory = [];
    }
}

export default LungeAnalyzer;