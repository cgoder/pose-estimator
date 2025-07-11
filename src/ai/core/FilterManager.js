/**
 * 滤波器管理器
 * 统一管理所有滤波器的创建、配置和应用
 */

import { IDataProcessor, DATA_TYPES, PROCESSING_STATUS, IFilter } from '../interfaces/IDataProcessor.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * 滤波器管理器类
 * 实现统一的滤波器管理接口，支持多种滤波算法
 */
export class FilterManager extends IDataProcessor {
    constructor(options = {}) {
        super();
        
        this.filters = new Map(); // 滤波器实例缓存
        this.filterConfigs = new Map(); // 滤波器配置
        this.filterHistory = new Map(); // 滤波历史数据
        
        // 配置选项
        this.options = {
            enableOneEuroFilter: options.enableOneEuroFilter !== false,
            enableKalmanFilter: options.enableKalmanFilter || false,
            enableMovingAverage: options.enableMovingAverage || false,
            defaultFilterType: options.defaultFilterType || 'oneEuro',
            maxHistorySize: options.maxHistorySize || 100,
            autoCleanup: options.autoCleanup !== false,
            cleanupInterval: options.cleanupInterval || 30000, // 30秒
            ...options
        };
        
        // 统计信息
        this.stats = {
            filtersCreated: 0,
            totalFilterTime: 0,
            averageFilterTime: 0,
            dataPointsProcessed: 0,
            activeFilters: 0
        };
        
        // 初始化滤波器工厂
        this._initFilterFactories();
        
        // 启动自动清理
        if (this.options.autoCleanup) {
            this._startAutoCleanup();
        }
        
        console.log('🔧 滤波器管理器已创建');
    }
    
    /**
     * 初始化滤波器管理器
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('🚀 正在初始化滤波器管理器...');
            
            // 加载滤波器实现
            await this._loadFilterImplementations();
            
            // 创建默认滤波器配置
            this._createDefaultConfigs();
            
            console.log('✅ 滤波器管理器初始化完成');
            
        } catch (error) {
            console.error('❌ 滤波器管理器初始化失败:', error);
            throw ErrorHandler.createError('FilterManager', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 应用滤波器到数据
     * @param {any} data - 输入数据
     * @param {Object} options - 滤波选项
     * @returns {Promise<any>} 滤波后的数据
     */
    async filter(data, options = {}) {
        const startTime = performance.now();
        
        try {
            if (!data) {
                return data;
            }
            
            const filterType = options.filterType || this.options.defaultFilterType;
            const dataId = options.dataId || 'default';
            const timestamp = options.timestamp || performance.now();
            
            // 获取或创建滤波器实例
            const filter = await this._getOrCreateFilter(filterType, dataId, options);
            
            // 应用滤波
            let filteredData;
            if (Array.isArray(data)) {
                // 处理数组数据（如关键点列表）
                filteredData = await this._filterArray(filter, data, timestamp, options);
            } else if (typeof data === 'object' && data.keypoints) {
                // 处理姿态数据
                filteredData = await this._filterPoseData(filter, data, timestamp, options);
            } else {
                // 处理单个数值或对象
                filteredData = await this._filterSingleValue(filter, data, timestamp, options);
            }
            
            // 更新统计信息
            const filterTime = performance.now() - startTime;
            this._updateStats(filterTime);
            
            // 记录历史数据
            this._recordHistory(dataId, {
                input: data,
                output: filteredData,
                timestamp,
                filterTime,
                filterType
            });
            
            return filteredData;
            
        } catch (error) {
            console.error('❌ 滤波处理失败:', error);
            throw ErrorHandler.createError('FilterManager', `滤波失败: ${error.message}`, error);
        }
    }
    
    /**
     * 预处理数据
     * @param {any} data - 输入数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 预处理后的数据
     */
    async preprocess(data, options = {}) {
        try {
            // 数据验证
            if (!this._validateData(data, options.expectedType)) {
                throw new Error('数据验证失败');
            }
            
            // 数据标准化
            const normalizedData = this._normalizeData(data, options);
            
            return normalizedData;
            
        } catch (error) {
            console.error('❌ 数据预处理失败:', error);
            throw error;
        }
    }
    
    /**
     * 后处理数据
     * @param {any} data - 输入数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 后处理后的数据
     */
    async postprocess(data, options = {}) {
        try {
            // 应用滤波
            const filteredData = await this.filter(data, options);
            
            // 数据平滑
            const smoothedData = this._smoothData(filteredData, options);
            
            return smoothedData;
            
        } catch (error) {
            console.error('❌ 数据后处理失败:', error);
            throw error;
        }
    }
    
