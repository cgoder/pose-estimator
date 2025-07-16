/**
 * Kalman Filter 实现
 * 用于姿态数据的预测和平滑处理
 * 特别适用于有噪声的传感器数据
 */

import { Logger } from '../utils/Logger.js';

/**
 * 简化的 Kalman Filter 实现
 * 针对 2D/3D 坐标点进行优化
 */
export class KalmanFilter {
    constructor(config = {}) {
        this.config = {
            processNoise: 0.01,      // 过程噪声
            measurementNoise: 0.1,   // 测量噪声
            estimationError: 1.0,    // 初始估计误差
            name: 'KalmanFilter',
            ...config
        };
        
        // 状态变量 [x, y, z, vx, vy, vz] (位置和速度)
        this.state = {
            x: { position: 0, velocity: 0, error: this.config.estimationError },
            y: { position: 0, velocity: 0, error: this.config.estimationError },
            z: { position: 0, velocity: 0, error: this.config.estimationError }
        };
        
        this.initialized = false;
        this.lastTimestamp = null;
        this.logger = new Logger(`KalmanFilter-${this.config.name}`);
        
        // 性能统计
        this.stats = {
            filterCount: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastLatency: 0,
            predictionAccuracy: 0
        };
        
        this.logger.debug('Kalman Filter 已创建', this.config);
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
            const { x, y, z = 0 } = keypoint;
            
            // 如果没有提供时间间隔，估算一个
            if (deltaTime === null) {
                const now = performance.now();
                deltaTime = this.lastTimestamp ? now - this.lastTimestamp : 33.33; // 默认30fps
                this.lastTimestamp = now;
            }
            
            const dt = deltaTime / 1000; // 转换为秒
            
            if (!this.initialized) {
                // 初始化状态
                this.state.x.position = x;
                this.state.y.position = y;
                this.state.z.position = z;
                this.state.x.velocity = 0;
                this.state.y.velocity = 0;
                this.state.z.velocity = 0;
                this.initialized = true;
                
                this.updateStats(performance.now() - startTime);
                return keypoint;
            }
            
            // 对每个坐标轴应用 Kalman 滤波
            const filteredX = this.filterAxis('x', x, dt);
            const filteredY = this.filterAxis('y', y, dt);
            const filteredZ = this.filterAxis('z', z, dt);
            
            // 更新统计信息
            const latency = performance.now() - startTime;
            this.updateStats(latency);
            
            return {
                ...keypoint,
                x: filteredX,
                y: filteredY,
                z: filteredZ,
                // 添加调试信息
                _debug: {
                    velocity: {
                        x: this.state.x.velocity,
                        y: this.state.y.velocity,
                        z: this.state.z.velocity
                    },
                    error: {
                        x: this.state.x.error,
                        y: this.state.y.error,
                        z: this.state.z.error
                    }
                }
            };
            
        } catch (error) {
            this.logger.error('Kalman 滤波处理失败:', error);
            return keypoint; // 返回原始数据
        }
    }
    
    /**
     * 对单个坐标轴应用 Kalman 滤波
     * @param {string} axis - 坐标轴 ('x', 'y', 'z')
     * @param {number} measurement - 测量值
     * @param {number} dt - 时间间隔 (秒)
     * @returns {number} 滤波后的值
     */
    filterAxis(axis, measurement, dt) {
        const state = this.state[axis];
        
        // 预测步骤
        // 状态预测: x(k|k-1) = x(k-1|k-1) + v(k-1|k-1) * dt
        const predictedPosition = state.position + state.velocity * dt;
        const predictedVelocity = state.velocity; // 假设速度恒定
        
        // 误差协方差预测
        const predictedError = state.error + this.config.processNoise;
        
        // 更新步骤
        // Kalman 增益计算
        const kalmanGain = predictedError / (predictedError + this.config.measurementNoise);
        
        // 状态更新
        const updatedPosition = predictedPosition + kalmanGain * (measurement - predictedPosition);
        const updatedVelocity = predictedVelocity + kalmanGain * ((measurement - state.position) / dt - predictedVelocity);
        
        // 误差协方差更新
        const updatedError = (1 - kalmanGain) * predictedError;
        
        // 保存状态
        state.position = updatedPosition;
        state.velocity = updatedVelocity;
        state.error = updatedError;
        
        return updatedPosition;
    }
    
    /**
     * 预测下一个位置
     * @param {number} deltaTime - 预测的时间间隔 (ms)
     * @returns {Object|null} 预测的位置
     */
    predict(deltaTime) {
        if (!this.initialized) {
            return null;
        }
        
        const dt = deltaTime / 1000; // 转换为秒
        
        return {
            x: this.state.x.position + this.state.x.velocity * dt,
            y: this.state.y.position + this.state.y.velocity * dt,
            z: this.state.z.position + this.state.z.velocity * dt
        };
    }
    
    /**
     * 获取当前速度
     * @returns {Object|null} 当前速度
     */
    getVelocity() {
        if (!this.initialized) {
            return null;
        }
        
        return {
            x: this.state.x.velocity,
            y: this.state.y.velocity,
            z: this.state.z.velocity
        };
    }
    
    /**
     * 获取速度的幅度
     * @returns {number} 速度幅度
     */
    getSpeed() {
        const velocity = this.getVelocity();
        if (!velocity) return 0;
        
        return Math.sqrt(
            velocity.x * velocity.x +
            velocity.y * velocity.y +
            velocity.z * velocity.z
        );
    }
    
    /**
     * 更新滤波器参数
     * @param {Object} newParams - 新参数
     */
    updateParameters(newParams) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newParams };
        
        this.logger.debug('Kalman 参数已更新', {
            old: oldConfig,
            new: this.config
        });
    }
    
    /**
     * 重置滤波器状态
     */
    reset() {
        this.state = {
            x: { position: 0, velocity: 0, error: this.config.estimationError },
            y: { position: 0, velocity: 0, error: this.config.estimationError },
            z: { position: 0, velocity: 0, error: this.config.estimationError }
        };
        
        this.initialized = false;
        this.lastTimestamp = null;
        
        // 重置统计信息
        this.stats = {
            filterCount: 0,
            totalLatency: 0,
            averageLatency: 0,
            lastLatency: 0,
            predictionAccuracy: 0
        };
        
        this.logger.debug('Kalman Filter 已重置');
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
     * 获取滤波器统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            ...this.stats,
            config: { ...this.config },
            isInitialized: this.initialized,
            currentState: this.initialized ? {
                position: {
                    x: this.state.x.position,
                    y: this.state.y.position,
                    z: this.state.z.position
                },
                velocity: {
                    x: this.state.x.velocity,
                    y: this.state.y.velocity,
                    z: this.state.z.velocity
                },
                error: {
                    x: this.state.x.error,
                    y: this.state.y.error,
                    z: this.state.z.error
                }
            } : null
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
        return this.initialized;
    }
    
    /**
     * 获取当前位置
     * @returns {Object|null} 当前位置
     */
    getCurrentPosition() {
        if (!this.initialized) {
            return null;
        }
        
        return {
            x: this.state.x.position,
            y: this.state.y.position,
            z: this.state.z.position
        };
    }
    
    /**
     * 获取估计误差
     * @returns {Object|null} 估计误差
     */
    getEstimationError() {
        if (!this.initialized) {
            return null;
        }
        
        return {
            x: this.state.x.error,
            y: this.state.y.error,
            z: this.state.z.error
        };
    }
    
    /**
     * 计算预测准确性
     * @param {Object} actualValue - 实际值
     * @param {Object} predictedValue - 预测值
     * @returns {number} 准确性分数 (0-1)
     */
    calculatePredictionAccuracy(actualValue, predictedValue) {
        const dx = actualValue.x - predictedValue.x;
        const dy = actualValue.y - predictedValue.y;
        const dz = (actualValue.z || 0) - (predictedValue.z || 0);
        
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 将距离转换为准确性分数 (距离越小，准确性越高)
        const accuracy = Math.exp(-distance);
        
        // 更新平均准确性
        const alpha = 0.1;
        this.stats.predictionAccuracy = this.stats.predictionAccuracy * (1 - alpha) + accuracy * alpha;
        
        return accuracy;
    }
    
    /**
     * 导出滤波器状态
     * @returns {Object} 滤波器状态
     */
    exportState() {
        return {
            config: this.getConfig(),
            stats: this.getStats(),
            state: this.initialized ? { ...this.state } : null,
            isInitialized: this.initialized
        };
    }
    
    /**
     * 导入滤波器状态
     * @param {Object} stateData - 状态数据
     */
    importState(stateData) {
        if (stateData.config) {
            this.updateParameters(stateData.config);
        }
        
        if (stateData.state && stateData.isInitialized) {
            this.state = { ...stateData.state };
            this.initialized = stateData.isInitialized;
        }
        
        this.logger.debug('Kalman Filter 状态已导入');
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.reset();
        this.logger.debug('Kalman Filter 资源已清理');
    }
}

export default KalmanFilter;