import { CONFIG, KEYPOINT_NAMES } from '../../utils/constants.js';
import { OneEuroFilter, createOneEuroFilter, ONE_EURO_PRESETS } from './OneEuroFilter.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * One Euro Filter 管理器
 * 管理所有关键点的滤波器实例和参数
 * 从 src/components/OneEuroFilterManager.js 迁移而来
 */
export class OneEuroFilterManager {
    constructor(filterParams = {}) {
        this.filterParams = {
            frequency: filterParams.frequency || CONFIG.filter.defaultFrequency,
            minCutoff: filterParams.minCutoff || CONFIG.filter.defaultMinCutoff,
            beta: filterParams.beta || CONFIG.filter.defaultBeta,
            dCutoff: filterParams.dCutoff || CONFIG.filter.defaultDCutoff
        };
        
        this.filters = new Map(); // 存储每个关键点的滤波器
        this.isEnabled = true;
        this.isInitialized = false;
        
        // 性能统计
        this.stats = {
            totalFiltered: 0,
            averageProcessingTime: 0,
            lastResetTime: Date.now(),
            errorCount: 0
        };
        
        console.log('🎛️ OneEuroFilter管理器已初始化:', this.filterParams);
    }
    
    /**
     * 获取或创建关键点的滤波器
     * @param {number} keypointIndex - 关键点索引
     * @param {string} axis - 坐标轴 ('x' 或 'y')
     * @returns {OneEuroFilter} 滤波器实例
     */
    _getOrCreateFilter(keypointIndex, axis) {
        const key = `${keypointIndex}_${axis}`;
        
        if (!this.filters.has(key)) {
            const filter = createOneEuroFilter({
                frequency: this.filterParams.frequency,
                minCutoff: this.filterParams.minCutoff,
                beta: this.filterParams.beta,
                derivateCutoff: this.filterParams.dCutoff
            });
            this.filters.set(key, filter);
        }
        
        return this.filters.get(key);
    }
    
    /**
     * 过滤姿态关键点
     * @param {Array} keypoints - 原始关键点数组
     * @param {number} timestamp - 时间戳
     * @returns {Array} 过滤后的关键点数组
     */
    filterPose(keypoints, timestamp = Date.now()) {
        if (!this.isEnabled || !keypoints || keypoints.length === 0) {
            return keypoints;
        }
        
        const startTime = performance.now();
        
        try {
            const filteredKeypoints = keypoints.map((keypoint, index) => {
                if (!keypoint || keypoint.score < CONFIG.ui.skeleton.confidenceThreshold) {
                    return keypoint;
                }
                
                try {
                    // 获取对应的滤波器
                    const xFilter = this._getOrCreateFilter(index, 'x');
                    const yFilter = this._getOrCreateFilter(index, 'y');
                    
                    // 应用滤波
                    const filteredX = xFilter.filter(keypoint.x, timestamp);
                    const filteredY = yFilter.filter(keypoint.y, timestamp);
                    
                    return {
                        ...keypoint,
                        x: filteredX,
                        y: filteredY
                    };
                } catch (error) {
                    console.warn(`⚠️ 关键点${index}滤波失败:`, error);
                    this.stats.errorCount++;
                    return keypoint; // 返回原始关键点
                }
            });
            
            // 更新性能统计
            const processingTime = performance.now() - startTime;
            this._updateStats(processingTime);
            
            return filteredKeypoints;
            
        } catch (error) {
            console.error('❌ 姿态滤波失败:', error);
            this.stats.errorCount++;
            return keypoints; // 返回原始关键点
        }
    }
    
