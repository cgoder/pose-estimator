/**
 * 高级运动质量评估系统
 * 整合生物力学、运动学和运动模式分析，提供全面的运动质量评估
 */
import BiomechanicsAnalyzer from './BiomechanicsAnalyzer.js';
import KinematicsAnalyzer from './KinematicsAnalyzer.js';

class AdvancedQualityAssessment {
    constructor() {
        this.name = 'AdvancedQualityAssessment';
        this.biomechanicsAnalyzer = new BiomechanicsAnalyzer();
        this.kinematicsAnalyzer = new KinematicsAnalyzer();
        
        // 评估权重配置
        this.weights = {
            biomechanics: 0.3,
            kinematics: 0.25,
            technique: 0.25,
            safety: 0.2
        };
        
        // 运动特定的评估标准
        this.exerciseStandards = {
            squat: {
                optimalDepth: 90, // 膝关节角度
                maxKneeValgus: 10, // 最大膝内扣角度
                maxForwardLean: 15, // 最大前倾角度
                optimalTempo: { down: 2, pause: 1, up: 1.5 }, // 秒
                symmetryTolerance: 5 // 对称性容忍度（度）
            },
            pushup: {
                optimalElbowAngle: 90,
                maxBodySag: 10,
                optimalTempo: { down: 2, pause: 0.5, up: 1.5 },
                symmetryTolerance: 5
            },
            plank: {
                optimalBodyLine: 180, // 身体直线度
                maxHipDrop: 5,
                maxShoulderElevation: 10,
                stabilityThreshold: 0.8
            },
            lunge: {
                optimalKneeAngle: 90,
                maxKneeForward: 20, // 膝盖超过脚尖的距离
                optimalStepLength: 0.6, // 相对于腿长的比例
                symmetryTolerance: 8
            },
            running: {
                optimalCadence: [170, 190], // 步频范围
                maxVerticalOscillation: 0.08, // 相对于腿长
                optimalGroundContactTime: [200, 300], // 毫秒
                maxOverstride: 0.1 // 相对于腿长
            }
        };
        
        // 评估历史
        this.assessmentHistory = [];
        this.trendAnalysis = new Map();
        this.maxHistoryLength = 100;
    }

    /**
     * 执行全面的运动质量评估
     * @param {Array} keypoints - 关键点数组
     * @param {Array} frameHistory - 帧历史
     * @param {string} exerciseType - 运动类型
     * @param {string} phase - 运动阶段
     * @param {Object} context - 上下文信息
     */
    assessQuality(keypoints, frameHistory, exerciseType, phase, context = {}) {
        const timestamp = context.timestamp || Date.now();
        const deltaTime = context.deltaTime || 33.33;
        
        // 执行生物力学分析
        const biomechanicsResult = this.biomechanicsAnalyzer.analyze(
            keypoints, timestamp, deltaTime, exerciseType
        );
        
        // 执行运动学分析
        this.kinematicsAnalyzer.updateKinematics(keypoints, timestamp, deltaTime);
        
        // 技术评估
        const techniqueAssessment = this._assessTechnique(
            keypoints, frameHistory, exerciseType, phase, biomechanicsResult
        );
        
        // 安全性评估
        const safetyAssessment = this._assessSafety(
            keypoints, biomechanicsResult, exerciseType
        );
        
        // 运动学质量评估
        const kinematicsAssessment = this._assessKinematics(
            keypoints, exerciseType, frameHistory
        );
        
        // 综合评分
        const overallScore = this._calculateOverallScore({
            biomechanics: biomechanicsResult,
            technique: techniqueAssessment,
            safety: safetyAssessment,
            kinematics: kinematicsAssessment
        });
        
        // 生成改进建议
        const recommendations = this._generateRecommendations({
            biomechanics: biomechanicsResult,
            technique: techniqueAssessment,
            safety: safetyAssessment,
            kinematics: kinematicsAssessment,
            exerciseType,
            phase
        });
        
        // 趋势分析
        const trendAnalysis = this._analyzeTrends(overallScore, exerciseType);
        
        const assessment = {
            timestamp,
            exerciseType,
            phase,
            overallScore,
            detailedScores: {
                biomechanics: this._scoreBiomechanics(biomechanicsResult),
                technique: techniqueAssessment.score,
                safety: safetyAssessment.score,
                kinematics: kinematicsAssessment.score
            },
            biomechanicsResult,
            techniqueAssessment,
            safetyAssessment,
            kinematicsAssessment,
            recommendations,
            trendAnalysis,
            qualityGrade: this._getQualityGrade(overallScore)
        };
        
        // 记录评估历史
        this._recordAssessment(assessment);
        
        return assessment;
    }

