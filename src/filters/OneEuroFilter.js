/**
 * One Euro Filter 实现
 * 一种低延迟的滤波算法，特别适用于实时姿态数据的平滑处理
 * 基于论文: "1€ Filter: A Simple Speed-based Low-pass Filter for Noisy Input in Interactive Systems"
 */

import { Logger } from '../utils/Logger.js';

/**
 * 低通滤波器
 */
class LowPassFilter {
    constructor(alpha = 0.5) {
        this.alpha = alpha;
        this.y = null;
        this.s = null;
        this.initialized = false;
    }
    
    filter(value, alpha = null) {
        if (alpha !== null) {
            this.alpha = alpha;
        }
        
        if (!this.initialized) {
            this.s = value;
            this.y = value;
            this.initialized = true;
        } else {
            this.y = this.alpha * value + (1 - this.alpha) * this.s;
            this.s = this.y;
        }
        
        return this.y;
    }
    
    reset() {
        this.y = null;
        this.s = null;
        this.initialized = false;
    }
    
    hasLastRawValue() {
        return this.initialized;
    }
    
    lastRawValue() {
        return this.y;
    }
}

/**
 * One Euro Filter 主类
 */
export class OneEuroFilter {
    constructor(config = {}) {
        this.config = {
            frequency: 30,      // 采样频率 (Hz)
            minCutoff: 1.0,     // 最小截止频率
            beta: 0.007,        // 速度系数
            derivateCutoff: 1.0, // 导数截止频率
            name: 'OneEuroFilter',
            ...config
        };
        
        // 为 x, y, z 坐标创建滤波器
        this.xFilter = new LowPassFilter();
        this.yFilter = new LowPassFilter();
        this.zFilter = new LowPassFilter();
        
        // 为导数创建滤波器
        this.dxFilter = new LowPassFilter();
        this.dyFilter = new LowPassFilter();
        this.dzFilter = new LowPassFilter();
        
        this.lastTimestamp = null;
        this.logger = new Logger(`OneEuroFilter-${this.config.name}`);
        
        // 性能统计
        this.stats = {
            filterCount: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastLatency: 0
        };
        
        this.logger.debug('One Euro Filter 已创建', this.config);
    }
    
    /**
     * 计算截止频率的 alpha 值
     * @param {number} cutoff - 截止频率
     * @param {number} deltaTime - 时间间隔 (ms)
     * @returns {number} alpha 值
     */
    calculateAlpha(cutoff, deltaTime) {
        const tau = 1.0 / (2 * Math.PI * cutoff);
        const te = deltaTime / 1000; // 转换为秒
        return 1.0 / (1.0 + tau / te);
    }
    
    /**
     * 过滤关键点数据
     * @param {Object} keypoint - 关键点数据 {x, y, z?, score}
     * @param {number} deltaTime - 时间间隔 (ms)
     * @returns {Object} 过滤后的关键点数据
     */
    filter(keypoint, deltaTime = null) {
        const startTime = performance.now();
        
        try {
            // 如果没有提供时间间隔，使用配置的频率计算
            if (deltaTime === null) {
                deltaTime = 1000 / this.config.frequency;
            }
            
            const { x, y, z = 0 } = keypoint;
            
            // 计算速度 (导数)
            let dx = 0, dy = 0, dz = 0;
            
            if (this.xFilter.hasLastRawValue()) {
                const dt = deltaTime / 1000; // 转换为秒
                dx = (x - this.xFilter.lastRawValue()) / dt;
                dy = (y - this.yFilter.lastRawValue()) / dt;
                dz = (z - this.zFilter.lastRawValue()) / dt;
            }
            
            // 过滤导数
            const derivateAlpha = this.calculateAlpha(this.config.derivateCutoff, deltaTime);
            const filteredDx = this.dxFilter.filter(dx, derivateAlpha);
            const filteredDy = this.dyFilter.filter(dy, derivateAlpha);
            const filteredDz = this.dzFilter.filter(dz, derivateAlpha);
            
            // 计算速度的幅度
            const speed = Math.sqrt(filteredDx * filteredDx + filteredDy * filteredDy + filteredDz * filteredDz);
            
            // 计算自适应截止频率
            const cutoff = this.config.minCutoff + this.config.beta * speed;
            
            // 计算 alpha 值
            const alpha = this.calculateAlpha(cutoff, deltaTime);
            
            // 过滤位置数据
            const filteredX = this.xFilter.filter(x, alpha);
            const filteredY = this.yFilter.filter(y, alpha);
            const filteredZ = this.zFilter.filter(z, alpha);
            
            // 更新统计信息
            const latency = performance.now() - startTime;
            this.updateStats(latency);
            
            return {
                ...keypoint,
                x: filteredX,
                y: filteredY,
                z: filteredZ,
                // 添加调试信息（可选）
                _debug: {
                    speed,
                    cutoff,
                    alpha,
                    dx: filteredDx,
                    dy: filteredDy,
                    dz: filteredDz
                }
            };
            
        } catch (error) {
            this.logger.error('滤波处理失败:', error);
            return keypoint; // 返回原始数据
        }
    }
    
