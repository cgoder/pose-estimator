import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 步行分析器
 */
class WalkingAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'WalkingAnalyzer';
        this.walkingState = 'idle'; // idle, walking, stopped
        this.gaitPhase = 'stance'; // stance, swing
        this.stepCount = 0;
        this.lastStepTime = 0;
        this.cadence = 0; // 步频 (steps per minute)
        this.strideLength = 0;
        this.verticalOscillation = 0;
        this.groundContactTime = 0;
        this.armSwing = 0;
        this.stability = 1;
        this.supportLeg = 'left'; // 当前支撑腿
        this.hipHeightHistory = [];
        this.stepTimeHistory = [];
        this.cadenceHistory = [];
        this.armSwingHistory = [];
        this.lastStateChange = 0;
        this.minWalkingDuration = 1500; // 最少步行持续时间
    }
    
    detectExercise(keypoints, history) {
        // 检测步行特征：腿部交替运动、较慢节奏、手臂自然摆动
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        
        if (!this.validateKeypoints(keypoints, [5, 6, 7, 8, 11, 12, 13, 14, 15, 16])) {
            return 0;
        }
        
        let confidence = 0;
        
        // 检测腿部交替运动（较慢节奏）
        if (history && history.length > 15) {
            const legMovement = this._detectLegMovement(keypoints, history);
            if (legMovement.isAlternating && legMovement.isSlowPaced) {
                confidence += 0.4;
            }
        }
        
        // 检查身体直立度（步行时身体更直立）
        const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenter = (leftHip.x + rightHip.x) / 2;
        const bodyLean = Math.abs(shoulderCenter - hipCenter);
        
        if (bodyLean < 20) { // 身体相对直立
            confidence += 0.3;
        }
        
        // 检查手臂自然摆动
        if (history && history.length > 8) {
            const armSwing = this._analyzeArmSwing(keypoints, history);
            if (armSwing.isNatural) {
                confidence += 0.2;
            }
        }
        
        // 检查垂直运动（步行时垂直运动较小）
        const verticalMovement = this._calculateVerticalMovement(keypoints, history);
        if (verticalMovement > 3 && verticalMovement < 12) {
            confidence += 0.1;
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
        
        // 分析步态周期
        const gaitResult = this._analyzeGaitCycle(keypoints, timestamp);
        
        // 分析手臂摆动
        const armSwingResult = this._analyzeArmSwing(keypoints, history);
        
        // 计算步行指标
        const metrics = this._calculateWalkingMetrics(keypoints, history, timestamp);
        
        // 记录历史数据
        const hipHeight = (leftHip.y + rightHip.y) / 2;
        this.hipHeightHistory.push(hipHeight);
        if (this.hipHeightHistory.length > 20) {
            this.hipHeightHistory.shift();
        }
        
        // 更新步频历史
        if (this.cadence > 0) {
            this.cadenceHistory.push(this.cadence);
            if (this.cadenceHistory.length > 10) {
                this.cadenceHistory.shift();
            }
        }
        
        // 更新手臂摆动历史
        this.armSwingHistory.push(armSwingResult.swingAmplitude || 0);
        if (this.armSwingHistory.length > 10) {
            this.armSwingHistory.shift();
        }
        
        // 质量评估
        const qualityResult = this._assessWalkingQuality(keypoints, metrics, armSwingResult);
        
        return {
            exerciseType: 'walking',
            state: this.walkingState,
            gaitPhase: this.gaitPhase,
            supportLeg: this.supportLeg,
            stepCount: this.stepCount,
            metrics: {
                cadence: this.cadence,
                strideLength: this.strideLength,
                verticalOscillation: this.verticalOscillation,
                groundContactTime: this.groundContactTime,
                armSwing: this.armSwing,
                stability: this.stability,
                ...metrics
            },
            armSwing: armSwingResult,
            quality: qualityResult,
            ...gaitResult
        };
    }
    
    _detectLegMovement(keypoints, history) {
        if (history.length < 15) {
            return { isAlternating: false, isSlowPaced: false };
        }
        
        const recentFrames = history.slice(-15);
        const leftKneeHeights = [];
        const rightKneeHeights = [];
        
        recentFrames.forEach(frame => {
            if (frame.keypoints && frame.keypoints[13] && frame.keypoints[14]) {
                leftKneeHeights.push(frame.keypoints[13].y);
                rightKneeHeights.push(frame.keypoints[14].y);
            }
        });
        
        if (leftKneeHeights.length < 8) {
            return { isAlternating: false, isSlowPaced: false };
        }
        
        // 检查膝盖高度的交替变化
        const leftVariation = this.calculateStandardDeviation(leftKneeHeights);
        const rightVariation = this.calculateStandardDeviation(rightKneeHeights);
        
        const isAlternating = leftVariation > 8 && rightVariation > 8;
        
        // 步行的变化应该比跑步慢且幅度小
        const isSlowPaced = leftVariation < 20 && rightVariation < 20;
        
        return { isAlternating, isSlowPaced };
    }
    
    _calculateVerticalMovement(keypoints, history) {
        if (!history || history.length < 8) {
            return 0;
        }
        
        const currentHipHeight = (keypoints[11].y + keypoints[12].y) / 2;
        const recentFrames = history.slice(-8);
        const hipHeights = recentFrames.map(frame => {
            if (frame.keypoints && frame.keypoints[11] && frame.keypoints[12]) {
                return (frame.keypoints[11].y + frame.keypoints[12].y) / 2;
            }
            return currentHipHeight;
        });
        
        const maxHeight = Math.max(...hipHeights);
        const minHeight = Math.min(...hipHeights);
        
        return maxHeight - minHeight;
    }
    
    _estimateCadence(timestamp) {
        if (this.stepTimeHistory.length < 2) {
            return 0;
        }
        
        // 计算最近几步的平均时间间隔
        const recentSteps = this.stepTimeHistory.slice(-5);
        let totalInterval = 0;
        let intervalCount = 0;
        
        for (let i = 1; i < recentSteps.length; i++) {
            totalInterval += recentSteps[i] - recentSteps[i - 1];
            intervalCount++;
        }
        
        if (intervalCount === 0) {
            return 0;
        }
        
        const avgStepInterval = totalInterval / intervalCount;
        // 步频 = 60000ms / 平均步间隔ms
        return Math.round(60000 / avgStepInterval);
    }
    
    _analyzeGaitCycle(keypoints, timestamp) {
        const leftKnee = keypoints[13];
        const rightKnee = keypoints[14];
        const leftAnkle = keypoints[15];
        const rightAnkle = keypoints[16];
        
        let stateChange = false;
        let newState = null;
        let stepDetected = false;
        
        // 简化的步态分析：基于膝盖高度判断支撑腿
        const leftKneeHeight = leftKnee.y;
        const rightKneeHeight = rightKnee.y;
        
        // 膝盖位置较低的腿为支撑腿
        const newSupportLeg = leftKneeHeight > rightKneeHeight ? 'left' : 'right';
        
        if (newSupportLeg !== this.supportLeg) {
            // 支撑腿切换，表示一步完成
            this.supportLeg = newSupportLeg;
            this.stepCount++;
            stepDetected = true;
            
            // 记录步时
            this.stepTimeHistory.push(timestamp);
            if (this.stepTimeHistory.length > 10) {
                this.stepTimeHistory.shift();
            }
            
            // 更新步频
            this.cadence = this._estimateCadence(timestamp);
            this.lastStepTime = timestamp;
        }
        
        // 更新步行状态
        if (this.walkingState === 'idle' && this.cadence > 60 && this.cadence < 140) {
            this.walkingState = 'walking';
            stateChange = true;
            newState = 'walking';
            this.lastStateChange = timestamp;
        } else if (this.walkingState === 'walking' && 
                   this.checkTimeInterval(timestamp, this.lastStepTime, 3000)) {
            // 3秒没有新步伐，认为停止步行
            this.walkingState = 'stopped';
            stateChange = true;
            newState = 'stopped';
        }
        
        return {
            stateChange,
            newState,
            stepDetected
        };
    }
    
    _analyzeArmSwing(keypoints, history) {
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftElbow = keypoints[7];
        const rightElbow = keypoints[8];
        
        if (!history || history.length < 8) {
            return { isNatural: false, swingAmplitude: 0 };
        }
        
        // 分析手臂摆动幅度
        const recentFrames = history.slice(-8);
        const leftElbowPositions = [];
        const rightElbowPositions = [];
        
        recentFrames.forEach(frame => {
            if (frame.keypoints && frame.keypoints[7] && frame.keypoints[8]) {
                leftElbowPositions.push({
                    x: frame.keypoints[7].x,
                    y: frame.keypoints[7].y
                });
                rightElbowPositions.push({
                    x: frame.keypoints[8].x,
                    y: frame.keypoints[8].y
                });
            }
        });
        
        if (leftElbowPositions.length < 5) {
            return { isNatural: false, swingAmplitude: 0 };
        }
        
        // 计算手臂摆动幅度
        const leftXVariation = this.calculateStandardDeviation(leftElbowPositions.map(p => p.x));
        const rightXVariation = this.calculateStandardDeviation(rightElbowPositions.map(p => p.x));
        const leftYVariation = this.calculateStandardDeviation(leftElbowPositions.map(p => p.y));
        const rightYVariation = this.calculateStandardDeviation(rightElbowPositions.map(p => p.y));
        
        const avgXVariation = (leftXVariation + rightXVariation) / 2;
        const avgYVariation = (leftYVariation + rightYVariation) / 2;
        
        // 自然的手臂摆动应该有适度的前后摆动
        const isNatural = avgXVariation > 5 && avgXVariation < 25 && avgYVariation > 3 && avgYVariation < 15;
        const swingAmplitude = Math.sqrt(avgXVariation * avgXVariation + avgYVariation * avgYVariation);
        
        this.armSwing = swingAmplitude;
        
        return {
            isNatural,
            swingAmplitude,
            leftSwing: Math.sqrt(leftXVariation * leftXVariation + leftYVariation * leftYVariation),
            rightSwing: Math.sqrt(rightXVariation * rightXVariation + rightYVariation * rightYVariation)
        };
    }
    
    _calculateWalkingMetrics(keypoints, history, timestamp) {
        // 计算垂直振幅
        if (this.hipHeightHistory.length > 8) {
            const recentHeights = this.hipHeightHistory.slice(-8);
            const maxHeight = Math.max(...recentHeights);
            const minHeight = Math.min(...recentHeights);
            this.verticalOscillation = maxHeight - minHeight;
        }
        
        // 估算步幅（基于步频）
        if (this.cadence > 0) {
            // 步行的步幅通常比跑步小
            this.strideLength = Math.max(0, 80 - (this.cadence - 100) * 0.3);
        }
        
        // 估算地面接触时间（步行时接触时间更长）
        if (this.cadence > 0) {
            const stepDuration = 60000 / this.cadence; // 毫秒
            this.groundContactTime = stepDuration * 0.6; // 假设接触时间为步周期的60%
        }
        
        // 计算稳定性（基于身体摆动）
        if (this.hipHeightHistory.length > 5) {
            const stability = 1 - Math.min(1, this.calculateStandardDeviation(this.hipHeightHistory.slice(-5)) / 20);
            this.stability = Math.max(0, stability);
        }
        
        return {
            avgCadence: this.cadenceHistory.length > 0 ? 
                this.cadenceHistory.reduce((a, b) => a + b, 0) / this.cadenceHistory.length : 0,
            cadenceStability: this.cadenceHistory.length > 3 ? 
                this.calculateStandardDeviation(this.cadenceHistory) : 0,
            avgArmSwing: this.armSwingHistory.length > 0 ?
                this.armSwingHistory.reduce((a, b) => a + b, 0) / this.armSwingHistory.length : 0
        };
    }
    
    _assessWalkingQuality(keypoints, metrics, armSwingResult) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查步频
        if (this.cadence > 0) {
            if (this.cadence < 80) {
                issues.push('步频偏低');
                suggestions.push('适当加快步行速度');
                score -= 10;
            } else if (this.cadence > 130) {
                issues.push('步频过高');
                suggestions.push('放慢步行速度，保持自然节奏');
                score -= 10;
            }
        }
        
        // 检查垂直振幅
        if (this.verticalOscillation > 12) {
            issues.push('垂直振幅过大');
            suggestions.push('减少上下起伏，保持平稳步行');
            score -= 10;
        } else if (this.verticalOscillation < 3) {
            issues.push('步态过于僵硬');
            suggestions.push('放松身体，自然步行');
            score -= 5;
        }
        
        // 检查步幅
        if (this.strideLength < 50) {
            issues.push('步幅过小');
            suggestions.push('适当增大步幅');
            score -= 10;
        } else if (this.strideLength > 90) {
            issues.push('步幅过大');
            suggestions.push('减小步幅，保持自然步态');
            score -= 10;
        }
        
        // 检查稳定性
        if (this.stability < 0.7) {
            issues.push('步行不够稳定');
            suggestions.push('保持身体平衡，稳定前进');
            score -= 15;
        }
        
        // 检查手臂摆动
        if (!armSwingResult.isNatural) {
            if (armSwingResult.swingAmplitude < 5) {
                issues.push('手臂摆动不足');
                suggestions.push('自然摆动手臂，配合步行节奏');
                score -= 10;
            } else if (armSwingResult.swingAmplitude > 25) {
                issues.push('手臂摆动过大');
                suggestions.push('减小手臂摆动幅度');
                score -= 10;
            }
        }
        
        // 检查身体姿态
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const hipCenter = (leftHip.x + rightHip.x) / 2;
            const bodyLean = Math.abs(shoulderCenter - hipCenter);
            
            if (bodyLean > 25) {
                issues.push('身体倾斜');
                suggestions.push('保持身体直立，挺胸抬头');
                score -= 15;
            }
        }
        
        // 检查步频稳定性
        if (metrics.cadenceStability > 15) {
            issues.push('步频不稳定');
            suggestions.push('保持稳定的步行节奏');
            score -= 10;
        }
        
        // 检查手臂摆动对称性
        if (armSwingResult.leftSwing && armSwingResult.rightSwing) {
            const swingAsymmetry = Math.abs(armSwingResult.leftSwing - armSwingResult.rightSwing);
            if (swingAsymmetry > 10) {
                issues.push('手臂摆动不对称');
                suggestions.push('保持左右手臂摆动一致');
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
        this.walkingState = 'idle';
        this.gaitPhase = 'stance';
        this.stepCount = 0;
        this.lastStepTime = 0;
        this.cadence = 0;
        this.strideLength = 0;
        this.verticalOscillation = 0;
        this.groundContactTime = 0;
        this.armSwing = 0;
        this.stability = 1;
        this.supportLeg = 'left';
        this.hipHeightHistory = [];
        this.stepTimeHistory = [];
        this.cadenceHistory = [];
        this.armSwingHistory = [];
        this.lastStateChange = 0;
    }
}

export default WalkingAnalyzer;