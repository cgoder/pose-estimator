import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 平板支撑分析器
 */
class PlankAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'PlankAnalyzer';
        this.plankState = 'inactive'; // inactive, active, resting
        this.startTime = null;
        this.totalDuration = 0;
        this.currentDuration = 0;
        this.bodyAngleHistory = [];
        this.stabilityHistory = [];
        this.lastQualityCheck = 0;
        this.qualityCheckInterval = 1000; // 每秒检查一次质量
    }
    
    detectExercise(keypoints, history) {
        // 检测平板支撑特征：水平身体姿态、前臂或手掌支撑、身体直线
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 11, 12, 15, 16])) {
            return 0;
        }
        
        let confidence = 0;
        
        // 检查身体水平度和直线度
        const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
        const hipY = (leftHip.y + rightHip.y) / 2;
        const ankleY = (leftAnkle.y + rightAnkle.y) / 2;
        
        // 身体应该相对水平
        const bodyHorizontal = Math.abs(shoulderY - hipY) < 30 && Math.abs(hipY - ankleY) < 30;
        
        if (bodyHorizontal) {
            confidence += 0.4;
        }
        
        // 检查支撑点位置（肘部或手腕应在肩膀下方）
        let supportDetected = false;
        
        if (leftElbow && rightElbow) {
            const leftElbowBelowShoulder = leftElbow.y > leftShoulder.y - 20;
            const rightElbowBelowShoulder = rightElbow.y > rightShoulder.y - 20;
            
            if (leftElbowBelowShoulder && rightElbowBelowShoulder) {
                supportDetected = true;
            }
        }
        
        if (!supportDetected && leftWrist && rightWrist) {
            const leftWristBelowShoulder = leftWrist.y > leftShoulder.y;
            const rightWristBelowShoulder = rightWrist.y > rightShoulder.y;
            
            if (leftWristBelowShoulder && rightWristBelowShoulder) {
                supportDetected = true;
            }
        }
        
        if (supportDetected) {
            confidence += 0.3;
        }
        
        // 检查腿部伸直
        if (leftKnee && rightKnee) {
            const leftLegStraight = this.calculateAngle(leftHip, leftKnee, leftAnkle) > 160;
            const rightLegStraight = this.calculateAngle(rightHip, rightKnee, rightAnkle) > 160;
            
            if (leftLegStraight && rightLegStraight) {
                confidence += 0.3;
            }
        }
        
        return Math.min(confidence, 1);
    }
    
    analyze(keypoints, history, context = {}) {
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 11, 12, 15, 16])) {
            return { error: '关键点检测不足' };
        }
        
        // 确保 timestamp 存在
        const timestamp = context.timestamp || Date.now();
        
        // 计算身体角度
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
        
        const bodyAngle = this.calculateAngle(shoulderCenter, hipCenter, ankleCenter);
        
        // 分析平板支撑状态
        const stateResult = this._analyzePlankState(bodyAngle, timestamp);
        
        // 记录历史数据
        this.bodyAngleHistory.push(bodyAngle);
        if (this.bodyAngleHistory.length > 30) {
            this.bodyAngleHistory.shift();
        }
        
        // 计算稳定性
        const stability = this._calculateStability(keypoints);
        this.stabilityHistory.push(stability);
        if (this.stabilityHistory.length > 15) {
            this.stabilityHistory.shift();
        }
        
        // 质量评估（每秒一次）
        let qualityResult = null;
        if (this.checkTimeInterval(timestamp, this.lastQualityCheck, this.qualityCheckInterval)) {
            qualityResult = this._assessPlankQuality(keypoints, bodyAngle, stability);
            this.lastQualityCheck = timestamp;
        }
        
        return {
            exerciseType: 'plank',
            state: this.plankState,
            duration: {
                current: this.currentDuration,
                total: this.totalDuration
            },
            bodyAngle: bodyAngle,
            stability: stability,
            quality: qualityResult,
            ...stateResult
        };
    }
    
    _analyzePlankState(bodyAngle, timestamp) {
        let stateChange = false;
        let newState = null;
        
        // 判断是否在正确的平板支撑姿态
        const isValidPlank = bodyAngle > 160 && bodyAngle < 190;
        
        switch (this.plankState) {
            case 'inactive':
                if (isValidPlank) {
                    this.plankState = 'active';
                    this.startTime = timestamp;
                    this.currentDuration = 0;
                    stateChange = true;
                    newState = 'active';
                }
                break;
                
            case 'active':
                if (isValidPlank) {
                    // 更新持续时间
                    this.currentDuration = timestamp - this.startTime;
                } else {
                    // 姿态不正确，进入休息状态
                    this.plankState = 'resting';
                    this.totalDuration += this.currentDuration;
                    stateChange = true;
                    newState = 'resting';
                }
                break;
                
            case 'resting':
                if (isValidPlank) {
                    this.plankState = 'active';
                    this.startTime = timestamp;
                    this.currentDuration = 0;
                    stateChange = true;
                    newState = 'active';
                }
                break;
        }
        
        return {
            stateChange,
            newState
        };
    }
    
    _calculateStability(keypoints) {
        // 计算关键点的稳定性（基于位置变化）
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (this.stabilityHistory.length < 5) {
            return 1; // 初始稳定性设为1
        }
        
        // 计算肩膀和髋部的中心点
        const shoulderCenter = {
            x: (leftShoulder.x + rightShoulder.x) / 2,
            y: (leftShoulder.y + rightShoulder.y) / 2
        };
        const hipCenter = {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };
        
        // 计算与历史位置的偏差
        const recentHistory = this.stabilityHistory.slice(-5);
        const avgStability = recentHistory.reduce((sum, val) => sum + val, 0) / recentHistory.length;
        
        // 简化的稳定性计算（实际应该基于位置变化）
        const currentStability = Math.max(0, 1 - (Math.random() * 0.1)); // 模拟稳定性
        
        return currentStability;
    }
    
    _assessPlankQuality(keypoints, bodyAngle, stability) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查身体直线度
        if (bodyAngle < 160 || bodyAngle > 190) {
            issues.push('身体不够直');
            suggestions.push('保持从头到脚呈一条直线');
            score -= 25;
        }
        
        // 检查稳定性
        if (stability < 0.8) {
            issues.push('身体摇摆过大');
            suggestions.push('收紧核心肌群，保持稳定');
            score -= 20;
        }
        
        // 检查髋部位置
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            const hipY = (leftHip.y + rightHip.y) / 2;
            
            if (hipY < shoulderY - 20) {
                issues.push('髋部过高');
                suggestions.push('降低髋部，与肩膀保持水平');
                score -= 15;
            } else if (hipY > shoulderY + 20) {
                issues.push('髋部过低');
                suggestions.push('抬高髋部，与肩膀保持水平');
                score -= 15;
            }
        }
        
        // 检查头部位置
        const nose = keypoints[0];
        if (nose && leftShoulder && rightShoulder) {
            const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
            
            if (nose.y < shoulderY - 30) {
                issues.push('头部过高');
                suggestions.push('保持头部自然位置，眼睛看向地面');
                score -= 10;
            } else if (nose.y > shoulderY + 30) {
                issues.push('头部过低');
                suggestions.push('抬起头部，保持颈部自然');
                score -= 10;
            }
        }
        
        // 检查动作持续性
        if (this.currentDuration > 0 && this.currentDuration < 10000) {
            // 持续时间少于10秒给予鼓励
            suggestions.push('继续保持，争取更长时间');
        }
        
        return {
            score: Math.max(0, score),
            issues,
            suggestions
        };
    }
    
    reset() {
        super.reset();
        this.plankState = 'inactive';
        this.startTime = null;
        this.totalDuration = 0;
        this.currentDuration = 0;
        this.bodyAngleHistory = [];
        this.stabilityHistory = [];
        this.lastQualityCheck = 0;
    }
}

export default PlankAnalyzer;