    /**
     * 技术评估
     */
    _assessTechnique(keypoints, frameHistory, exerciseType, phase, biomechanicsResult) {
        const standards = this.exerciseStandards[exerciseType];
        if (!standards) {
            return { score: 50, issues: ['未知运动类型'], details: {} };
        }
        
        const issues = [];
        const details = {};
        let score = 100;
        
        switch (exerciseType) {
            case 'squat':
                score = this._assessSquatTechnique(keypoints, standards, issues, details, biomechanicsResult);
                break;
            case 'pushup':
                score = this._assessPushupTechnique(keypoints, standards, issues, details, biomechanicsResult);
                break;
            case 'plank':
                score = this._assessPlankTechnique(keypoints, standards, issues, details, biomechanicsResult);
                break;
            case 'lunge':
                score = this._assessLungeTechnique(keypoints, standards, issues, details, biomechanicsResult);
                break;
            case 'running':
                score = this._assessRunningTechnique(keypoints, frameHistory, standards, issues, details);
                break;
            default:
                score = this._assessGeneralTechnique(keypoints, biomechanicsResult, issues, details);
        }
        
        return {
            score: Math.max(0, Math.min(100, score)),
            issues,
            details,
            standards
        };
    }

    /**
     * 深蹲技术评估
     */
    _assessSquatTechnique(keypoints, standards, issues, details, biomechanicsResult) {
        let score = 100;
        
        // 检查深度
        const kneeAngle = biomechanicsResult.jointAngles.leftKnee || biomechanicsResult.jointAngles.rightKnee;
        if (kneeAngle) {
            details.depth = kneeAngle;
            if (kneeAngle > standards.optimalDepth + 20) {
                issues.push('深蹲深度不够');
                score -= 25;
            } else if (kneeAngle > standards.optimalDepth + 10) {
                issues.push('深蹲深度略浅');
                score -= 10;
            }
        }
        
        // 检查膝盖对齐
        const kneeAlignment = this._checkKneeAlignment(keypoints);
        details.kneeAlignment = kneeAlignment;
        if (kneeAlignment.valgusAngle > standards.maxKneeValgus) {
            issues.push('膝盖内扣过度');
            score -= 20;
        }
        
        // 检查身体前倾
        const forwardLean = biomechanicsResult.jointAngles.torso;
        if (forwardLean) {
            details.forwardLean = forwardLean;
            if (forwardLean > standards.maxForwardLean) {
                issues.push('身体前倾过度');
                score -= 15;
            }
        }
        
        // 检查对称性
        const symmetry = biomechanicsResult.symmetry;
        if (symmetry && symmetry.overallScore < (100 - standards.symmetryTolerance)) {
            issues.push('左右不对称');
            score -= 10;
        }
        
        // 检查稳定性
        const stability = biomechanicsResult.stability;
        if (stability && !stability.isStable) {
            issues.push('重心不稳定');
            score -= 15;
        }
        
        return score;
    }