    /**
     * 批量过滤多个姿态
     * @param {Array<Array>} posesKeypoints - 多个姿态的关键点数组
     * @param {number} timestamp - 时间戳
     * @returns {Array<Array>} 过滤后的姿态数组
     */
    filterMultiplePoses(posesKeypoints, timestamp = Date.now()) {
        if (!this.isEnabled || !posesKeypoints || posesKeypoints.length === 0) {
            return posesKeypoints;
        }
        
        return posesKeypoints.map((keypoints, poseIndex) => {
            // 为每个姿态使用独立的滤波器命名空间
            const originalGetOrCreateFilter = this._getOrCreateFilter;
            this._getOrCreateFilter = (keypointIndex, axis) => {
                const key = `pose${poseIndex}_${keypointIndex}_${axis}`;
                
                if (!this.filters.has(key)) {
                    const filter = createOneEuroFilter({
                        frequency: this.filterParams.frequency,
                        minCutoff: this.filterParams.minCutoff,
                        beta: this.filterParams.beta,
                        derivateCutoff: this.filterParams.dCutoff
                    });
                    this.filters.set(key, filter);
                }
                
                return this.filters.get(key);
            };
            
            const filteredKeypoints = this.filterPose(keypoints, timestamp);
            
            // 恢复原始方法
            this._getOrCreateFilter = originalGetOrCreateFilter;
            
            return filteredKeypoints;
        });
    }
    
    /**
     * 更新滤波器参数
     * @param {Object} newParams - 新的滤波器参数
     */
    updateParameters(newParams) {
        const oldParams = { ...this.filterParams };
        
        // 验证参数范围
        if (newParams.frequency !== undefined) {
            this.filterParams.frequency = Math.max(
                CONFIG.filter.ranges.frequency.min,
                Math.min(CONFIG.filter.ranges.frequency.max, newParams.frequency)
            );
        }
        
        if (newParams.minCutoff !== undefined) {
            this.filterParams.minCutoff = Math.max(
                CONFIG.filter.ranges.minCutoff.min,
                Math.min(CONFIG.filter.ranges.minCutoff.max, newParams.minCutoff)
            );
        }
        
        if (newParams.beta !== undefined) {
            this.filterParams.beta = Math.max(
                CONFIG.filter.ranges.beta.min,
                Math.min(CONFIG.filter.ranges.beta.max, newParams.beta)
            );
        }
        
        if (newParams.dCutoff !== undefined) {
            this.filterParams.dCutoff = Math.max(
                CONFIG.filter.ranges.dCutoff.min,
                Math.min(CONFIG.filter.ranges.dCutoff.max, newParams.dCutoff)
            );
        }
        
        // 检查参数是否有变化
        const hasChanged = Object.keys(this.filterParams).some(
            key => this.filterParams[key] !== oldParams[key]
        );
        
        if (hasChanged) {
            console.log('🎛️ 滤波器参数已更新:', {
                old: oldParams,
                new: this.filterParams
            });
            
            // 重置所有滤波器以应用新参数
            this.resetFilters();
            
            // 发布参数更新事件
            eventBus.emit(EVENTS.FILTER_PARAMS_UPDATED, {
                oldParams,
                newParams: this.filterParams
            });
        }
    }
    
    /**
     * 重置所有滤波器
     */
    resetFilters() {
        this.filters.clear();
        this.stats.lastResetTime = Date.now();
        console.log('🔄 所有滤波器已重置');
        
        // 发布重置事件
        eventBus.emit(EVENTS.FILTERS_RESET, {
            timestamp: this.stats.lastResetTime
        });
    }
    
    /**
     * 重置为默认参数
     */
    resetToDefaults() {
        this.filterParams = {
            frequency: CONFIG.FILTER.DEFAULT_FREQUENCY,
            minCutoff: CONFIG.FILTER.DEFAULT_MIN_CUTOFF,
            beta: CONFIG.FILTER.DEFAULT_BETA,
            dCutoff: CONFIG.FILTER.DEFAULT_D_CUTOFF
        };
        
        this.resetFilters();
        console.log('🎛️ 滤波器参数已重置为默认值');
    }
    
    /**
     * 启用/禁用滤波器
     * @param {boolean} enabled - 是否启用
     */
    setEnabled(enabled) {
        const wasEnabled = this.isEnabled;
        this.isEnabled = enabled;
        
        // 如果从启用变为禁用，清理所有滤波器实例
        if (wasEnabled && !enabled) {
            this.resetFilters();
            console.log('🧹 滤波器已禁用，清理所有滤波器实例');
        }
        
        console.log(`🎛️ 滤波器${enabled ? '已启用' : '已禁用'}`);
        
        // 发布启用状态变更事件
        eventBus.emit(EVENTS.FILTER_ENABLED_CHANGED, {
            enabled,
            wasEnabled
        });
    }
    
