/**
 * 滤波管理器
 * 实现One Euro Filter和其他滤波算法来平滑姿态数据
 */

import { OneEuroFilter } from '../filters/OneEuroFilter.js';
import { KalmanFilter } from '../filters/KalmanFilter.js';
import { Logger } from '../utils/Logger.js';

export class FilterManager {
    constructor(config = {}) {
        this.config = {
            type: 'oneEuro', // 'oneEuro', 'kalman', 'none'
            frequency: 30,
            minCutoff: 1.0,
            beta: 0.007,
            derivateCutoff: 1.0,
            enabled: true,
            ...config
        };
        
        this.filters = new Map(); // 为每个关键点存储滤波器
        this.logger = new Logger('FilterManager');
        this.frameCount = 0;
        this.lastTimestamp = 0;
        
        // 预设配置
        this.presets = {
            smooth: {
                minCutoff: 0.5,
                beta: 0.005,
                derivateCutoff: 0.5
            },
            responsive: {
                minCutoff: 2.0,
                beta: 0.01,
                derivateCutoff: 2.0
            },
            balanced: {
                minCutoff: 1.0,
                beta: 0.007,
                derivateCutoff: 1.0
            },
            precise: {
                minCutoff: 0.1,
                beta: 0.001,
                derivateCutoff: 0.1
            }
        };
        
        this.logger.info('滤波管理器已创建', this.config);
    }
    
    /**
     * 过滤姿态数据
     * @param {Array} poses - 姿态数组
     * @returns {Array} 过滤后的姿态数组
     */
    filter(poses) {
        if (!this.config.enabled || poses.length === 0) {
            return poses;
        }
        
        const timestamp = performance.now();
        const deltaTime = this.lastTimestamp > 0 ? timestamp - this.lastTimestamp : 1000 / this.config.frequency;
        this.lastTimestamp = timestamp;
        
        try {
            const filteredPoses = poses.map((pose, poseIndex) => {
                const filteredKeypoints = pose.keypoints.map((keypoint, keypointIndex) => {
                    const filterKey = `${poseIndex}_${keypointIndex}`;
                    
                    // 获取或创建滤波器
                    let filter = this.filters.get(filterKey);
                    if (!filter) {
                        filter = this.createFilter(keypoint.name || `keypoint_${keypointIndex}`);
                        this.filters.set(filterKey, filter);
                    }
                    
                    // 应用滤波
                    const filtered = filter.filter(keypoint, deltaTime);
                    
                    return {
                        ...keypoint,
                        x: filtered.x,
                        y: filtered.y,
                        z: filtered.z || keypoint.z
                    };
                });
                
                return {
                    ...pose,
                    keypoints: filteredKeypoints
                };
            });
            
            this.frameCount++;
            return filteredPoses;
            
        } catch (error) {
            this.logger.error('滤波处理失败:', error);
            return poses; // 返回原始数据
        }
    }
    
    /**
     * 创建滤波器
     * @param {string} name - 滤波器名称
     * @returns {Object} 滤波器实例
     */
    createFilter(name) {
        switch (this.config.type) {
            case 'oneEuro':
                return new OneEuroFilter({
                    frequency: this.config.frequency,
                    minCutoff: this.config.minCutoff,
                    beta: this.config.beta,
                    derivateCutoff: this.config.derivateCutoff,
                    name
                });
                
            case 'kalman':
                return new KalmanFilter({
                    processNoise: 0.01,
                    measurementNoise: 0.1,
                    name
                });
                
            default:
                throw new Error(`不支持的滤波器类型: ${this.config.type}`);
        }
    }
    
    /**
     * 更新配置
     * @param {Object} newConfig - 新配置
     */
    updateConfig(newConfig) {
        const oldConfig = { ...this.config };
        this.config = { ...this.config, ...newConfig };
        
        // 如果滤波器类型改变，清除所有滤波器
        if (oldConfig.type !== this.config.type) {
            this.reset();
        } else {
            // 更新现有滤波器的参数
            this.updateFilterParameters();
        }
        
        this.logger.info('滤波器配置已更新', this.config);
    }
    
