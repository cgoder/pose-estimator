/**
 * One Euro Filter 实现
 * 基于原有的 oneEuroFilter.js 重构，提供更好的封装和接口
 */

import { IFilter } from '../interfaces/IDataProcessor.js';

/**
 * 低通滤波器类
 * 实现简单的低通滤波算法
 */
class LowPassFilter {
    constructor(alpha = 0.5) {
        this.alpha = alpha;
        this.y = null; // 上一次的输出值
        this.s = null; // 当前状态
        this.initialized = false;
    }
    
    /**
     * 滤波处理
     * @param {number} value - 输入值
     * @param {number} timestamp - 时间戳（可选）
     * @param {number} alpha - 滤波系数（可选）
     * @returns {number} 滤波后的值
     */
    filter(value, timestamp = null, alpha = null) {
        if (alpha !== null) {
            this.alpha = alpha;
        }
        
        if (!this.initialized) {
            this.s = value;
            this.y = value;
            this.initialized = true;
            return value;
        }
        
        this.y = this.alpha * value + (1 - this.alpha) * this.s;
        this.s = this.y;
        
        return this.y;
    }
    
    /**
     * 获取上一次的输出值
     * @returns {number|null} 上一次的输出值
     */
    lastValue() {
        return this.y;
    }
    
    /**
     * 重置滤波器状态
     */
    reset() {
        this.y = null;
        this.s = null;
        this.initialized = false;
    }
    
    /**
     * 检查滤波器是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }
}

/**
 * One Euro Filter 类
 * 实现 One Euro Filter 算法，用于平滑噪声数据
 */
export class OneEuroFilter extends IFilter {
    /**
     * 构造函数
     * @param {number} frequency - 采样频率 (Hz)
     * @param {number} minCutoff - 最小截止频率
     * @param {number} beta - 速度系数
     * @param {number} derivateCutoff - 导数截止频率
     */
    constructor(frequency = 30, minCutoff = 1.0, beta = 0.007, derivateCutoff = 1.0) {
        super();
        
        // 参数配置
        this.frequency = frequency;
        this.minCutoff = minCutoff;
        this.beta = beta;
        this.derivateCutoff = derivateCutoff;
        
        // 内部状态
        this.x = new LowPassFilter(); // 主滤波器
        this.dx = new LowPassFilter(); // 导数滤波器
        this.lastTime = null;
        this.initialized = false;
        
        // 统计信息
        this.stats = {
            processedSamples: 0,
            averageFrequency: 0,
            lastProcessingTime: 0
        };
        
        console.log(`🔧 OneEuroFilter 已创建 (freq: ${frequency}, minCutoff: ${minCutoff}, beta: ${beta})`);
    }
    
    /**
     * 滤波处理主方法
     * @param {number} value - 输入值
     * @param {number} timestamp - 时间戳（毫秒）
     * @returns {number} 滤波后的值
     */
    filter(value, timestamp = null) {
        const startTime = performance.now();
        
        try {
            // 使用当前时间作为默认时间戳
            if (timestamp === null) {
                timestamp = performance.now();
            }
            
            // 首次调用初始化
            if (!this.initialized) {
                this.lastTime = timestamp;
                this.initialized = true;
                this.stats.processedSamples++;
                return value;
            }
            
            // 计算时间间隔和频率
            const deltaTime = (timestamp - this.lastTime) / 1000.0; // 转换为秒
            this.lastTime = timestamp;
            
            if (deltaTime <= 0) {
                // 时间间隔无效，返回上一次的值
                return this.x.lastValue() || value;
            }
            
            const currentFrequency = 1.0 / deltaTime;
            
            // 更新平均频率统计
            this._updateFrequencyStats(currentFrequency);
            
            // 计算导数（变化率）
            const derivative = this._calculateDerivative(value, deltaTime);
            
            // 计算自适应截止频率
            const cutoff = this._calculateCutoff(derivative);
            
            // 计算滤波系数
            const alpha = this._calculateAlpha(cutoff, currentFrequency);
            
            // 应用滤波
            const filteredValue = this.x.filter(value, timestamp, alpha);
            
            // 更新统计信息
            this.stats.processedSamples++;
            this.stats.lastProcessingTime = performance.now() - startTime;
            
            return filteredValue;
            
        } catch (error) {
            console.error('❌ OneEuroFilter 处理失败:', error);
            return value; // 出错时返回原始值
        }
    }
    
    /**
     * 批量滤波处理
     * @param {Array<number>} values - 输入值数组
     * @param {Array<number>} timestamps - 时间戳数组（可选）
     * @returns {Array<number>} 滤波后的值数组
     */
    filterBatch(values, timestamps = null) {
        if (!Array.isArray(values)) {
            throw new Error('输入必须是数组');
        }
        
        const results = [];
        
        for (let i = 0; i < values.length; i++) {
            const value = values[i];
            const timestamp = timestamps ? timestamps[i] : null;
            results.push(this.filter(value, timestamp));
        }
        
        return results;
    }
    
