import BaseExerciseAnalyzer from './BaseExerciseAnalyzer.js';
import SquatAnalyzer from './SquatAnalyzer.js';
import PushUpAnalyzer from './PushUpAnalyzer.js';
import PlankAnalyzer from './PlankAnalyzer.js';
import JumpingJackAnalyzer from './JumpingJackAnalyzer.js';
import LungeAnalyzer from './LungeAnalyzer.js';
import RunningAnalyzer from './RunningAnalyzer.js';
import WalkingAnalyzer from './WalkingAnalyzer.js';
import AdvancedQualityAssessment from './AdvancedQualityAssessment.js';
import BiomechanicsAnalyzer from './BiomechanicsAnalyzer.js';
import KinematicsAnalyzer from './KinematicsAnalyzer.js';
import PerformanceMonitor from './PerformanceMonitor.js';

/**
 * 运动分析引擎 - 重构版本
 * 负责协调各个运动分析器，提供统一的分析接口
 */
class ExerciseAnalysisEngine {
    constructor() {
        this.analyzers = new Map();
        this.currentAnalyzer = null;
        this.analysisHistory = [];
        this.confidenceThreshold = 0.6;
        this.switchCooldown = 1000; // 切换分析器的冷却时间（毫秒）
        this.lastSwitchTime = 0;
        this.frameHistory = [];
        this.maxHistoryLength = 30;
        
        // 高级分析模块
        this.qualityAssessment = new AdvancedQualityAssessment();
        this.biomechanicsAnalyzer = new BiomechanicsAnalyzer();
        this.kinematicsAnalyzer = new KinematicsAnalyzer();
        this.performanceMonitor = new PerformanceMonitor();
        
        // 分析配置
        this.enableAdvancedAnalysis = true;
        this.enableBiomechanics = true;
        this.enableKinematics = true;
        this.enableQualityAssessment = true;
        this.enablePerformanceMonitoring = true;
        
        // 初始化所有分析器
        this._initializeAnalyzers();
    }
    
    /**
     * 初始化所有运动分析器
     */
    _initializeAnalyzers() {
        const analyzerClasses = {
            'squat': SquatAnalyzer,
            'pushup': PushUpAnalyzer,
            'plank': PlankAnalyzer,
            'jumpingjack': JumpingJackAnalyzer,
            'lunge': LungeAnalyzer,
            'running': RunningAnalyzer,
            'walking': WalkingAnalyzer
        };
        
        for (const [type, AnalyzerClass] of Object.entries(analyzerClasses)) {
            this.analyzers.set(type, new AnalyzerClass());
        }
    }
    
    /**
     * 分析姿态关键点
     * @param {Array} keypoints - 姿态关键点数组
     * @param {Object} context - 分析上下文（时间戳等）
     * @returns {Object} 分析结果
     */
    analyze(keypoints, context = {}) {
        const timestamp = context.timestamp || Date.now();
        
        // 性能监控 - 帧开始
        if (this.enablePerformanceMonitoring) {
            this.performanceMonitor.frameStart();
            this.performanceMonitor.analysisStart();
        }
        
        // 更新帧历史
        this._updateFrameHistory(keypoints, timestamp);
        
        // 如果没有当前分析器，尝试检测运动类型
        if (!this.currentAnalyzer) {
            const detectedType = this._detectExerciseType(keypoints);
            if (detectedType) {
                this._switchAnalyzer(detectedType, timestamp);
            }
        }
        
        // 如果有当前分析器，进行分析
        if (this.currentAnalyzer) {
            const result = this._performAnalysis(keypoints, context);
            
            // 执行高级分析
            if (this.enableAdvancedAnalysis && result) {
                this._performAdvancedAnalysis(result, keypoints, timestamp);
            }
            
            // 检查是否需要切换分析器
            this._checkAnalyzerSwitch(keypoints, timestamp);
            
            // 性能监控 - 分析结束
            if (this.enablePerformanceMonitoring) {
                this.performanceMonitor.analysisEnd();
            }
            
            return result;
        }
        
        // 性能监控 - 分析结束
        if (this.enablePerformanceMonitoring) {
            this.performanceMonitor.analysisEnd();
        }
        
        // 没有检测到运动，返回空闲状态
        return {
            exerciseType: 'idle',
            confidence: 0,
            message: '未检测到运动'
        };
    }
    