    /**
     * 重置滤波器
     * @param {string} dataId - 数据ID（可选，不指定则重置所有）
     */
    resetFilters(dataId = null) {
        try {
            if (dataId) {
                // 重置特定滤波器
                for (const [key, filter] of this.filters.entries()) {
                    if (key.includes(dataId)) {
                        if (filter && typeof filter.reset === 'function') {
                            filter.reset();
                        }
                    }
                }
                
                // 清理历史数据
                this.filterHistory.delete(dataId);
                
                console.log(`🔄 已重置滤波器: ${dataId}`);
            } else {
                // 重置所有滤波器
                for (const filter of this.filters.values()) {
                    if (filter && typeof filter.reset === 'function') {
                        filter.reset();
                    }
                }
                
                // 清理所有历史数据
                this.filterHistory.clear();
                
                console.log('🔄 已重置所有滤波器');
            }
            
        } catch (error) {
            console.error('❌ 重置滤波器失败:', error);
        }
    }
    
    /**
     * 获取滤波器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            activeFilters: this.filters.size,
            filterTypes: Array.from(new Set(
                Array.from(this.filters.keys()).map(key => key.split(':')[0])
            )),
            stats: { ...this.stats },
            options: { ...this.options },
            historySize: this.filterHistory.size,
            memoryUsage: this._getMemoryUsage()
        };
    }
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 正在清理滤波器管理器资源...');
            
            // 停止自动清理
            if (this.cleanupInterval) {
                clearInterval(this.cleanupInterval);
                this.cleanupInterval = null;
            }
            
            // 清理所有滤波器
            for (const filter of this.filters.values()) {
                if (filter && typeof filter.dispose === 'function') {
                    filter.dispose();
                }
            }
            
            // 清空缓存
            this.filters.clear();
            this.filterConfigs.clear();
            this.filterHistory.clear();
            
            console.log('✅ 滤波器管理器资源清理完成');
            
        } catch (error) {
            console.error('❌ 滤波器管理器清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取或创建滤波器实例
     * @private
     * @param {string} filterType - 滤波器类型
     * @param {string} dataId - 数据ID
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 滤波器实例
     */
    async _getOrCreateFilter(filterType, dataId, options = {}) {
        const filterKey = `${filterType}:${dataId}`;
        
        if (this.filters.has(filterKey)) {
            return this.filters.get(filterKey);
        }
        
        // 创建新的滤波器实例
        const filter = await this._createFilter(filterType, options);
        this.filters.set(filterKey, filter);
        this.stats.filtersCreated++;
        this.stats.activeFilters = this.filters.size;
        
        console.log(`🔧 已创建滤波器: ${filterKey}`);
        
        return filter;
    }
    
    /**
     * 创建滤波器实例
     * @private
     * @param {string} filterType - 滤波器类型
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 滤波器实例
     */
    async _createFilter(filterType, options = {}) {
        const factory = this.filterFactories.get(filterType);
        if (!factory) {
            throw new Error(`不支持的滤波器类型: ${filterType}`);
        }
        
        const config = this.filterConfigs.get(filterType) || {};
        const mergedConfig = { ...config, ...options };
        
        return factory(mergedConfig);
    }
    
    /**
     * 滤波数组数据
     * @private
     * @param {Object} filter - 滤波器实例
     * @param {Array} data - 数组数据
     * @param {number} timestamp - 时间戳
     * @param {Object} options - 选项
     * @returns {Promise<Array>} 滤波后的数组
     */
    async _filterArray(filter, data, timestamp, options = {}) {
        if (!Array.isArray(data)) {
            return data;
        }
        
        const filteredArray = [];
        
        for (let i = 0; i < data.length; i++) {
            const item = data[i];
            
            if (typeof item === 'object' && item.x !== undefined && item.y !== undefined) {
                // 处理坐标点
                const filteredX = filter.filter(item.x, timestamp);
                const filteredY = filter.filter(item.y, timestamp);
                
                filteredArray.push({
                    ...item,
                    x: filteredX,
                    y: filteredY
                });
            } else if (typeof item === 'number') {
                // 处理数值
                filteredArray.push(filter.filter(item, timestamp));
            } else {
                // 其他类型直接传递
                filteredArray.push(item);
            }
        }
        
        return filteredArray;
    }
    