    /**
     * 俯卧撑技术评估
     */
    _assessPushupTechnique(keypoints, standards, issues, details, biomechanicsResult) {
        let score = 100;
        
        // 检查肘关节角度
        const elbowAngle = biomechanicsResult.jointAngles.leftElbow || biomechanicsResult.jointAngles.rightElbow;
        if (elbowAngle) {
            details.elbowAngle = elbowAngle;
            if (Math.abs(elbowAngle - standards.optimalElbowAngle) > 20) {
                issues.push('肘关节角度不当');
                score -= 20;
            }
        }
        
        // 检查身体直线度
        const bodyAlignment = this._checkBodyAlignment(keypoints);
        details.bodyAlignment = bodyAlignment;
        if (bodyAlignment.sag > standards.maxBodySag) {
            issues.push('身体下沉过度');
            score -= 25;
        }
        
        // 检查对称性
        const symmetry = biomechanicsResult.symmetry;
        if (symmetry && symmetry.overallScore < (100 - standards.symmetryTolerance)) {
            issues.push('左右不对称');
            score -= 15;
        }
        
        return score;
    }

    /**
     * 平板支撑技术评估
     */
    _assessPlankTechnique(keypoints, standards, issues, details, biomechanicsResult) {
        let score = 100;
        
        // 检查身体直线度
        const bodyLine = this._calculateBodyLine(keypoints);
        details.bodyLine = bodyLine;
        if (Math.abs(bodyLine - standards.optimalBodyLine) > 10) {
            issues.push('身体不够直');
            score -= 30;
        }
        
        // 检查髋部下沉
        const hipDrop = this._calculateHipDrop(keypoints);
        details.hipDrop = hipDrop;
        if (hipDrop > standards.maxHipDrop) {
            issues.push('髋部下沉');
            score -= 25;
        }
        
        // 检查稳定性
        const stability = biomechanicsResult.stability;
        if (stability && stability.overallScore < standards.stabilityThreshold * 100) {
            issues.push('姿态不稳定');
            score -= 20;
        }
        
        return score;
    }

    /**
     * 弓步蹲技术评估
     */
    _assessLungeTechnique(keypoints, standards, issues, details, biomechanicsResult) {
        let score = 100;
        
        // 检查前腿膝关节角度
        const frontKneeAngle = this._getFrontKneeAngle(keypoints);
        if (frontKneeAngle) {
            details.frontKneeAngle = frontKneeAngle;
            if (Math.abs(frontKneeAngle - standards.optimalKneeAngle) > 15) {
                issues.push('前腿膝关节角度不当');
                score -= 20;
            }
        }
        
        // 检查膝盖是否超过脚尖
        const kneeOverToe = this._checkKneeOverToe(keypoints);
        details.kneeOverToe = kneeOverToe;
        if (kneeOverToe > standards.maxKneeForward) {
            issues.push('膝盖超过脚尖过多');
            score -= 25;
        }
        
        // 检查步长
        const stepLength = this._calculateStepLength(keypoints);
        details.stepLength = stepLength;
        if (Math.abs(stepLength - standards.optimalStepLength) > 0.2) {
            issues.push('步长不当');
            score -= 15;
        }
        
        return score;
    }

    /**
     * 跑步技术评估
     */
    _assessRunningTechnique(keypoints, frameHistory, standards, issues, details) {
        let score = 100;
        
        if (frameHistory.length < 10) {
            return score; // 需要足够的历史数据
        }
        
        // 计算步频
        const cadence = this._calculateCadence(frameHistory);
        details.cadence = cadence;
        if (cadence < standards.optimalCadence[0] || cadence > standards.optimalCadence[1]) {
            issues.push('步频不在最优范围');
            score -= 15;
        }
        
        // 计算垂直振幅
        const verticalOscillation = this._calculateVerticalOscillation(frameHistory);
        details.verticalOscillation = verticalOscillation;
        if (verticalOscillation > standards.maxVerticalOscillation) {
            issues.push('垂直振幅过大');
            score -= 20;
        }
        
        // 检查过度跨步
        const overstride = this._checkOverstride(keypoints);
        details.overstride = overstride;
        if (overstride > standards.maxOverstride) {
            issues.push('过度跨步');
            score -= 25;
        }
        
        return score;
    }