    /**
     * 重置滤波器状态
     */
    reset() {
        this.x.reset();
        this.dx.reset();
        this.lastTime = null;
        this.initialized = false;
        
        // 重置统计信息
        this.stats.processedSamples = 0;
        this.stats.averageFrequency = 0;
        this.stats.lastProcessingTime = 0;
        
        console.log('🔄 OneEuroFilter 已重置');
    }
    
    /**
     * 更新滤波器参数
     * @param {Object} params - 参数对象
     * @param {number} params.frequency - 采样频率
     * @param {number} params.minCutoff - 最小截止频率
     * @param {number} params.beta - 速度系数
     * @param {number} params.derivateCutoff - 导数截止频率
     */
    updateParameters(params = {}) {
        if (params.frequency !== undefined) {
            this.frequency = params.frequency;
        }
        if (params.minCutoff !== undefined) {
            this.minCutoff = params.minCutoff;
        }
        if (params.beta !== undefined) {
            this.beta = params.beta;
        }
        if (params.derivateCutoff !== undefined) {
            this.derivateCutoff = params.derivateCutoff;
        }
        
        console.log('⚙️ OneEuroFilter 参数已更新:', params);
    }
    
    /**
     * 获取当前参数
     * @returns {Object} 当前参数
     */
    getParameters() {
        return {
            frequency: this.frequency,
            minCutoff: this.minCutoff,
            beta: this.beta,
            derivateCutoff: this.derivateCutoff
        };
    }
    
    /**
     * 获取滤波器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            initialized: this.initialized,
            lastValue: this.x.lastValue(),
            lastTime: this.lastTime,
            parameters: this.getParameters(),
            stats: { ...this.stats }
        };
    }
    
    /**
     * 获取统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return { ...this.stats };
    }
    
    /**
     * 检查滤波器是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        return this.initialized;
    }
    
    /**
     * 释放资源
     */
    dispose() {
        this.reset();
        console.log('🗑️ OneEuroFilter 已释放');
    }
    
    /**
     * 计算导数（变化率）
     * @private
     * @param {number} value - 当前值
     * @param {number} deltaTime - 时间间隔
     * @returns {number} 导数值
     */
    _calculateDerivative(value, deltaTime) {
        if (!this.x.isInitialized()) {
            return 0;
        }
        
        const lastValue = this.x.lastValue();
        const derivative = (value - lastValue) / deltaTime;
        
        // 对导数应用低通滤波
        const derivativeAlpha = this._calculateAlpha(this.derivateCutoff, 1.0 / deltaTime);
        const filteredDerivative = this.dx.filter(derivative, null, derivativeAlpha);
        
        return Math.abs(filteredDerivative);
    }
    
    /**
     * 计算自适应截止频率
     * @private
     * @param {number} derivative - 导数值
     * @returns {number} 截止频率
     */
    _calculateCutoff(derivative) {
        return this.minCutoff + this.beta * derivative;
    }
    
    /**
     * 计算滤波系数 alpha
     * @private
     * @param {number} cutoff - 截止频率
     * @param {number} frequency - 采样频率
     * @returns {number} 滤波系数
     */
    _calculateAlpha(cutoff, frequency) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        const te = 1.0 / frequency;
        return 1.0 / (1.0 + tau / te);
    }
    
    /**
     * 更新频率统计信息
     * @private
     * @param {number} currentFrequency - 当前频率
     */
    _updateFrequencyStats(currentFrequency) {
        if (this.stats.processedSamples === 0) {
            this.stats.averageFrequency = currentFrequency;
        } else {
            // 使用指数移动平均计算平均频率
            const alpha = 0.1;
            this.stats.averageFrequency = alpha * currentFrequency + (1 - alpha) * this.stats.averageFrequency;
        }
    }
}

/**
 * 创建 OneEuroFilter 实例的工厂函数
 * @param {Object} options - 配置选项
 * @returns {OneEuroFilter} OneEuroFilter 实例
 */
export function createOneEuroFilter(options = {}) {
    const {
        frequency = 30,
        minCutoff = 1.0,
        beta = 0.007,
        derivateCutoff = 1.0
    } = options;
    
    return new OneEuroFilter(frequency, minCutoff, beta, derivateCutoff);
}

/**
 * 预设配置
 */
export const ONE_EURO_PRESETS = {
    // 高精度配置（低噪声，高延迟）
    HIGH_PRECISION: {
        frequency: 30,
        minCutoff: 0.5,
        beta: 0.001,
        derivateCutoff: 0.5
    },
    
    // 平衡配置（中等噪声，中等延迟）
    BALANCED: {
        frequency: 30,
        minCutoff: 1.0,
        beta: 0.007,
        derivateCutoff: 1.0
    },
    
    // 高响应配置（高噪声，低延迟）
    HIGH_RESPONSE: {
        frequency: 30,
        minCutoff: 2.0,
        beta: 0.02,
        derivateCutoff: 2.0
    },
    
    // 姿态估计专用配置
    POSE_ESTIMATION: {
        frequency: 30,
        minCutoff: 1.0,
        beta: 0.007,
        derivateCutoff: 1.0
    }
};

// 导出低通滤波器（用于其他模块）
export { LowPassFilter };