    /**
     * 更新滤波器参数
     */
    updateFilterParameters() {
        this.filters.forEach(filter => {
            if (filter.updateParameters) {
                filter.updateParameters({
                    frequency: this.config.frequency,
                    minCutoff: this.config.minCutoff,
                    beta: this.config.beta,
                    derivateCutoff: this.config.derivateCutoff
                });
            }
        });
    }
    
    /**
     * 应用预设配置
     * @param {string} presetName - 预设名称
     */
    applyPreset(presetName) {
        if (!this.presets[presetName]) {
            throw new Error(`未知的预设: ${presetName}`);
        }
        
        const preset = this.presets[presetName];
        this.updateConfig(preset);
        
        this.logger.info(`已应用预设: ${presetName}`, preset);
    }
    
    /**
     * 获取可用预设
     * @returns {Array} 预设名称数组
     */
    getAvailablePresets() {
        return Object.keys(this.presets);
    }
    
    /**
     * 添加自定义预设
     * @param {string} name - 预设名称
     * @param {Object} config - 预设配置
     */
    addPreset(name, config) {
        this.presets[name] = { ...config };
        this.logger.info(`已添加预设: ${name}`, config);
    }
    
    /**
     * 启用滤波
     */
    enable() {
        this.config.enabled = true;
        this.logger.info('滤波器已启用');
    }
    
    /**
     * 禁用滤波
     */
    disable() {
        this.config.enabled = false;
        this.logger.info('滤波器已禁用');
    }
    
    /**
     * 切换滤波状态
     */
    toggle() {
        this.config.enabled = !this.config.enabled;
        this.logger.info(`滤波器${this.config.enabled ? '已启用' : '已禁用'}`);
        return this.config.enabled;
    }
    
    /**
     * 重置所有滤波器
     */
    reset() {
        this.filters.forEach(filter => {
            if (filter.reset) {
                filter.reset();
            }
        });
        this.filters.clear();
        this.frameCount = 0;
        this.lastTimestamp = 0;
        
        this.logger.info('所有滤波器已重置');
    }
    
    /**
     * 获取滤波器统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        const filterStats = {};
        
        this.filters.forEach((filter, key) => {
            if (filter.getStats) {
                filterStats[key] = filter.getStats();
            }
        });
        
        return {
            enabled: this.config.enabled,
            type: this.config.type,
            filterCount: this.filters.size,
            frameCount: this.frameCount,
            config: { ...this.config },
            filterStats
        };
    }
    
    /**
     * 获取滤波器性能指标
     * @returns {Object} 性能指标
     */
    getPerformanceMetrics() {
        let totalLatency = 0;
        let totalFilters = 0;
        
        this.filters.forEach(filter => {
            if (filter.getLatency) {
                totalLatency += filter.getLatency();
                totalFilters++;
            }
        });
        
        return {
            averageLatency: totalFilters > 0 ? totalLatency / totalFilters : 0,
            activeFilters: totalFilters,
            memoryUsage: this.getMemoryUsage()
        };
    }
    
    /**
     * 获取内存使用情况
     * @returns {number} 估计的内存使用量（字节）
     */
    getMemoryUsage() {
        // 估算每个滤波器的内存使用量
        const bytesPerFilter = 1024; // 大约1KB每个滤波器
        return this.filters.size * bytesPerFilter;
    }
    
    /**
     * 导出配置
     * @returns {Object} 当前配置
     */
    exportConfig() {
        return {
            config: { ...this.config },
            presets: { ...this.presets },
            stats: this.getStats()
        };
    }
    
    /**
     * 导入配置
     * @param {Object} configData - 配置数据
     */
    importConfig(configData) {
        if (configData.config) {
            this.updateConfig(configData.config);
        }
        
        if (configData.presets) {
            this.presets = { ...this.presets, ...configData.presets };
        }
        
        this.logger.info('配置已导入');
    }
    
    /**
     * 清理资源
     */
    dispose() {
        this.filters.forEach(filter => {
            if (filter.dispose) {
                filter.dispose();
            }
        });
        
        this.filters.clear();
        this.logger.info('滤波管理器资源已清理');
    }
}

export default FilterManager;