    /**
     * 通用技术评估
     */
    _assessGeneralTechnique(keypoints, biomechanicsResult, issues, details) {
        let score = 100;
        
        // 基于对称性评估
        const symmetry = biomechanicsResult.symmetry;
        if (symmetry && symmetry.overallScore < 80) {
            issues.push('动作不对称');
            score -= 20;
        }
        
        // 基于稳定性评估
        const stability = biomechanicsResult.stability;
        if (stability && stability.overallScore < 70) {
            issues.push('动作不稳定');
            score -= 15;
        }
        
        // 基于效率评估
        const efficiency = biomechanicsResult.efficiency;
        if (efficiency && efficiency.overall < 0.6) {
            issues.push('动作效率低');
            score -= 15;
        }
        
        return score;
    }

    /**
     * 安全性评估
     */
    _assessSafety(keypoints, biomechanicsResult, exerciseType) {
        const issues = [];
        let score = 100;
        
        // 检查受伤风险
        const riskAssessment = biomechanicsResult.riskAssessment;
        if (riskAssessment) {
            if (riskAssessment.overallRisk > 0.7) {
                issues.push('高受伤风险');
                score -= 40;
            } else if (riskAssessment.overallRisk > 0.4) {
                issues.push('中等受伤风险');
                score -= 20;
            }
            
            // 添加具体风险
            riskAssessment.specificRisks.forEach(risk => {
                issues.push(risk.description || '未知风险');
            });
        }
        
        // 检查关节角度安全性
        const jointSafety = this._assessJointSafety(biomechanicsResult.jointAngles, exerciseType);
        if (jointSafety.unsafeJoints.length > 0) {
            issues.push(`关节角度不安全: ${jointSafety.unsafeJoints.join(', ')}`);
            score -= jointSafety.unsafeJoints.length * 10;
        }
        
        // 检查负荷分布
        const loadDistribution = this._assessLoadDistribution(biomechanicsResult);
        if (loadDistribution.isUnbalanced) {
            issues.push('负荷分布不均');
            score -= 15;
        }
        
        return {
            score: Math.max(0, score),
            issues,
            riskLevel: this._getSafetyLevel(score),
            details: {
                jointSafety,
                loadDistribution,
                overallRisk: riskAssessment?.overallRisk || 0
            }
        };
    }

    /**
     * 运动学质量评估
     */
    _assessKinematics(keypoints, exerciseType, frameHistory) {
        const issues = [];
        let score = 100;
        const details = {};
        
        // 评估主要关键点的运动学质量
        const importantPoints = this._getImportantPoints(exerciseType);
        
        importantPoints.forEach(pointIndex => {
            // 平滑度评估
            const smoothness = this.kinematicsAnalyzer.calculateSmoothness(pointIndex);
            if (smoothness !== null) {
                details[`smoothness_${pointIndex}`] = smoothness;
                if (smoothness < 0.6) {
                    issues.push(`关键点${pointIndex}运动不够平滑`);
                    score -= 10;
                }
            }
            
            // 运动模式评估
            const motionPattern = this.kinematicsAnalyzer.detectMotionPattern(pointIndex);
            if (motionPattern) {
                details[`pattern_${pointIndex}`] = motionPattern;
                
                // 根据运动类型检查模式
                if (this._shouldBeRhythmic(exerciseType) && !motionPattern.isRhythmic) {
                    issues.push(`关键点${pointIndex}缺乏节奏性`);
                    score -= 8;
                }
                
                if (this._shouldBeLinear(exerciseType) && !motionPattern.isLinear) {
                    issues.push(`关键点${pointIndex}运动轨迹不直`);
                    score -= 8;
                }
            }
        });
        
        // 整体协调性评估
        const coordination = this._assessCoordination(keypoints, frameHistory);
        details.coordination = coordination;
        if (coordination.score < 70) {
            issues.push('整体协调性不佳');
            score -= 15;
        }
        
        return {
            score: Math.max(0, score),
            issues,
            details
        };
    }