    /**
     * 滤波姿态数据
     * @private
     * @param {Object} filter - 滤波器实例
     * @param {Object} data - 姿态数据
     * @param {number} timestamp - 时间戳
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 滤波后的姿态数据
     */
    async _filterPoseData(filter, data, timestamp, options = {}) {
        if (!data.keypoints || !Array.isArray(data.keypoints)) {
            return data;
        }
        
        const filteredKeypoints = await this._filterArray(filter, data.keypoints, timestamp, options);
        
        return {
            ...data,
            keypoints: filteredKeypoints
        };
    }
    
    /**
     * 滤波单个数值
     * @private
     * @param {Object} filter - 滤波器实例
     * @param {any} data - 单个数值或对象
     * @param {number} timestamp - 时间戳
     * @param {Object} options - 选项
     * @returns {Promise<any>} 滤波后的数据
     */
    async _filterSingleValue(filter, data, timestamp, options = {}) {
        if (typeof data === 'number') {
            return filter.filter(data, timestamp);
        }
        
        if (typeof data === 'object' && data.x !== undefined && data.y !== undefined) {
            return {
                ...data,
                x: filter.filter(data.x, timestamp),
                y: filter.filter(data.y, timestamp)
            };
        }
        
        return data;
    }
    
    /**
     * 初始化滤波器工厂
     * @private
     */
    _initFilterFactories() {
        this.filterFactories = new Map();
        
        // OneEuro滤波器工厂
        this.filterFactories.set('oneEuro', (config) => {
            return this._createOneEuroFilter(config);
        });
        
        // 移动平均滤波器工厂
        this.filterFactories.set('movingAverage', (config) => {
            return this._createMovingAverageFilter(config);
        });
        
        // 卡尔曼滤波器工厂
        this.filterFactories.set('kalman', (config) => {
            return this._createKalmanFilter(config);
        });
    }
    
    /**
     * 加载滤波器实现
     * @private
     */
    async _loadFilterImplementations() {
        try {
            // 动态导入OneEuroFilter
            if (this.options.enableOneEuroFilter) {
                const { OneEuroFilter } = await import('../filters/OneEuroFilter.js');
                this.OneEuroFilter = OneEuroFilter;
            }
            
            // 动态导入其他滤波器
            if (this.options.enableMovingAverage) {
                const { MovingAverageFilter } = await import('../filters/MovingAverageFilter.js');
                this.MovingAverageFilter = MovingAverageFilter;
            }
            
            if (this.options.enableKalmanFilter) {
                const { KalmanFilter } = await import('../filters/KalmanFilter.js');
                this.KalmanFilter = KalmanFilter;
            }
            
        } catch (error) {
            console.warn('⚠️ 部分滤波器加载失败:', error);
        }
    }
    
    /**
     * 创建OneEuro滤波器
     * @private
     * @param {Object} config - 配置
     * @returns {Object} OneEuro滤波器实例
     */
    _createOneEuroFilter(config = {}) {
        if (!this.OneEuroFilter) {
            throw new Error('OneEuroFilter未加载');
        }
        
        const defaultConfig = {
            frequency: 30,
            minCutoff: 1.0,
            beta: 0.007,
            derivateCutoff: 1.0
        };
        
        const mergedConfig = { ...defaultConfig, ...config };
        
        return new this.OneEuroFilter(
            mergedConfig.frequency,
            mergedConfig.minCutoff,
            mergedConfig.beta,
            mergedConfig.derivateCutoff
        );
    }
    
    /**
     * 创建移动平均滤波器
     * @private
     * @param {Object} config - 配置
     * @returns {Object} 移动平均滤波器实例
     */
    _createMovingAverageFilter(config = {}) {
        const windowSize = config.windowSize || 5;
        const values = [];
        
        return {
            filter: (value, timestamp) => {
                values.push(value);
                if (values.length > windowSize) {
                    values.shift();
                }
                
                const sum = values.reduce((a, b) => a + b, 0);
                return sum / values.length;
            },
            reset: () => {
                values.length = 0;
            }
        };
    }
    
    /**
     * 创建卡尔曼滤波器
     * @private
     * @param {Object} config - 配置
     * @returns {Object} 卡尔曼滤波器实例
     */
    _createKalmanFilter(config = {}) {
        // 简化的卡尔曼滤波器实现
        const Q = config.processNoise || 0.01; // 过程噪声
        const R = config.measurementNoise || 0.1; // 测量噪声
        
        let x = 0; // 状态估计
        let P = 1; // 误差协方差
        let initialized = false;
        
        return {
            filter: (value, timestamp) => {
                if (!initialized) {
                    x = value;
                    initialized = true;
                    return value;
                }
                
                // 预测步骤
                P = P + Q;
                
                // 更新步骤
                const K = P / (P + R); // 卡尔曼增益
                x = x + K * (value - x);
                P = (1 - K) * P;
                
                return x;
            },
            reset: () => {
                x = 0;
                P = 1;
                initialized = false;
            }
        };
    }
    
