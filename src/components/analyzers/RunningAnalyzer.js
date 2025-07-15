import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';

/**
 * 跑步分析器
 */
class RunningAnalyzer extends BaseExerciseAnalyzer {
    constructor() {
        super();
        this.name = 'RunningAnalyzer';
        this.runningState = 'idle'; // idle, running, stopped
        this.gaitPhase = 'stance'; // stance, swing
        this.stepCount = 0;
        this.lastStepTime = 0;
        this.cadence = 0; // 步频 (steps per minute)
        this.strideLength = 0;
        this.verticalOscillation = 0;
        this.groundContactTime = 0;
        this.supportLeg = 'left'; // 当前支撑腿
        this.hipHeightHistory = [];
        this.stepTimeHistory = [];
        this.cadenceHistory = [];
        this.lastStateChange = 0;
        this.minRunningDuration = 2000; // 最少跑步持续时间
    }
    
    detectExercise(keypoints, history) {
        // 检测跑步特征：腿部交替运动、身体前倾、手臂摆动
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
        
        // 检测腿部交替运动
        if (history && history.length > 10) {
            const legMovement = this._detectLegMovement(keypoints, history);
            if (legMovement.isAlternating) {
                confidence += 0.4;
            }
        }
        
        // 检查身体前倾
        const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
        const hipCenter = (leftHip.x + rightHip.x) / 2;
        const bodyLean = shoulderCenter - hipCenter;
        
        if (bodyLean > 10) { // 身体略微前倾
            confidence += 0.2;
        }
        
        // 检查手臂摆动
        const leftArmAngle = this.calculateAngle(leftShoulder, leftElbow, leftElbow); // 简化计算
        const rightArmAngle = this.calculateAngle(rightShoulder, rightElbow, rightElbow);
        
        if (history && history.length > 5) {
            // 检查手臂位置变化
            const recentFrames = history.slice(-5);
            const armMovements = recentFrames.map(frame => {
                if (frame.keypoints && frame.keypoints[7] && frame.keypoints[8]) {
                    return {
                        leftElbow: frame.keypoints[7].y,
                        rightElbow: frame.keypoints[8].y
                    };
                }
                return null;
            }).filter(Boolean);
            
            if (armMovements.length > 3) {
                const leftArmVariation = this.calculateStandardDeviation(armMovements.map(a => a.leftElbow));
                const rightArmVariation = this.calculateStandardDeviation(armMovements.map(a => a.rightElbow));
                
                if (leftArmVariation > 10 || rightArmVariation > 10) {
                    confidence += 0.2;
                }
            }
        }
        
        // 检查垂直运动
        const verticalMovement = this._calculateVerticalMovement(keypoints, history);
        if (verticalMovement > 5) {
            confidence += 0.2;
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
        
        // 计算跑步指标
        const metrics = this._calculateRunningMetrics(keypoints, history, timestamp);
        
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
        
        // 质量评估
        const qualityResult = this._assessRunningQuality(keypoints, metrics);
        
        return {
            exerciseType: 'running',
            state: this.runningState,
            gaitPhase: this.gaitPhase,
            supportLeg: this.supportLeg,
            stepCount: this.stepCount,
            metrics: {
                cadence: this.cadence,
                strideLength: this.strideLength,
                verticalOscillation: this.verticalOscillation,
                groundContactTime: this.groundContactTime,
                ...metrics
            },
            quality: qualityResult,
            ...gaitResult
        };
    }
    
    _detectLegMovement(keypoints, history) {
        if (history.length < 10) {
            return { isAlternating: false };
        }
        
        const recentFrames = history.slice(-10);
        const leftKneeHeights = [];
        const rightKneeHeights = [];
        
        recentFrames.forEach(frame => {
            if (frame.keypoints && frame.keypoints[13] && frame.keypoints[14]) {
                leftKneeHeights.push(frame.keypoints[13].y);
                rightKneeHeights.push(frame.keypoints[14].y);
            }
        });
        
        if (leftKneeHeights.length < 5) {
            return { isAlternating: false };
        }
        
        // 检查膝盖高度的交替变化
        const leftVariation = this.calculateStandardDeviation(leftKneeHeights);
        const rightVariation = this.calculateStandardDeviation(rightKneeHeights);
        
        const isAlternating = leftVariation > 15 && rightVariation > 15;
        
        return { isAlternating };
    }
    
    _calculateVerticalMovement(keypoints, history) {
        if (!history || history.length < 5) {
            return 0;
        }
        
        const currentHipHeight = (keypoints[11].y + keypoints[12].y) / 2;
        const recentFrames = history.slice(-5);
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
        
        // 更新跑步状态
        if (this.runningState === 'idle' && this.cadence > 120) {
            this.runningState = 'running';
            stateChange = true;
            newState = 'running';
            this.lastStateChange = timestamp;
        } else if (this.runningState === 'running' && 
                   this.checkTimeInterval(timestamp, this.lastStepTime, 2000)) {
            // 2秒没有新步伐，认为停止跑步
            this.runningState = 'stopped';
            stateChange = true;
            newState = 'stopped';
        }
        
        return {
            stateChange,
            newState,
            stepDetected
        };
    }
    
    _calculateRunningMetrics(keypoints, history, timestamp) {
        // 计算垂直振幅
        if (this.hipHeightHistory.length > 5) {
            const recentHeights = this.hipHeightHistory.slice(-5);
            const maxHeight = Math.max(...recentHeights);
            const minHeight = Math.min(...recentHeights);
            this.verticalOscillation = maxHeight - minHeight;
        }
        
        // 估算步幅（简化计算）
        if (this.cadence > 0) {
            // 基于步频估算步幅（实际应该基于位移）
            this.strideLength = Math.max(0, 100 - (this.cadence - 160) * 0.5);
        }
        
        // 估算地面接触时间（基于步频）
        if (this.cadence > 0) {
            const stepDuration = 60000 / this.cadence; // 毫秒
            this.groundContactTime = stepDuration * 0.4; // 假设接触时间为步周期的40%
        }
        
        return {
            avgCadence: this.cadenceHistory.length > 0 ? 
                this.cadenceHistory.reduce((a, b) => a + b, 0) / this.cadenceHistory.length : 0,
            cadenceStability: this.cadenceHistory.length > 3 ? 
                this.calculateStandardDeviation(this.cadenceHistory) : 0
        };
    }
    
    _assessRunningQuality(keypoints, metrics) {
        const issues = [];
        const suggestions = [];
        let score = 100;
        
        // 检查步频
        if (this.cadence > 0) {
            if (this.cadence < 160) {
                issues.push('步频偏低');
                suggestions.push('增加步频至160-180步/分钟');
                score -= 15;
            } else if (this.cadence > 200) {
                issues.push('步频过高');
                suggestions.push('适当降低步频，增加步幅');
                score -= 10;
            }
        }
        
        // 检查垂直振幅
        if (this.verticalOscillation > 15) {
            issues.push('垂直振幅过大');
            suggestions.push('减少上下跳跃，保持水平前进');
            score -= 15;
        }
        
        // 检查地面接触时间
        if (this.groundContactTime > 300) {
            issues.push('地面接触时间过长');
            suggestions.push('快速抬脚，减少接触时间');
            score -= 10;
        }
        
        // 检查身体姿态
        const leftShoulder = keypoints[5];
        const rightShoulder = keypoints[6];
        const leftHip = keypoints[11];
        const rightHip = keypoints[12];
        
        if (leftShoulder && rightShoulder && leftHip && rightHip) {
            const shoulderCenter = (leftShoulder.x + rightShoulder.x) / 2;
            const hipCenter = (leftHip.x + rightHip.x) / 2;
            const bodyLean = shoulderCenter - hipCenter;
            
            if (bodyLean < -10) {
                issues.push('身体后倾');
                suggestions.push('身体略微前倾，保持前进姿态');
                score -= 15;
            } else if (bodyLean > 30) {
                issues.push('身体过度前倾');
                suggestions.push('减少前倾角度，保持自然姿态');
                score -= 10;
            }
        }
        
        // 检查步态对称性
        if (this.stepTimeHistory.length > 4) {
            const recentSteps = this.stepTimeHistory.slice(-4);
            const intervals = [];
            for (let i = 1; i < recentSteps.length; i++) {
                intervals.push(recentSteps[i] - recentSteps[i - 1]);
            }
            
            const symmetry = this.calculateStandardDeviation(intervals);
            if (symmetry > 100) {
                issues.push('步态不对称');
                suggestions.push('保持左右腿步伐一致');
                score -= 10;
            }
        }
        
        // 检查步频稳定性
        if (metrics.cadenceStability > 20) {
            issues.push('步频不稳定');
            suggestions.push('保持稳定的跑步节奏');
            score -= 10;
        }
        
        return {
            score: Math.max(0, score),
            issues,
            suggestions
        };
    }
    
    reset() {
        super.reset();
        this.runningState = 'idle';
        this.gaitPhase = 'stance';
        this.stepCount = 0;
        this.lastStepTime = 0;
        this.cadence = 0;
        this.strideLength = 0;
        this.verticalOscillation = 0;
        this.groundContactTime = 0;
        this.supportLeg = 'left';
        this.hipHeightHistory = [];
        this.stepTimeHistory = [];
        this.cadenceHistory = [];
        this.lastStateChange = 0;
    }
}

export default RunningAnalyzer;