    /**
     * 更新帧历史记录
     */
    _updateFrameHistory(keypoints, timestamp) {
        this.frameHistory.push({
            keypoints: keypoints,
            timestamp: timestamp
        });
        
        if (this.frameHistory.length > this.maxHistoryLength) {
            this.frameHistory.shift();
        }
    }
    
    /**
     * 检测运动类型
     */
    _detectExerciseType(keypoints) {
        const detectionResults = [];
        
        // 让所有分析器检测运动
        for (const [type, analyzer] of this.analyzers) {
            const confidence = analyzer.detectExercise(keypoints, this.frameHistory);
            if (confidence > 0) {
                detectionResults.push({ type, confidence });
            }
        }
        
        // 按置信度排序
        detectionResults.sort((a, b) => b.confidence - a.confidence);
        
        // 返回置信度最高且超过阈值的运动类型
        if (detectionResults.length > 0 && detectionResults[0].confidence >= this.confidenceThreshold) {
            return detectionResults[0].type;
        }
        
        return null;
    }
    
    /**
     * 切换分析器
     */
    _switchAnalyzer(newType, timestamp) {
        // 检查冷却时间
        if (timestamp - this.lastSwitchTime < this.switchCooldown) {
            return false;
        }
        
        const newAnalyzer = this.analyzers.get(newType);
        if (!newAnalyzer) {
            console.warn(`未找到分析器: ${newType}`);
            return false;
        }
        
        // 重置新分析器
        newAnalyzer.reset();
        
        // 切换分析器
        this.currentAnalyzer = newAnalyzer;
        this.lastSwitchTime = timestamp;
        
        console.log(`切换到分析器: ${newType}`);
        return true;
    }
    
    /**
     * 执行分析
     */
    _performAnalysis(keypoints, context) {
        try {
            const result = this.currentAnalyzer.analyze(keypoints, this.frameHistory, context);
            
            // 添加引擎级别的信息
            result.engineInfo = {
                analyzerName: this.currentAnalyzer.name,
                frameHistoryLength: this.frameHistory.length,
                timestamp: context.timestamp || Date.now()
            };
            
            // 记录分析历史
            this._recordAnalysisHistory(result);
            
            return result;
        } catch (error) {
            console.error('分析过程中发生错误:', error);
            return {
                error: '分析失败',
                details: error.message
            };
        }
    }
    
    /**
     * 检查是否需要切换分析器
     */
    _checkAnalyzerSwitch(keypoints, timestamp) {
        if (!this.currentAnalyzer) return;
        
        // 检查当前分析器的置信度
        const currentConfidence = this.currentAnalyzer.detectExercise(keypoints, this.frameHistory);
        
        // 如果当前分析器置信度过低，尝试检测其他运动
        if (currentConfidence < this.confidenceThreshold * 0.5) {
            const newType = this._detectExerciseType(keypoints);
            if (newType && newType !== this._getCurrentAnalyzerType()) {
                this._switchAnalyzer(newType, timestamp);
            } else if (currentConfidence < 0.1) {
                // 置信度极低，清除当前分析器
                this.currentAnalyzer = null;
            }
        }
    }
    
    /**
     * 获取当前分析器类型
     */
    _getCurrentAnalyzerType() {
        if (!this.currentAnalyzer) return null;
        
        for (const [type, analyzer] of this.analyzers) {
            if (analyzer === this.currentAnalyzer) {
                return type;
            }
        }
        return null;
    }
    
    /**
     * 执行高级分析
     */
    _performAdvancedAnalysis(result, keypoints, timestamp) {
        try {
            const deltaTime = this.frameHistory.length > 1 ? 
                timestamp - this.frameHistory[this.frameHistory.length - 2].timestamp : 33.33;
            
            // 质量评估
            if (this.enableQualityAssessment) {
                result.qualityAssessment = this.qualityAssessment.assessQuality(
                    keypoints, 
                    this.frameHistory, 
                    result.exerciseType || 'unknown', 
                    result.phase || 'unknown',
                    { timestamp, deltaTime }
                );
            }
            
            // 生物力学分析
            if (this.enableBiomechanics) {
                result.biomechanics = this.biomechanicsAnalyzer.analyze(
                    keypoints, 
                    timestamp, 
                    deltaTime, 
                    result.exerciseType || 'unknown'
                );
            }
            
            // 运动学分析
            if (this.enableKinematics) {
                this.kinematicsAnalyzer.updateKinematics(keypoints, timestamp, deltaTime);
                result.kinematics = {
                    smoothness: this.kinematicsAnalyzer.calculateSmoothness(),
                    motionPattern: this.kinematicsAnalyzer.detectMotionPattern(),
                    stats: this.kinematicsAnalyzer.getStats()
                };
            }
            
            // 计算综合评分
            result.overallScore = this._calculateOverallScore(result);
            
            // 生成建议
            result.recommendations = this._generateRecommendations(result);
            
        } catch (error) {
            console.error('高级分析过程中发生错误:', error);
            result.advancedAnalysisError = error.message;
        }
    }
    
