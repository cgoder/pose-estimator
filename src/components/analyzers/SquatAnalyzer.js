import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 深蹲分析器
 */
class SquatAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'SquatAnalyzer';
        this.squatPhase = 'standing'; // standing, descending, bottom, ascending
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.minStateDuration = 300; // 最小状态持续时间（毫秒）
        this.kneeAngleHistory = [];
        this.hipAngleHistory = [];
        this.depthHistory = [];
    }
    
    detectExercise(keypoints, history) {
        // 检测深蹲特征：膝盖弯曲、髋部下降、脚部稳定
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
        
        // 检查膝盖弯曲
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
        
        if (avgKneeAngle < 160) {
            confidence += 0.4; // 膝盖有弯曲
        }
        
        // 检查脚部稳定性（深蹲时脚部应该相对稳定）
        if (history && history.length > 5) {
            const recentFrames = history.slice(-5);
            let footMovement = 0;
            
            for (let i = 1; i < recentFrames.length; i++) {
                const prevLeft = recentFrames[i-1].keypoints[15];
                const currLeft = recentFrames[i].keypoints[15];
                const prevRight = recentFrames[i-1].keypoints[16];
                const currRight = recentFrames[i].keypoints[16];
                
                if (prevLeft && currLeft && prevRight && currRight) {
                    footMovement += this.calculateDistance(prevLeft, currLeft);
                    footMovement += this.calculateDistance(prevRight, currRight);
                }
            }
            
            if (footMovement < 30) { // 脚部相对稳定
                confidence += 0.3;
            }
        }
        
        // 检查髋部位置（深蹲时髋部应该下降）
        const hipY = (leftHip.y + rightHip.y) / 2;
        const kneeY = (leftKnee.y + rightKnee.y) / 2;
        
        if (hipY > kneeY - 50) { // 髋部接近或低于膝盖
            confidence += 0.3;
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
        
        // 计算关键角度
        const leftKneeAngle = this.calculateAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = this.calculateAngle(rightHip, rightKnee, rightAnkle);
        const avgKneeAngle = (leftKneeAngle + rightKneeAngle) / 2;
        
        // 计算深蹲深度
        const depth = this._calculateSquatDepth(keypoints);
        
        // 分析深蹲阶段
        const phaseResult = this._analyzeSquatPhase(avgKneeAngle, depth, timestamp);
        
        // 记录历史数据
        this.kneeAngleHistory.push(avgKneeAngle);
        this.depthHistory.push(depth.percentage);
        
        if (this.kneeAngleHistory.length > 20) {
            this.kneeAngleHistory.shift();
        }
        if (this.depthHistory.length > 20) {
            this.depthHistory.shift();
        }
        
        // 质量评估
        const qualityResult = this._assessSquatQuality(keypoints, avgKneeAngle, depth);
        
        return {
            exerciseType: 'squat',
            phase: this.squatPhase,
            repetitionCount: this.repetitionCount,
            kneeAngle: {
                left: leftKneeAngle,
                right: rightKneeAngle,
                average: avgKneeAngle
            },
            depth,
            quality: qualityResult,
            ...phaseResult
        };
    }
    
    _calculateSquatDepth(keypoints) {
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        
        const hipY = (leftHip.y + rightHip.y) / 2;
        const kneeY = (leftKnee.y + rightKnee.y) / 2;
        
        // 计算大腿长度作为参考
        const leftThighLength = this.calculateDistance(leftHip, leftKnee);
        const rightThighLength = this.calculateDistance(rightHip, rightKnee);
        const avgThighLength = (leftThighLength + rightThighLength) / 2;
        
        // 深度计算：髋部相对于膝盖的下降程度
        const hipKneeDistance = Math.max(0, kneeY - hipY);
        const depthPercentage = avgThighLength > 0 ? (hipKneeDistance / avgThighLength) * 100 : 0;
        
        return {
            current: hipKneeDistance,
            percentage: Math.min(depthPercentage, 100),
            thighLength: avgThighLength
        };
    }
    
    _analyzeSquatPhase(kneeAngle, depth, timestamp) {
        let stateChange = false;
        let newState = null;
        let repetitionCompleted = false;
        
        // 状态转换逻辑
        switch (this.squatPhase) {
            case 'standing':
                if (kneeAngle < 160 && this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.squatPhase = 'descending';
                    stateChange = true;
                    newState = 'descending';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'descending':
                if (depth.percentage > 60 && kneeAngle < 120 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.squatPhase = 'bottom';
                    stateChange = true;
                    newState = 'bottom';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'bottom':
                if (kneeAngle > 130 && this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.squatPhase = 'ascending';
                    stateChange = true;
                    newState = 'ascending';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'ascending':
                if (kneeAngle > 160 && this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.squatPhase = 'standing';
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
    
    _assessSquatQuality(keypoints, kneeAngle, depth) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查深度
        if (this.squatPhase === 'bottom' && depth.percentage < 60) {
            issues.push('深蹲深度不够');
            suggestions.push('髋部应下降至膝盖水平或更低');
            score -= 20;
        }
        
        // 检查膝盖角度
        if (this.squatPhase === 'bottom' && kneeAngle > 120) {
            issues.push('膝盖弯曲不够');
            suggestions.push('膝盖应弯曲至90度左右');
            score -= 15;
        }
        
        // 检查膝盖对齐
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (leftKnee && rightKnee && leftAnkle && rightAnkle) {
            const leftKneeAnkleDistance = Math.abs(leftKnee.x - leftAnkle.x);
            const rightKneeAnkleDistance = Math.abs(rightKnee.x - rightAnkle.x);
            
            if (leftKneeAnkleDistance > 30 || rightKneeAnkleDistance > 30) {
                issues.push('膝盖内扣或外展');
                suggestions.push('保持膝盖与脚尖方向一致');
                score -= 15;
            }
        }
        
        // 检查身体直立度
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenterX = (leftShoulder.x + rightShoulder.x) / 2;
            const hipCenterX = (leftHip.x + rightHip.x) / 2;
            const bodyLean = Math.abs(shoulderCenterX - hipCenterX);
            
            if (bodyLean > 40) {
                issues.push('身体前倾过度');
                suggestions.push('保持上身挺直，重心在脚跟');
                score -= 10;
            }
        }
        
        // 检查动作稳定性
        if (this.kneeAngleHistory.length > 5) {
            const stability = this.calculateStandardDeviation(this.kneeAngleHistory.slice(-5));
            if (stability > 15) {
                issues.push('动作不够稳定');
                suggestions.push('控制下降和上升速度，保持动作流畅');
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
        this.squatPhase = 'standing';
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.kneeAngleHistory = [];
        this.hipAngleHistory = [];
        this.depthHistory = [];
    }
}

export default SquatAnalyzer;