    /**
     * 创建默认配置
     * @private
     */
    _createDefaultConfigs() {
        // OneEuro滤波器默认配置
        this.filterConfigs.set('oneEuro', {
            frequency: 30,
            minCutoff: 1.0,
            beta: 0.007,
            derivateCutoff: 1.0
        });
        
        // 移动平均滤波器默认配置
        this.filterConfigs.set('movingAverage', {
            windowSize: 5
        });
        
        // 卡尔曼滤波器默认配置
        this.filterConfigs.set('kalman', {
            processNoise: 0.01,
            measurementNoise: 0.1
        });
    }
    
    /**
     * 验证数据
     * @private
     * @param {any} data - 数据
     * @param {string} expectedType - 期望类型
     * @returns {boolean} 验证结果
     */
    _validateData(data, expectedType) {
        if (!expectedType) {
            return true;
        }
        
        switch (expectedType) {
            case DATA_TYPES.POSE:
                return data && typeof data === 'object' && Array.isArray(data.keypoints);
            case DATA_TYPES.KEYPOINTS:
                return Array.isArray(data);
            case DATA_TYPES.COORDINATES:
                return typeof data === 'object' && data.x !== undefined && data.y !== undefined;
            case DATA_TYPES.NUMBER:
                return typeof data === 'number';
            default:
                return true;
        }
    }
    
    /**
     * 标准化数据
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {any} 标准化后的数据
     */
    _normalizeData(data, options = {}) {
        // 这里可以添加数据标准化逻辑
        // 例如坐标归一化、数值范围调整等
        return data;
    }
    
    /**
     * 平滑数据
     * @private
     * @param {any} data - 数据
     * @param {Object} options - 选项
     * @returns {any} 平滑后的数据
     */
    _smoothData(data, options = {}) {
        // 这里可以添加额外的数据平滑逻辑
        return data;
    }
    
    /**
     * 记录历史数据
     * @private
     * @param {string} dataId - 数据ID
     * @param {Object} record - 记录
     */
    _recordHistory(dataId, record) {
        if (!this.filterHistory.has(dataId)) {
            this.filterHistory.set(dataId, []);
        }
        
        const history = this.filterHistory.get(dataId);
        history.push(record);
        
        // 限制历史记录大小
        if (history.length > this.options.maxHistorySize) {
            history.shift();
        }
    }
    
    /**
     * 更新统计信息
     * @private
     * @param {number} filterTime - 滤波时间
     */
    _updateStats(filterTime) {
        this.stats.dataPointsProcessed++;
        this.stats.totalFilterTime += filterTime;
        this.stats.averageFilterTime = this.stats.totalFilterTime / this.stats.dataPointsProcessed;
        this.stats.activeFilters = this.filters.size;
    }
    
    /**
     * 获取内存使用情况
     * @private
     * @returns {Object} 内存使用信息
     */
    _getMemoryUsage() {
        return {
            filters: this.filters.size,
            configs: this.filterConfigs.size,
            history: this.filterHistory.size,
            totalHistoryRecords: Array.from(this.filterHistory.values())
                .reduce((sum, history) => sum + history.length, 0)
        };
    }
    
    /**
     * 启动自动清理
     * @private
     */
    _startAutoCleanup() {
        this.cleanupInterval = setInterval(() => {
            this._performAutoCleanup();
        }, this.options.cleanupInterval);
    }
    
    /**
     * 执行自动清理
     * @private
     */
    _performAutoCleanup() {
        try {
            const now = Date.now();
            const cleanupThreshold = 5 * 60 * 1000; // 5分钟未使用
            
            // 清理长时间未使用的历史记录
            for (const [dataId, history] of this.filterHistory.entries()) {
                if (history.length > 0) {
                    const lastRecord = history[history.length - 1];
                    if (now - lastRecord.timestamp > cleanupThreshold) {
                        this.filterHistory.delete(dataId);
                        console.log(`🧹 已清理历史记录: ${dataId}`);
                    }
                }
            }
            
        } catch (error) {
            console.error('❌ 自动清理失败:', error);
        }
    }
}

// 导出数据类型和状态枚举
export { DATA_TYPES, PROCESSING_STATUS };