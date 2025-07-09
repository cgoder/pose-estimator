import { CONFIG, KEYPOINT_NAMES } from '../utils/constants.js';

/**
 * One Euro Filter 管理器
 * 管理所有关键点的滤波器实例和参数
 */
export class OneEuroFilterManager {
    constructor(filterParams = {}) {
        this.filterParams = {
            frequency: filterParams.frequency || CONFIG.FILTER.DEFAULT_FREQUENCY,
            minCutoff: filterParams.minCutoff || CONFIG.FILTER.DEFAULT_MIN_CUTOFF,
            beta: filterParams.beta || CONFIG.FILTER.DEFAULT_BETA,
            dCutoff: filterParams.dCutoff || CONFIG.FILTER.DEFAULT_D_CUTOFF
        };
        
        this.filters = new Map(); // 存储每个关键点的滤波器
        this.isEnabled = true;
        
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
            const filter = new OneEuroFilter(
                this.filterParams.frequency,
                this.filterParams.minCutoff,
                this.filterParams.beta,
                this.filterParams.dCutoff
            );
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
        
        const filteredKeypoints = keypoints.map((keypoint, index) => {
            if (!keypoint || keypoint.score < CONFIG.UI.CONFIDENCE_THRESHOLD) {
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
                return keypoint; // 返回原始关键点
            }
        });
        
        return filteredKeypoints;
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
                CONFIG.FILTER.MIN_FREQUENCY,
                Math.min(CONFIG.FILTER.MAX_FREQUENCY, newParams.frequency)
            );
        }
        
        if (newParams.minCutoff !== undefined) {
            this.filterParams.minCutoff = Math.max(
                CONFIG.FILTER.MIN_CUTOFF_RANGE.min,
                Math.min(CONFIG.FILTER.MIN_CUTOFF_RANGE.max, newParams.minCutoff)
            );
        }
        
        if (newParams.beta !== undefined) {
            this.filterParams.beta = Math.max(
                CONFIG.FILTER.BETA_RANGE.min,
                Math.min(CONFIG.FILTER.BETA_RANGE.max, newParams.beta)
            );
        }
        
        if (newParams.dCutoff !== undefined) {
            this.filterParams.dCutoff = Math.max(
                CONFIG.FILTER.D_CUTOFF_RANGE.min,
                Math.min(CONFIG.FILTER.D_CUTOFF_RANGE.max, newParams.dCutoff)
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
        }
    }
    
    /**
     * 重置所有滤波器
     */
    resetFilters() {
        this.filters.clear();
        console.log('🔄 所有滤波器已重置');
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
     * 获取推荐参数配置
     * @param {string} scenario - 使用场景
     * @returns {Object} 推荐参数
     */
    static getRecommendedParameters(scenario = 'default') {
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
            version: CONFIG.MODEL.CACHE_VERSION
        };
    }
    
    /**
     * 导入配置
     * @param {Object} config - 配置对象
     */
    importConfig(config) {
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
    }
}