    /**
     * 获取当前参数
     * @returns {Object} 当前滤波器参数
     */
    getParameters() {
        return { ...this.filterParams };
    }
    
    /**
     * 获取滤波器统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            enabled: this.isEnabled,
            filterCount: this.filters.size,
            parameters: this.getParameters(),
            performance: { ...this.stats },
            keypointNames: KEYPOINT_NAMES
        };
    }
    
    /**
     * 验证参数有效性
     * @param {Object} params - 要验证的参数
     * @returns {Object} 验证结果
     */
    static validateParameters(params) {
        const errors = [];
        const warnings = [];
        
        if (params.frequency !== undefined) {
            if (params.frequency < CONFIG.FILTER.MIN_FREQUENCY || params.frequency > CONFIG.FILTER.MAX_FREQUENCY) {
                errors.push(`频率必须在${CONFIG.FILTER.MIN_FREQUENCY}-${CONFIG.FILTER.MAX_FREQUENCY}Hz之间`);
            }
        }
        
        if (params.minCutoff !== undefined) {
            if (params.minCutoff < CONFIG.FILTER.MIN_CUTOFF_RANGE.min || params.minCutoff > CONFIG.FILTER.MIN_CUTOFF_RANGE.max) {
                errors.push(`最小截止频率必须在${CONFIG.FILTER.MIN_CUTOFF_RANGE.min}-${CONFIG.FILTER.MIN_CUTOFF_RANGE.max}Hz之间`);
            }
        }
        
        if (params.beta !== undefined) {
            if (params.beta < CONFIG.FILTER.BETA_RANGE.min || params.beta > CONFIG.FILTER.BETA_RANGE.max) {
                errors.push(`Beta值必须在${CONFIG.FILTER.BETA_RANGE.min}-${CONFIG.FILTER.BETA_RANGE.max}之间`);
            }
        }
        
        if (params.dCutoff !== undefined) {
            if (params.dCutoff < CONFIG.FILTER.D_CUTOFF_RANGE.min || params.dCutoff > CONFIG.FILTER.D_CUTOFF_RANGE.max) {
                errors.push(`导数截止频率必须在${CONFIG.FILTER.D_CUTOFF_RANGE.min}-${CONFIG.FILTER.D_CUTOFF_RANGE.max}Hz之间`);
            }
        }
        
        // 性能警告
        if (params.frequency && params.frequency > 60) {
            warnings.push('高频率设置可能影响性能');
        }
        
        if (params.beta && params.beta > 2) {
            warnings.push('高Beta值可能导致过度平滑');
        }
        
        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }
    
