/**
 * 模型提供者接口定义
 * 定义统一的模型管理接口，支持不同模型框架的集成
 */

/**
 * 模型提供者接口
 * @interface IModelProvider
 */
export class IModelProvider {
    /**
     * 加载模型
     * @param {string} modelType - 模型类型
     * @param {Object} options - 加载选项
     * @returns {Promise<any>} 模型实例
     */
    async loadModel(modelType, options = {}) {
        throw new Error('IModelProvider.loadModel() must be implemented');
    }

    /**
     * 卸载模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async unloadModel(modelType) {
        throw new Error('IModelProvider.unloadModel() must be implemented');
    }

    /**
     * 获取已加载的模型列表
     * @returns {Array<string>} 模型类型列表
     */
    getLoadedModels() {
        throw new Error('IModelProvider.getLoadedModels() must be implemented');
    }

    /**
     * 检查模型是否已加载
     * @param {string} modelType - 模型类型
     * @returns {boolean} 是否已加载
     */
    isModelLoaded(modelType) {
        throw new Error('IModelProvider.isModelLoaded() must be implemented');
    }

    /**
     * 获取模型信息
     * @param {string} modelType - 模型类型
     * @returns {Object} 模型信息
     */
    getModelInfo(modelType) {
        throw new Error('IModelProvider.getModelInfo() must be implemented');
    }

    /**
     * 预热模型
     * @param {string} modelType - 模型类型
     * @param {any} sampleInput - 样本输入
     * @returns {Promise<void>}
     */
    async warmupModel(modelType, sampleInput) {
        throw new Error('IModelProvider.warmupModel() must be implemented');
    }

    /**
     * 清理所有模型
     * @returns {Promise<void>}
     */
    async cleanup() {
        throw new Error('IModelProvider.cleanup() must be implemented');
    }

    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryUsage() {
        throw new Error('IModelProvider.getMemoryUsage() must be implemented');
    }
}

/**
 * 模型状态枚举
 */
export const MODEL_STATUS = {
    UNLOADED: 'unloaded',
    LOADING: 'loading',
    LOADED: 'loaded',
    WARMING_UP: 'warming_up',
    READY: 'ready',
    ERROR: 'error'
};

/**
 * 模型类型枚举
 */
export const MODEL_TYPES = {
    TENSORFLOW: 'tensorflow',
    ONNX: 'onnx',
    PYTORCH: 'pytorch',
    CUSTOM: 'custom'
};

/**
 * 模型信息接口
 * @interface IModelInfo
 */
export class IModelInfo {
    constructor() {
        this.type = null;
        this.name = null;
        this.version = null;
        this.framework = null;
        this.inputShape = null;
        this.outputShape = null;
        this.size = 0;
        this.loadTime = 0;
        this.status = MODEL_STATUS.UNLOADED;
        this.metadata = {};
    }
}

/**
 * 模型配置接口
 * @interface IModelConfig
 */
export class IModelConfig {
    constructor() {
        this.type = null;
        this.url = null;
        this.localPath = null;
        this.options = {};
        this.cache = {
            enabled: true,
            ttl: 24 * 60 * 60 * 1000 // 24小时
        };
        this.performance = {
            enableGPU: true,
            precision: 'float32'
        };
    }
}