    /**
     * 更新统计信息
     * @param {number} latency - 处理延迟
     */
    updateStats(latency) {
        this.stats.filterCount++;
        this.stats.totalLatency += latency;
        this.stats.lastLatency = latency;
        this.stats.averageLatency = this.stats.totalLatency / this.stats.filterCount;
    }
    
    /**
     * 更新滤波器参数
     * @param {Object} newParams - 新参数
     */
    updateParameters(newParams) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newParams };
        
        this.logger.debug('参数已更新', {
            old: oldConfig,
            new: this.config
        });
    }
    
    /**
     * 重置滤波器状态
     */
    reset() {
        this.xFilter.reset();
        this.yFilter.reset();
        this.zFilter.reset();
        this.dxFilter.reset();
        this.dyFilter.reset();
        this.dzFilter.reset();
        
        this.lastTimestamp = null;
        
        // 重置统计信息
        this.stats = {
            filterCount: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastLatency: 0
        };
        
        this.logger.debug('滤波器已重置');
    }
    
    /**
     * 获取滤波器统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            config: { ...this.config },
            isInitialized: this.xFilter.hasLastRawValue()
        };
    }
    
    /**
     * 获取当前延迟
     * @returns {number} 延迟 (ms)
     */
    getLatency() {
        return this.stats.lastLatency;
    }
    
    /**
     * 获取配置信息
     * @returns {Object} 配置
     */
    getConfig() {
        return { ...this.config };
    }
    
    /**
     * 检查滤波器是否已初始化
     * @returns {boolean} 是否已初始化
     */
    isInitialized() {
        return this.xFilter.hasLastRawValue();
    }
    
    /**
     * 获取最后的原始值
     * @returns {Object|null} 最后的原始值
     */
    getLastRawValue() {
        if (!this.isInitialized()) {
            return null;
        }
        
        return {
            x: this.xFilter.lastRawValue(),
            y: this.yFilter.lastRawValue(),
            z: this.zFilter.lastRawValue()
        };
    }
    
    /**
     * 预测下一个值（基于当前速度）
     * @param {number} deltaTime - 预测的时间间隔 (ms)
     * @returns {Object|null} 预测值
     */
    predict(deltaTime) {
        if (!this.isInitialized()) {
            return null;
        }
        
        const lastValue = this.getLastRawValue();
        const dt = deltaTime / 1000; // 转换为秒
        
        return {
            x: lastValue.x + this.dxFilter.lastRawValue() * dt,
            y: lastValue.y + this.dyFilter.lastRawValue() * dt,
            z: lastValue.z + this.dzFilter.lastRawValue() * dt
        };
    }
    
    /**
     * 导出滤波器状态
     * @returns {Object} 滤波器状态
     */
    exportState() {
        return {
            config: this.getConfig(),
            stats: this.getStats(),
            lastValue: this.getLastRawValue(),
            isInitialized: this.isInitialized()
        };
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.reset();
        this.logger.debug('One Euro Filter 资源已清理');
    }
}

export default OneEuroFilter;