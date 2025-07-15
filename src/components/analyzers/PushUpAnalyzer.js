import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 俯卧撑分析器
 */
class PushUpAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'PushUpAnalyzer';
        this.pushUpState = 'up'; // up, down
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.minStateDuration = 200;
        this.elbowAngleHistory = [];
        this.shoulderHeightHistory = [];
    }
    
    detectExercise(keypoints, history) {
        // 检测俯卧撑特征：水平身体姿态、手臂支撑、肘部弯曲
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 9, 10, 11, 12])) {
            return 0;
        }
        
        let confidence = 0;
        
        // 检查身体水平度
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipY = (leftHip.y + rightHip.y) / 2;
        const bodyHorizontal = Math.abs(shoulderY - hipY) < 50;
        
        if (bodyHorizontal) {
            confidence += 0.4;
        }
        
        // 检查手臂支撑姿态
        const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        
        if (leftElbowAngle > 90 && rightElbowAngle > 90) {
            confidence += 0.3;
        }
        
        // 检查手腕位置（应该在肩膀下方）
        const leftWristBelowShoulder = leftWrist.y > leftShoulder.y;
        const rightWristBelowShoulder = rightWrist.y > rightShoulder.y;
        
        if (leftWristBelowShoulder && rightWristBelowShoulder) {
            confidence += 0.3;
        }
        
        return Math.min(confidence, 1);
    }
    
    analyze(keypoints, history, context = {}) {
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 9, 10, 11, 12])) {
            return { error: '关键点检测不足' };
        }
        
        // 确保 timestamp 存在
        const timestamp = context.timestamp || Date.now();
        
        // 计算肘部角度
        const leftElbowAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightElbowAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        const avgElbowAngle = (leftElbowAngle + rightElbowAngle) / 2;
        
        // 分析俯卧撑阶段
        const phaseResult = this._analyzePushUpPhase(avgElbowAngle, timestamp);
        
        // 记录历史数据
        this.elbowAngleHistory.push(avgElbowAngle);
        const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
        this.shoulderHeightHistory.push(shoulderHeight);
        
        if (this.elbowAngleHistory.length > 15) {
            this.elbowAngleHistory.shift();
        }
        if (this.shoulderHeightHistory.length > 15) {
            this.shoulderHeightHistory.shift();
        }
        
        // 质量评估
        const qualityResult = this._assessPushUpQuality(keypoints, avgElbowAngle);
        
        return {
            exerciseType: 'pushup',
            state: this.pushUpState,
            repetitionCount: this.repetitionCount,
            elbowAngle: {
                left: leftElbowAngle,
                right: rightElbowAngle,
                average: avgElbowAngle
            },
            quality: qualityResult,
            ...phaseResult
        };
    }
    
    _analyzePushUpPhase(elbowAngle, timestamp) {
        let stateChange = false;
        let newState = null;
        let repetitionCompleted = false;
        
        // 状态转换逻辑
        switch (this.pushUpState) {
            case 'up':
                if (elbowAngle < 120 && this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.pushUpState = 'down';
                    stateChange = true;
                    newState = 'down';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'down':
                if (elbowAngle > 150 && this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.pushUpState = 'up';
                    stateChange = true;
                    newState = 'up';
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
    
    _assessPushUpQuality(keypoints, elbowAngle) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查肘部角度
        if (this.pushUpState === 'down' && elbowAngle > 110) {
            issues.push('下降深度不够');
            suggestions.push('肘部应弯曲至90度左右');
            score -= 20;
        }
        
        // 检查身体直线度
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip && leftAnkle && rightAnkle) {
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const hipY = (leftHip.y + rightHip.y) / 2;
            const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
            
            // 检查身体是否保持直线
            const shoulderHipDiff = Math.abs(shoulderY - hipY);
            const hipAnkleDiff = Math.abs(hipY - ankleY);
            
            if (shoulderHipDiff > 40 || hipAnkleDiff > 40) {
                issues.push('身体不够直');
                suggestions.push('保持从头到脚呈一条直线');
                score -= 15;
            }
        }
        
        // 检查手腕位置
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        
        if (leftShoulder && rightShoulder && leftWrist && rightWrist) {
            const leftWristShoulderDistance = Math.abs(leftWrist.x - leftShoulder.x);
            const rightWristShoulderDistance = Math.abs(rightWrist.x - rightShoulder.x);
            
            if (leftWristShoulderDistance > 50 || rightWristShoulderDistance > 50) {
                issues.push('手腕位置不当');
                suggestions.push('手腕应在肩膀正下方');
                score -= 10;
            }
        }
        
        // 检查动作稳定性
        if (this.elbowAngleHistory.length > 5) {
            const stability = this.calculateStandardDeviation(this.elbowAngleHistory.slice(-5));
            if (stability > 20) {
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
        this.pushUpState = 'up';
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.elbowAngleHistory = [];
        this.shoulderHeightHistory = [];
    }
}

export default PushUpAnalyzer;