    /**
     * 初始化滤波器管理器
     * @param {Object} config - 配置选项
     * @returns {Promise<void>}
     */
    async init(config = {}) {
        if (this.isInitialized) {
            console.warn('⚠️ OneEuroFilterManager已经初始化');
            return;
        }
        
        try {
            console.log('🔧 初始化OneEuroFilter管理器...');
            
            // 应用配置参数
            if (config.parameters) {
                const validation = OneEuroFilterManager.validateParameters(config.parameters);
                if (validation.isValid) {
                    this.updateParameters(config.parameters);
                } else {
                    console.warn('⚠️ 配置参数验证失败，使用默认参数:', validation.errors);
                }
            }
            
            // 设置启用状态
            if (config.enabled !== undefined) {
                this.setEnabled(config.enabled);
            }
            
            this.isInitialized = true;
            console.log('✅ OneEuroFilter管理器初始化完成');
            
        } catch (error) {
            console.error('❌ OneEuroFilter管理器初始化失败:', error);
            throw ErrorHandler.createError('OneEuroFilterManager', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 获取推荐参数配置
     * @param {string} scenario - 使用场景
     * @returns {Object} 推荐参数
     */
    static getRecommendedParameters(scenario = 'default') {
        // 使用预设配置
        const preset = ONE_EURO_PRESETS[scenario];
        if (preset) {
            return {
                frequency: preset.frequency,
                minCutoff: preset.minCutoff,
                beta: preset.beta,
                dCutoff: preset.derivateCutoff,
                description: preset.description
            };
        }
        
        // 回退到传统预设
        const presets = {
            'smooth': {
                frequency: 30.0,
                minCutoff: 0.5,
                beta: 0.3,
                dCutoff: 1.0,
                description: '平滑优先，适合展示场景'
            },
            'responsive': {
                frequency: 60.0,
                minCutoff: 2.0,
                beta: 1.0,
                dCutoff: 2.0,
                description: '响应优先，适合交互场景'
            },
            'balanced': {
                frequency: 30.0,
                minCutoff: 1.0,
                beta: 0.5,
                dCutoff: 1.0,
                description: '平衡设置，适合大多数场景'
            },
            'performance': {
                frequency: 20.0,
                minCutoff: 1.5,
                beta: 0.4,
                dCutoff: 1.2,
                description: '性能优先，适合低端设备'
            }
        };
        
        return presets[scenario] || presets['balanced'];
    }
    
    /**
     * 应用预设参数
     * @param {string} presetName - 预设名称
     */
    applyPreset(presetName) {
        const preset = OneEuroFilterManager.getRecommendedParameters(presetName);
        if (preset) {
            this.updateParameters(preset);
            console.log(`🎛️ 已应用预设: ${presetName} - ${preset.description}`);
        } else {
            console.warn(`⚠️ 未知预设: ${presetName}`);
        }
    }
    
    /**
     * 导出配置
     * @returns {Object} 配置对象
     */
    exportConfig() {
        return {
            parameters: this.getParameters(),
            enabled: this.isEnabled,
            timestamp: new Date().toISOString(),
            version: CONFIG.MODEL.CACHE_VERSION,
            stats: this.stats
        };
    }
    
    /**
     * 导入配置
     * @param {Object} config - 配置对象
     */
    importConfig(config) {
        try {
            if (config.parameters) {
                const validation = OneEuroFilterManager.validateParameters(config.parameters);
                if (validation.isValid) {
                    this.updateParameters(config.parameters);
                    if (config.enabled !== undefined) {
                        this.setEnabled(config.enabled);
                    }
                    console.log('🎛️ 配置导入成功');
                } else {
                    console.error('❌ 配置验证失败:', validation.errors);
                    throw new Error('无效的滤波器配置');
                }
            }
        } catch (error) {
            console.error('❌ 配置导入失败:', error);
            throw ErrorHandler.createError('OneEuroFilterManager', `配置导入失败: ${error.message}`, error);
        }
    }
    
    /**
     * 更新性能统计
     * @private
     * @param {number} processingTime - 处理时间
     */
    _updateStats(processingTime) {
        this.stats.totalFiltered++;
        
        // 更新平均处理时间
        const totalTime = this.stats.averageProcessingTime * (this.stats.totalFiltered - 1) + processingTime;
        this.stats.averageProcessingTime = totalTime / this.stats.totalFiltered;
    }
    
    /**
     * 清理资源
     */
    destroy() {
        console.log('🗑️ 销毁OneEuroFilter管理器...');
        
        // 清理所有滤波器
        for (const [key, filter] of this.filters.entries()) {
            try {
                if (filter && typeof filter.destroy === 'function') {
                    filter.destroy();
                }
            } catch (error) {
                console.warn(`⚠️ 滤波器${key}清理失败:`, error);
            }
        }
        
        this.filters.clear();
        
        // 重置状态
        this.isEnabled = false;
        this.stats = {
            totalFiltered: 0,
            averageProcessingTime: 0,
            lastResetTime: Date.now(),
            errorCount: 0
        };
        
        console.log('✅ OneEuroFilter管理器已销毁');
    }
}

// 导出工厂函数
export function createOneEuroFilterManager(options = {}) {
    return new OneEuroFilterManager(options);
}

// 导出预设配置
export { ONE_EURO_PRESETS };