import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 开合跳分析器
 */
class JumpingJackAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'JumpingJackAnalyzer';
        this.jumpingJackState = 'closed'; // closed, open
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.minStateDuration = 150;
        this.armAngleHistory = [];
        this.legDistanceHistory = [];
        this.jumpHeightHistory = [];
    }
    
    detectExercise(keypoints, history) {
        // 检测开合跳特征：手臂上下摆动、腿部开合、跳跃动作
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 9, 10, 11, 12, 15, 16])) {
            return 0;
        }
        
        let confidence = 0;
        
        // 检查手臂摆动范围
        const leftArmAngle = this.calculateAngle(leftShoulder, leftElbow, leftWrist);
        const rightArmAngle = this.calculateAngle(rightShoulder, rightElbow, rightWrist);
        
        // 手臂应该相对伸直
        if (leftArmAngle > 140 && rightArmAngle > 140) {
            confidence += 0.3;
        }
        
        // 检查腿部分开距离
        const legDistance = this.calculateDistance(leftAnkle, rightAnkle);
        
        // 记录历史数据用于检测变化
        if (history && history.length > 5) {
            const recentFrames = history.slice(-5);
            const legDistances = recentFrames.map(frame => {
                if (frame.keypoints && frame.keypoints[15] && frame.keypoints[16]) {
                    return this.calculateDistance(frame.keypoints[15], frame.keypoints[16]);
                }
                return 0;
            });
            
            const maxLegDistance = Math.max(...legDistances);
            const minLegDistance = Math.min(...legDistances);
            const legVariation = maxLegDistance - minLegDistance;
            
            // 腿部应该有明显的开合变化
            if (legVariation > 50) {
                confidence += 0.4;
            }
        }
        
        // 检查手臂高度变化
        const leftWristHeight = leftWrist.y;
        const rightWristHeight = rightWrist.y;
        const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
        
        if (history && history.length > 5) {
            const recentFrames = history.slice(-5);
            const wristHeights = recentFrames.map(frame => {
                if (frame.keypoints && frame.keypoints[9] && frame.keypoints[10]) {
                    return (frame.keypoints[9].y + frame.keypoints[10].y) / 2;
                }
                return shoulderHeight;
            });
            
            const maxWristHeight = Math.max(...wristHeights);
            const minWristHeight = Math.min(...wristHeights);
            const armVariation = maxWristHeight - minWristHeight;
            
            // 手臂应该有明显的上下变化
            if (armVariation > 30) {
                confidence += 0.3;
            }
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
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 9, 10, 11, 12, 15, 16])) {
            return { error: '关键点检测不足' };
        }
        
        // 确保 timestamp 存在
        const timestamp = context.timestamp || Date.now();
        
        // 计算关键指标
        const legDistance = this.calculateDistance(leftAnkle, rightAnkle);
        const armHeight = (leftWrist.y + rightWrist.y) / 2;
        const shoulderHeight = (leftShoulder.y + rightShoulder.y) / 2;
        const armElevation = shoulderHeight - armHeight; // 正值表示手臂抬高
        
        // 分析开合跳阶段
        const phaseResult = this._analyzeJumpingJackPhase(legDistance, armElevation, timestamp);
        
        // 记录历史数据
        this.legDistanceHistory.push(legDistance);
        this.armAngleHistory.push(armElevation);
        
        if (this.legDistanceHistory.length > 15) {
            this.legDistanceHistory.shift();
        }
        if (this.armAngleHistory.length > 15) {
            this.armAngleHistory.shift();
        }
        
        // 计算跳跃高度（基于髋部位置变化）
        const jumpHeight = this._calculateJumpHeight(keypoints, history);
        this.jumpHeightHistory.push(jumpHeight);
        if (this.jumpHeightHistory.length > 10) {
            this.jumpHeightHistory.shift();
        }
        
        // 质量评估
        const qualityResult = this._assessJumpingJackQuality(keypoints, legDistance, armElevation, jumpHeight);
        
        return {
            exerciseType: 'jumpingjack',
            state: this.jumpingJackState,
            repetitionCount: this.repetitionCount,
            metrics: {
                legDistance: legDistance,
                armElevation: armElevation,
                jumpHeight: jumpHeight
            },
            quality: qualityResult,
            ...phaseResult
        };
    }
    
    _analyzeJumpingJackPhase(legDistance, armElevation, timestamp) {
        let stateChange = false;
        let newState = null;
        let repetitionCompleted = false;
        
        // 状态转换逻辑
        switch (this.jumpingJackState) {
            case 'closed':
                // 腿分开且手臂抬高表示进入开放状态
                if (legDistance > 80 && armElevation > 20 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.jumpingJackState = 'open';
                    stateChange = true;
                    newState = 'open';
                    this.lastStateChange = timestamp;
                }
                break;
                
            case 'open':
                // 腿合拢且手臂放下表示回到关闭状态
                if (legDistance < 50 && armElevation < 10 && 
                    this.checkTimeInterval(timestamp, this.lastStateChange, this.minStateDuration)) {
                    this.jumpingJackState = 'closed';
                    stateChange = true;
                    newState = 'closed';
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
    
    _calculateJumpHeight(keypoints, history) {
        if (!history || history.length < 5) {
            return 0;
        }
        
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const currentHipHeight = (leftHip.y + rightHip.y) / 2;
        
        // 获取最近几帧的髋部高度
        const recentFrames = history.slice(-5);
        const hipHeights = recentFrames.map(frame => {
            if (frame.keypoints && frame.keypoints[11] && frame.keypoints[12]) {
                return (frame.keypoints[11].y + frame.keypoints[12].y) / 2;
            }
            return currentHipHeight;
        });
        
        const maxHipHeight = Math.max(...hipHeights);
        const minHipHeight = Math.min(...hipHeights);
        
        // 跳跃高度 = 最低点 - 最高点（y坐标系向下为正）
        return Math.max(0, maxHipHeight - minHipHeight);
    }
    
    _assessJumpingJackQuality(keypoints, legDistance, armElevation, jumpHeight) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查腿部分开幅度
        if (this.jumpingJackState === 'open' && legDistance < 60) {
            issues.push('腿部分开不够');
            suggestions.push('腿部应分开至肩宽以上');
            score -= 20;
        }
        
        // 检查手臂抬高幅度
        if (this.jumpingJackState === 'open' && armElevation < 15) {
            issues.push('手臂抬高不够');
            suggestions.push('手臂应抬高至肩膀水平或以上');
            score -= 20;
        }
        
        // 检查跳跃高度
        if (jumpHeight < 10) {
            issues.push('跳跃高度不够');
            suggestions.push('增加跳跃力度，离地更高');
            score -= 15;
        }
        
        // 检查动作对称性
        const leftWrist = keypoints[9];
        const rightWrist = keypoints[10];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        if (leftWrist && rightWrist) {
            const wristHeightDiff = Math.abs(leftWrist.y - rightWrist.y);
            if (wristHeightDiff > 30) {
                issues.push('手臂高度不对称');
                suggestions.push('保持两臂同步抬高');
                score -= 10;
            }
        }
        
        if (leftAnkle && rightAnkle) {
            const leftShoulder = keypoints[5];
            const rightShoulder = keypoints[6];
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const leftAnkleDistance = Math.abs(leftAnkle.x - shoulderCenter);
            const rightAnkleDistance = Math.abs(rightAnkle.x - shoulderCenter);
            const ankleSymmetry = Math.abs(leftAnkleDistance - rightAnkleDistance);
            
            if (ankleSymmetry > 20) {
                issues.push('腿部分开不对称');
                suggestions.push('保持两腿对称分开');
                score -= 10;
            }
        }
        
        // 检查动作节奏
        if (this.legDistanceHistory.length > 5) {
            const rhythm = this.calculateStandardDeviation(this.legDistanceHistory.slice(-5));
            if (rhythm > 30) {
                issues.push('动作节奏不稳定');
                suggestions.push('保持稳定的动作节奏');
                score -= 10;
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
            
            if (bodyLean > 30) {
                issues.push('身体倾斜过大');
                suggestions.push('保持身体直立，核心收紧');
                score -= 15;
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
        this.jumpingJackState = 'closed';
        this.repetitionCount = 0;
        this.lastStateChange = 0;
        this.armAngleHistory = [];
        this.legDistanceHistory = [];
        this.jumpHeightHistory = [];
    }
}

export default JumpingJackAnalyzer;