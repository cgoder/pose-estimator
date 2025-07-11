/**
 * 统一的模型配置管理
 * 集中管理所有TensorFlow.js模型的配置参数
 */

/**
 * 模型类型枚举
 */
export const MODEL_TYPES = {
    MOVENET: 'MoveNet',
    POSENET: 'PoseNet'
};

/**
 * MoveNet模型配置
 */
export const MOVENET_CONFIG = {
    modelType: 'SINGLEPOSE_LIGHTNING',
    enableSmoothing: true,
    multiPoseMaxDimension: 256,
    enableTracking: true,
    trackerType: 'boundingBox',
    trackerConfig: {
        maxTracks: 18,
        maxAge: 1000,
        minSimilarity: 0.15,
        keypointTrackerParams: {
            keypointConfidenceThreshold: 0.3,
            keypointFalloff: [0.026, 0.025, 0.025, 0.035, 0.035, 0.079, 0.079, 0.072, 0.072, 0.062, 0.062, 0.107, 0.107, 0.087, 0.087, 0.089, 0.089],
            minNumberOfKeypoints: 4
        }
    }
};

/**
 * PoseNet模型配置
 */
export const POSENET_CONFIG = {
    quantBytes: 2,
    architecture: 'MobileNetV1',
    outputStride: 16,
    inputResolution: { width: 353, height: 257 },
    multiplier: 0.75,
    flipHorizontal: false,
    maxDetections: 1,
    scoreThreshold: 0.5,
    nmsRadius: 20
};

/**
 * 模型URL配置
 */
export const MODEL_URLS = {
    [MODEL_TYPES.MOVENET]: 'https://tfhub.dev/google/movenet/singlepose/lightning/4',
    [MODEL_TYPES.POSENET]: 'https://tfhub.dev/tensorflow/posenet/mobilenet/float/075/1/default/1'
};

/**
 * 模型性能配置
 */
export const MODEL_PERFORMANCE = {
    [MODEL_TYPES.MOVENET]: {
        preferredBackend: 'webgl',
        memoryUsage: 'low',
        inferenceSpeed: 'fast',
        accuracy: 'high'
    },
    [MODEL_TYPES.POSENET]: {
        preferredBackend: 'webgl',
        memoryUsage: 'medium',
        inferenceSpeed: 'medium',
        accuracy: 'medium'
    }
};

/**
 * 模型缓存配置
 */
export const MODEL_CACHE_CONFIG = {
    [MODEL_TYPES.MOVENET]: {
        ttl: 24 * 60 * 60 * 1000, // 24小时
        maxSize: 50 * 1024 * 1024, // 50MB
        priority: 'high'
    },
    [MODEL_TYPES.POSENET]: {
        ttl: 24 * 60 * 60 * 1000, // 24小时
        maxSize: 30 * 1024 * 1024, // 30MB
        priority: 'medium'
    }
};

/**
 * 模型配置管理器
 */
export class ModelConfigManager {
    constructor() {
        this.configs = new Map();
        this._initializeConfigs();
    }

    /**
     * 初始化配置
     * @private
     */
    _initializeConfigs() {
        // 注册MoveNet配置
        this.configs.set(MODEL_TYPES.MOVENET, {
            type: MODEL_TYPES.MOVENET,
            config: MOVENET_CONFIG,
            url: MODEL_URLS[MODEL_TYPES.MOVENET],
            performance: MODEL_PERFORMANCE[MODEL_TYPES.MOVENET],
            cache: MODEL_CACHE_CONFIG[MODEL_TYPES.MOVENET]
        });

        // 注册PoseNet配置
        this.configs.set(MODEL_TYPES.POSENET, {
            type: MODEL_TYPES.POSENET,
            config: POSENET_CONFIG,
            url: MODEL_URLS[MODEL_TYPES.POSENET],
            performance: MODEL_PERFORMANCE[MODEL_TYPES.POSENET],
            cache: MODEL_CACHE_CONFIG[MODEL_TYPES.POSENET]
        });
    }

    /**
     * 获取模型配置
     * @param {string} modelType - 模型类型
     * @returns {Object} 模型配置
     */
    getModelConfig(modelType) {
        const config = this.configs.get(modelType);
        if (!config) {
            throw new Error(`不支持的模型类型: ${modelType}`);
        }
        return { ...config }; // 返回副本避免意外修改
    }

    /**
     * 获取模型创建参数
     * @param {string} modelType - 模型类型
     * @param {Object} overrides - 覆盖参数
     * @returns {Object} 创建参数
     */
    getCreateParams(modelType, overrides = {}) {
        const config = this.getModelConfig(modelType);
        return {
            ...config.config,
            ...overrides
        };
    }

    /**
     * 获取模型URL
     * @param {string} modelType - 模型类型
     * @returns {string} 模型URL
     */
    getModelUrl(modelType) {
        const config = this.getModelConfig(modelType);
        return config.url;
    }

    /**
     * 获取缓存配置
     * @param {string} modelType - 模型类型
     * @returns {Object} 缓存配置
     */
    getCacheConfig(modelType) {
        const config = this.getModelConfig(modelType);
        return config.cache;
    }

    /**
     * 获取性能配置
     * @param {string} modelType - 模型类型
     * @returns {Object} 性能配置
     */
    getPerformanceConfig(modelType) {
        const config = this.getModelConfig(modelType);
        return config.performance;
    }

    /**
     * 验证模型类型
     * @param {string} modelType - 模型类型
     * @returns {boolean} 是否有效
     */
    isValidModelType(modelType) {
        return this.configs.has(modelType);
    }

    /**
     * 获取所有支持的模型类型
     * @returns {Array<string>} 模型类型数组
     */
    getSupportedModelTypes() {
        return Array.from(this.configs.keys());
    }

    /**
     * 更新模型配置
     * @param {string} modelType - 模型类型
     * @param {Object} updates - 更新内容
     */
    updateModelConfig(modelType, updates) {
        if (!this.configs.has(modelType)) {
            throw new Error(`模型类型不存在: ${modelType}`);
        }

        const currentConfig = this.configs.get(modelType);
        const updatedConfig = {
            ...currentConfig,
            config: {
                ...currentConfig.config,
                ...updates.config
            },
            performance: {
                ...currentConfig.performance,
                ...updates.performance
            },
            cache: {
                ...currentConfig.cache,
                ...updates.cache
            }
        };

        this.configs.set(modelType, updatedConfig);
        console.log(`📝 模型配置已更新: ${modelType}`);
    }

    /**
     * 重置为默认配置
     * @param {string} modelType - 模型类型
     */
    resetToDefaults(modelType) {
        if (!this.configs.has(modelType)) {
            throw new Error(`模型类型不存在: ${modelType}`);
        }

        this._initializeConfigs();
        console.log(`🔄 模型配置已重置为默认值: ${modelType}`);
    }

    /**
     * 获取配置统计信息
     * @returns {Object} 统计信息
     */
    getStats() {
        return {
            totalModels: this.configs.size,
            supportedTypes: this.getSupportedModelTypes(),
            configSizes: Array.from(this.configs.entries()).map(([type, config]) => ({
                type,
                configSize: JSON.stringify(config).length
            }))
        };
    }
}

// 创建单例实例
export const modelConfigManager = new ModelConfigManager();

// 导出常用的配置获取函数
export const getModelConfig = (modelType) => modelConfigManager.getModelConfig(modelType);
export const getCreateParams = (modelType, overrides) => modelConfigManager.getCreateParams(modelType, overrides);
export const isValidModelType = (modelType) => modelConfigManager.isValidModelType(modelType);