    /**
     * 计算综合评分
     */
    _calculateOverallScore(assessments) {
        const biomechanicsScore = this._scoreBiomechanics(assessments.biomechanics);
        const techniqueScore = assessments.technique.score;
        const safetyScore = assessments.safety.score;
        const kinematicsScore = assessments.kinematics.score;
        
        return (
            biomechanicsScore * this.weights.biomechanics +
            techniqueScore * this.weights.technique +
            safetyScore * this.weights.safety +
            kinematicsScore * this.weights.kinematics
        );
    }

    /**
     * 生物力学评分
     */
    _scoreBiomechanics(biomechanicsResult) {
        let score = 100;
        
        // 效率评分
        if (biomechanicsResult.efficiency) {
            score *= biomechanicsResult.efficiency.overall;
        }
        
        // 对称性评分
        if (biomechanicsResult.symmetry) {
            score *= (biomechanicsResult.symmetry.overallScore / 100);
        }
        
        // 稳定性评分
        if (biomechanicsResult.stability) {
            score *= (biomechanicsResult.stability.overallScore / 100);
        }
        
        return Math.max(0, Math.min(100, score));
    }

    /**
     * 生成改进建议
     */
    _generateRecommendations(assessmentData) {
        const recommendations = [];
        const { biomechanics, technique, safety, kinematics, exerciseType, phase } = assessmentData;
        
        // 技术建议
        if (technique.score < 80) {
            recommendations.push({
                category: 'technique',
                priority: 'high',
                issues: technique.issues,
                suggestions: this._getTechniqueRecommendations(exerciseType, technique.issues)
            });
        }
        
        // 安全建议
        if (safety.score < 90) {
            recommendations.push({
                category: 'safety',
                priority: 'critical',
                issues: safety.issues,
                suggestions: this._getSafetyRecommendations(safety.issues)
            });
        }
        
        // 生物力学建议
        const biomechanicsScore = this._scoreBiomechanics(biomechanics);
        if (biomechanicsScore < 75) {
            recommendations.push({
                category: 'biomechanics',
                priority: 'medium',
                suggestions: this._getBiomechanicsRecommendations(biomechanics)
            });
        }
        
        // 运动学建议
        if (kinematics.score < 75) {
            recommendations.push({
                category: 'kinematics',
                priority: 'medium',
                issues: kinematics.issues,
                suggestions: this._getKinematicsRecommendations(kinematics.issues)
            });
        }
        
        return recommendations;
    }

    /**
     * 趋势分析
     */
    _analyzeTrends(currentScore, exerciseType) {
        const key = `${exerciseType}_overall`;
        
        if (!this.trendAnalysis.has(key)) {
            this.trendAnalysis.set(key, []);
        }
        
        const history = this.trendAnalysis.get(key);
        history.push({
            score: currentScore,
            timestamp: Date.now()
        });
        
        // 限制历史长度
        if (history.length > 20) {
            history.shift();
        }
        
        if (history.length < 3) {
            return { trend: 'insufficient_data', change: 0 };
        }
        
        // 计算趋势
        const recent = history.slice(-5);
        const older = history.slice(-10, -5);
        
        const recentAvg = recent.reduce((sum, item) => sum + item.score, 0) / recent.length;
        const olderAvg = older.length > 0 ? older.reduce((sum, item) => sum + item.score, 0) / older.length : recentAvg;
        
        const change = recentAvg - olderAvg;
        
        let trend;
        if (Math.abs(change) < 2) {
            trend = 'stable';
        } else if (change > 0) {
            trend = 'improving';
        } else {
            trend = 'declining';
        }
        
        return {
            trend,
            change,
            recentAverage: recentAvg,
            historicalAverage: olderAvg
        };
    }

    /**
     * 获取质量等级
     */
    _getQualityGrade(score) {
        if (score >= 90) return 'A';
        if (score >= 80) return 'B';
        if (score >= 70) return 'C';
        if (score >= 60) return 'D';
        return 'F';
    }