    /**
     * 计算综合评分
     */
    _calculateOverallScore(result) {
        let totalScore = 0;
        let weightSum = 0;
        
        // 基础分析权重
        if (result.quality !== undefined) {
            totalScore += result.quality * 0.3;
            weightSum += 0.3;
        }
        
        // 质量评估权重
        if (result.qualityAssessment && result.qualityAssessment.overallScore !== undefined) {
            totalScore += result.qualityAssessment.overallScore * 0.4;
            weightSum += 0.4;
        }
        
        // 生物力学权重
        if (result.biomechanics && result.biomechanics.overallScore !== undefined) {
            totalScore += result.biomechanics.overallScore * 0.2;
            weightSum += 0.2;
        }
        
        // 运动学权重
        if (result.kinematics && result.kinematics.overallScore !== undefined) {
            totalScore += result.kinematics.overallScore * 0.1;
            weightSum += 0.1;
        }
        
        return weightSum > 0 ? totalScore / weightSum : 0;
    }
    
    /**
     * 生成建议
     */
    _generateRecommendations(result) {
        const recommendations = [];
        
        // 基于质量评估的建议
        if (result.qualityAssessment && result.qualityAssessment.recommendations) {
            recommendations.push(...result.qualityAssessment.recommendations);
        }
        
        // 基于生物力学的建议
        if (result.biomechanics && result.biomechanics.recommendations) {
            recommendations.push(...result.biomechanics.recommendations);
        }
        
        // 基于运动学的建议
        if (result.kinematics && result.kinematics.recommendations) {
            recommendations.push(...result.kinematics.recommendations);
        }
        
        // 去重
        return [...new Set(recommendations)];
    }
    
    /**
     * 记录分析历史
     */
    _recordAnalysisHistory(result) {
        this.analysisHistory.push({
            timestamp: Date.now(),
            result: { ...result }
        });
        
        // 限制历史记录长度
        if (this.analysisHistory.length > 100) {
            this.analysisHistory.shift();
        }
    }
    
    /**
     * 手动设置分析器
     * @param {string} type - 分析器类型
     */
    setAnalyzer(type) {
        const analyzer = this.analyzers.get(type);
        if (analyzer) {
            analyzer.reset();
            this.currentAnalyzer = analyzer;
            this.lastSwitchTime = Date.now();
            return true;
        }
        return false;
    }
    
    /**
     * 获取当前分析器信息
     */
    getCurrentAnalyzerInfo() {
        if (!this.currentAnalyzer) {
            return null;
        }
        
        return {
            type: this._getCurrentAnalyzerType(),
            name: this.currentAnalyzer.name
        };
    }
    
    /**
     * 获取所有可用的分析器类型
     */
    getAvailableAnalyzers() {
        return Array.from(this.analyzers.keys());
    }
    
    /**
     * 获取分析历史
     */
    getAnalysisHistory(limit = 10) {
        return this.analysisHistory.slice(-limit);
    }
    
    /**
     * 重置引擎状态
     */
    reset() {
        this.currentAnalyzer = null;
        this.analysisHistory = [];
        this.frameHistory = [];
        this.lastSwitchTime = 0;
        
        // 重置所有分析器
        for (const analyzer of this.analyzers.values()) {
            analyzer.reset();
        }
        
        // 重置高级分析模块
        if (this.qualityAssessment) {
            this.qualityAssessment.reset();
        }
        if (this.biomechanicsAnalyzer) {
            this.biomechanicsAnalyzer.reset();
        }
        if (this.kinematicsAnalyzer) {
            this.kinematicsAnalyzer.reset();
        }
        if (this.performanceMonitor) {
            this.performanceMonitor.reset();
        }
    }
    
