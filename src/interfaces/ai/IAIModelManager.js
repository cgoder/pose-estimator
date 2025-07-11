import { IBaseModule } from '../core/IBaseModule.js';

/**
 * AI模型管理器接口
 */
export class IAIModelManager extends IBaseModule {
    /**
     * 加载模型
     * @param {string} modelType - 模型类型
     * @param {Object} options - 加载选项
     * @returns {Promise<Object>} 加载的模型
     */
    async loadModel(modelType, options = {}) {
        throw new Error('IAIModelManager.loadModel must be implemented');
    }

    /**
     * 卸载模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async unloadModel(modelType) {
        throw new Error('IAIModelManager.unloadModel must be implemented');
    }

    /**
     * 获取当前加载的模型
     * @returns {Object} 当前模型信息
     */
    getCurrentModel() {
        throw new Error('IAIModelManager.getCurrentModel must be implemented');
    }

    /**
     * 获取可用的模型列表
     * @returns {Array} 模型列表
     */
    getAvailableModels() {
        throw new Error('IAIModelManager.getAvailableModels must be implemented');
    }

    /**
     * 检查模型是否已加载
     * @param {string} modelType - 模型类型
     * @returns {boolean} 是否已加载
     */
    isModelLoaded(modelType) {
        throw new Error('IAIModelManager.isModelLoaded must be implemented');
    }

    /**
     * 获取模型信息
     * @param {string} modelType - 模型类型
     * @returns {Object} 模型信息
     */
    getModelInfo(modelType) {
        throw new Error('IAIModelManager.getModelInfo must be implemented');
    }

    /**
     * 预热模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async warmupModel(modelType) {
        throw new Error('IAIModelManager.warmupModel must be implemented');
    }

    /**
     * 获取模型性能指标
     * @param {string} modelType - 模型类型
     * @returns {Object} 性能指标
     */
    getModelPerformance(modelType) {
        throw new Error('IAIModelManager.getModelPerformance must be implemented');
    }

    /**
     * 设置模型配置
     * @param {string} modelType - 模型类型
     * @param {Object} config - 模型配置
     */
    setModelConfig(modelType, config) {
        throw new Error('IAIModelManager.setModelConfig must be implemented');
    }

    /**
     * 获取模型配置
     * @param {string} modelType - 模型类型
     * @returns {Object} 模型配置
     */
    getModelConfig(modelType) {
        throw new Error('IAIModelManager.getModelConfig must be implemented');
    }

    /**
     * 验证模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<Object>} 验证结果
     */
    async validateModel(modelType) {
        throw new Error('IAIModelManager.validateModel must be implemented');
    }

    /**
     * 获取模型加载进度
     * @param {string} modelType - 模型类型
     * @returns {number} 加载进度 (0-100)
     */
    getLoadingProgress(modelType) {
        throw new Error('IAIModelManager.getLoadingProgress must be implemented');
    }
}

export default IAIModelManager;