    /**
     * 记录评估历史
     */
    _recordAssessment(assessment) {
        this.assessmentHistory.push({
            timestamp: assessment.timestamp,
            exerciseType: assessment.exerciseType,
            overallScore: assessment.overallScore,
            qualityGrade: assessment.qualityGrade
        });
        
        // 限制历史长度
        if (this.assessmentHistory.length > this.maxHistoryLength) {
            this.assessmentHistory.shift();
        }
    }

    // 辅助方法（部分实现，完整实现需要更多代码）
    _checkKneeAlignment(keypoints) {
        // 简化实现
        return { valgusAngle: 0, isAligned: true };
    }

    _checkBodyAlignment(keypoints) {
        // 简化实现
        return { sag: 0, isAligned: true };
    }

    _calculateBodyLine(keypoints) {
        // 简化实现
        return 180;
    }

    _calculateHipDrop(keypoints) {
        // 简化实现
        return 0;
    }

    _getImportantPoints(exerciseType) {
        const pointMap = {
            squat: [11, 12, 13, 14, 15, 16], // 髋、膝、踝
            pushup: [5, 6, 7, 8, 9, 10], // 肩、肘、腕
            plank: [5, 6, 11, 12], // 肩、髋
            running: [11, 12, 13, 14, 15, 16], // 下肢
            walking: [11, 12, 13, 14, 15, 16] // 下肢
        };
        return pointMap[exerciseType] || [5, 6, 11, 12, 13, 14];
    }

    _shouldBeRhythmic(exerciseType) {
        return ['running', 'walking', 'jumping'].includes(exerciseType);
    }

    _shouldBeLinear(exerciseType) {
        return ['pushup', 'squat'].includes(exerciseType);
    }

    _assessCoordination(keypoints, frameHistory) {
        // 简化实现
        return { score: 85, details: {} };
    }

    _assessJointSafety(jointAngles, exerciseType) {
        // 简化实现
        return { unsafeJoints: [], safetyScore: 100 };
    }

    _assessLoadDistribution(biomechanicsResult) {
        // 简化实现
        return { isUnbalanced: false, distribution: {} };
    }

    _getSafetyLevel(score) {
        if (score >= 90) return 'safe';
        if (score >= 70) return 'caution';
        return 'unsafe';
    }

    _getTechniqueRecommendations(exerciseType, issues) {
        // 简化实现
        return ['改善动作技术', '注意动作标准'];
    }

    _getSafetyRecommendations(issues) {
        // 简化实现
        return ['降低运动强度', '注意安全'];
    }

    _getBiomechanicsRecommendations(biomechanics) {
        // 简化实现
        return ['改善运动效率', '增强稳定性'];
    }

    _getKinematicsRecommendations(issues) {
        // 简化实现
        return ['提高动作流畅性', '改善协调性'];
    }

    /**
     * 重置评估系统
     */
    reset() {
        this.biomechanicsAnalyzer.reset();
        this.kinematicsAnalyzer.reset();
        this.assessmentHistory = [];
        this.trendAnalysis.clear();
    }

    /**
     * 获取统计信息
     */
    getStats() {
        return {
            assessmentCount: this.assessmentHistory.length,
            biomechanics: this.biomechanicsAnalyzer.getStats(),
            kinematics: this.kinematicsAnalyzer.getStats(),
            trendAnalysisEntries: this.trendAnalysis.size
        };
    }

    /**
     * 获取评估历史
     */
    getAssessmentHistory(limit = 10) {
        return this.assessmentHistory.slice(-limit);
    }

    /**
     * 设置评估权重
     */
    setWeights(newWeights) {
        this.weights = { ...this.weights, ...newWeights };
        
        // 确保权重总和为1
        const total = Object.values(this.weights).reduce((sum, weight) => sum + weight, 0);
        if (total !== 1) {
            Object.keys(this.weights).forEach(key => {
                this.weights[key] /= total;
            });
        }
    }

    /**
     * 设置运动标准
     */
    setExerciseStandards(exerciseType, standards) {
        this.exerciseStandards[exerciseType] = {
            ...this.exerciseStandards[exerciseType],
            ...standards
        };
    }
}

export default AdvancedQualityAssessment;