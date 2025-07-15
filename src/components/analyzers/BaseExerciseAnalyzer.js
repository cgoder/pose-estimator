/**
 * 基础运动分析器类
 * 所有具体运动分析器的父类，定义通用接口和工具方法
 */
class BaseExerciseAnalyzer {
    constructor() {
        this.name = 'BaseExerciseAnalyzer';
        this.isActive = false;
        this.confidence = 0;
        this.lastAnalysisTime = 0;
    }
    
    /**
     * 检测是否为当前运动类型
     * @param {Array} keypoints - 关键点数组
     * @param {Array} history - 历史帧数据
     * @returns {number} 置信度 (0-1)
     */
    detectExercise(keypoints, history) {
        throw new Error('detectExercise method must be implemented by subclass');
    }
    
    /**
     * 分析运动状态和质量
     * @param {Array} keypoints - 关键点数组
     * @param {Array} history - 历史帧数据
     * @param {Object} context - 上下文信息（时间戳等）
     * @returns {Object} 分析结果
     */
    analyze(keypoints, history, context) {
        throw new Error('analyze method must be implemented by subclass');
    }
    
    /**
     * 重置分析器状态
     */
    reset() {
        this.isActive = false;
        this.confidence = 0;
        this.lastAnalysisTime = 0;
    }
    
    /**
     * 计算两点之间的距离
     * @param {Object} point1 - 第一个点 {x, y}
     * @param {Object} point2 - 第二个点 {x, y}
     * @returns {number} 距离
     */
    calculateDistance(point1, point2) {
        if (!point1 || !point2) return 0;
        const dx = point1.x - point2.x;
        const dy = point1.y - point2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    /**
     * 计算三点形成的角度
     * @param {Object} point1 - 第一个点
     * @param {Object} vertex - 顶点
     * @param {Object} point2 - 第三个点
     * @returns {number} 角度（度）
     */
    calculateAngle(point1, vertex, point2) {
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
    
    /**
     * 检查关键点是否有效
     * @param {Array} keypoints - 关键点数组
     * @param {Array} requiredIndices - 必需的关键点索引
     * @returns {boolean} 是否有效
     */
    validateKeypoints(keypoints, requiredIndices) {
        if (!keypoints || !Array.isArray(keypoints)) return false;
        
        for (const index of requiredIndices) {
            if (!keypoints[index] || 
                typeof keypoints[index].x !== 'number' || 
                typeof keypoints[index].y !== 'number') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * 计算移动平均值
     * @param {Array} values - 数值数组
     * @param {number} windowSize - 窗口大小
     * @returns {number} 移动平均值
     */
    calculateMovingAverage(values, windowSize = 5) {
        if (!values || values.length === 0) return 0;
        
        const window = values.slice(-windowSize);
        const sum = window.reduce((acc, val) => acc + val, 0);
        return sum / window.length;
    }
    
    /**
     * 计算标准差
     * @param {Array} values - 数值数组
     * @returns {number} 标准差
     */
    calculateStandardDeviation(values) {
        if (!values || values.length < 2) return 0;
        
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        return Math.sqrt(variance);
    }
    
    /**
     * 限制数值在指定范围内
     * @param {number} value - 输入值
     * @param {number} min - 最小值
     * @param {number} max - 最大值
     * @returns {number} 限制后的值
     */
    clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
    
    /**
     * 线性插值
     * @param {number} start - 起始值
     * @param {number} end - 结束值
     * @param {number} factor - 插值因子 (0-1)
     * @returns {number} 插值结果
     */
    lerp(start, end, factor) {
        return start + (end - start) * this.clamp(factor, 0, 1);
    }
    
    /**
     * 检查时间间隔是否足够
     * @param {number} currentTime - 当前时间
     * @param {number} lastTime - 上次时间
     * @param {number} minInterval - 最小间隔
     * @returns {boolean} 是否满足间隔要求
     */
    checkTimeInterval(currentTime, lastTime, minInterval) {
        return (currentTime - lastTime) >= minInterval;
    }
}

export default BaseExerciseAnalyzer;