    /**
     * 设置配置参数
     */
    setConfig(config) {
        if (config.confidenceThreshold !== undefined) {
            this.confidenceThreshold = Math.max(0, Math.min(1, config.confidenceThreshold));
        }
        
        if (config.switchCooldown !== undefined) {
            this.switchCooldown = Math.max(0, config.switchCooldown);
        }
        
        if (config.maxHistoryLength !== undefined) {
            this.maxHistoryLength = Math.max(1, config.maxHistoryLength);
        }
        
        // 高级分析配置
        if (config.enableAdvancedAnalysis !== undefined) {
            this.enableAdvancedAnalysis = config.enableAdvancedAnalysis;
        }
        
        if (config.enableBiomechanics !== undefined) {
            this.enableBiomechanics = config.enableBiomechanics;
        }
        
        if (config.enableKinematics !== undefined) {
            this.enableKinematics = config.enableKinematics;
        }
        
        if (config.enableQualityAssessment !== undefined) {
            this.enableQualityAssessment = config.enableQualityAssessment;
        }
        
        if (config.enablePerformanceMonitoring !== undefined) {
            this.enablePerformanceMonitoring = config.enablePerformanceMonitoring;
        }
    }
    
    /**
     * 获取当前配置
     */
    getConfig() {
        return {
            confidenceThreshold: this.confidenceThreshold,
            switchCooldown: this.switchCooldown,
            maxHistoryLength: this.maxHistoryLength,
            enableAdvancedAnalysis: this.enableAdvancedAnalysis,
            enableBiomechanics: this.enableBiomechanics,
            enableKinematics: this.enableKinematics,
            enableQualityAssessment: this.enableQualityAssessment,
            enablePerformanceMonitoring: this.enablePerformanceMonitoring
        };
    }
    
    /**
     * 获取引擎状态信息
     */
    getStatus() {
        return this.getStats();
    }
    
    /**
     * 获取引擎统计信息
     */
    getStats() {
        const analyzerStats = {};
        for (const [type, analyzer] of this.analyzers) {
            analyzerStats[type] = {
                name: analyzer.name,
                isActive: analyzer === this.currentAnalyzer
            };
        }
        
        // 计算质量统计
        const qualityStats = this._calculateQualityStats();
        
        return {
            totalAnalyzers: this.analyzers.size,
            currentAnalyzer: this.getCurrentAnalyzerInfo(),
            frameHistoryLength: this.frameHistory.length,
            analysisHistoryLength: this.analysisHistory.length,
            analyzers: analyzerStats,
            qualityStats: qualityStats,
            advancedAnalysis: {
                qualityAssessment: this.qualityAssessment ? this.qualityAssessment.getStats() : null,
                biomechanics: this.biomechanicsAnalyzer ? this.biomechanicsAnalyzer.getStats() : null,
                kinematics: this.kinematicsAnalyzer ? this.kinematicsAnalyzer.getStats() : null,
                performance: this.performanceMonitor ? this.performanceMonitor.getStats() : null
            }
        };
    }
    
    /**
     * 计算质量统计
     */
    _calculateQualityStats() {
        const recentResults = this.analysisHistory.slice(-50); // 最近50次分析
        
        if (recentResults.length === 0) {
            return null;
        }
        
        let totalScore = 0;
        let scoreCount = 0;
        const qualityGrades = {};
        
        recentResults.forEach(entry => {
            const result = entry.result;
            
            if (result.overallScore !== undefined) {
                totalScore += result.overallScore;
                scoreCount++;
            }
            
            if (result.qualityAssessment && result.qualityAssessment.qualityGrade) {
                const grade = result.qualityAssessment.qualityGrade;
                qualityGrades[grade] = (qualityGrades[grade] || 0) + 1;
            }
        });
        
        return {
            averageScore: scoreCount > 0 ? totalScore / scoreCount : 0,
            totalAnalyses: recentResults.length,
            qualityGrades: qualityGrades
        };
    }
}

export default ExerciseAnalysisEngine;

// 导出分析器类型常量
export const EXERCISE_TYPES = {
    SQUAT: 'squat',
    PUSHUP: 'pushup',
    PLANK: 'plank',
    JUMPING_JACK: 'jumpingjack',
    LUNGE: 'lunge',
    RUNNING: 'running',
    WALKING: 'walking'
};

// 导出所有分析器类
export {
    BaseExerciseAnalyzer,
    SquatAnalyzer,
    PushUpAnalyzer,
    PlankAnalyzer,
    JumpingJackAnalyzer,
    LungeAnalyzer,
    RunningAnalyzer,
    WalkingAnalyzer
};