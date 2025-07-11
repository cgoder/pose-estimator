/**
 * TensorFlow 服务适配器
 * 为了向后兼容，提供与原 TensorFlowService 相同的接口
 * 内部使用新的 TensorFlowProvider 实现
 */

import { TensorFlowProvider } from './TensorFlowProvider.js';
import { MODEL_TYPES } from '../interfaces/IModelProvider.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';

/**
 * TensorFlow 服务类
 * 向后兼容的适配器，内部使用 TensorFlowProvider
 */
export class TensorFlowService {
    constructor(options = {}) {
        // 创建内部的 TensorFlowProvider 实例
        this.provider = new TensorFlowProvider(options);
        
        // 绑定事件监听器
        this._bindEventListeners();
        
        console.log('🔄 TensorFlow Service (适配器) 已创建');
    }
    
    /**
     * 初始化服务
     * @param {Object} options - 初始化选项
     * @returns {Promise<void>}
     */
    async init(options = {}) {
        return this.provider.initialize(options);
    }
    
    /**
     * 获取或创建模型检测器
     * @param {string} modelType - 模型类型
     * @param {Object} options - 选项
     * @returns {Promise<Object>} 检测器实例
     */
    async getDetector(modelType, options = {}) {
        return this.provider.getDetector(modelType, options);
    }
    
    /**
     * 批量预加载模型
     * @param {Array<Object>} models - 模型配置数组
     * @returns {Promise<void>}
     */
    async batchPreloadModels(models) {
        return this.provider.batchPreloadModels(models);
    }
    
    /**
     * 清理未使用的模型
     * @param {Array<string>} keepModels - 要保留的模型类型
     */
    cleanupUnusedModels(keepModels = []) {
        return this.provider.cleanupUnusedModels(keepModels);
    }
    
    /**
     * 获取内存使用情况
     * @returns {Object} 内存使用信息
     */
    getMemoryUsage() {
        return this.provider.getMemoryUsage();
    }
    
    /**
     * 获取已加载的模型类型
     * @returns {Array<string>} 模型类型数组
     */
    getLoadedModelTypes() {
        return this.provider.getLoadedModelTypes();
    }
    
    /**
     * 获取服务状态
     * @returns {Object} 服务状态
     */
    getStatus() {
        return this.provider.getStatus();
    }
    
    /**
     * 获取统计信息 (向后兼容)
     * @returns {Object} 统计信息
     */
    getStats() {
        return this.provider.getStatus();
    }
    
    /**
     * 销毁服务
     * @returns {Promise<void>}
     */
    async destroy() {
        return this.provider.destroy();
    }
    
    /**
     * 加载TensorFlow.js核心模块
     * @returns {Promise<Object>} TensorFlow.js对象
     */
    async loadTensorFlowCore() {
        return this.provider.loadTensorFlowCore();
    }
    
    /**
     * 加载姿态检测模块
     * @returns {Promise<Object>} 姿态检测对象
     */
    async loadPoseDetection() {
        return this.provider.loadPoseDetection();
    }
    
    /**
     * 获取或创建模型 (向后兼容)
     * @param {string} modelKey - 模型键
     * @param {string} modelUrl - 模型URL
     * @param {Function} createFn - 创建函数
     * @returns {Promise<Object>} 模型实例
     */
    async getOrCreateModel(modelKey, modelUrl, createFn) {
        // 这个方法主要用于内部缓存，现在委托给 provider
        return createFn(); // 简化实现，直接调用创建函数
    }
    
    /**
     * 获取缓存统计信息
     * @returns {Object} 缓存统计
     */
    getCacheStats() {
        return this.provider.getCacheStats();
    }
    
    /**
     * 绑定事件监听器
     * @private
     */
    _bindEventListeners() {
        // 监听页面卸载事件
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
        }
    }
    
    // ==================== 向后兼容的属性访问器 ====================
    
    /**
     * 获取初始化状态
     */
    get isInitialized() {
        return this.provider.isInitialized;
    }
    
    /**
     * 获取加载的检测器
     */
    get loadedDetectors() {
        return this.provider.loadedDetectors;
    }
    
    /**
     * 获取加载的模块
     */
    get loadedModules() {
        return this.provider.loadedModules;
    }
    
    /**
     * 获取状态信息
     */
    get status() {
        return this.provider.tfStatus;
    }
}

// 创建单例实例
export const tensorFlowService = new TensorFlowService();

// 导出常用方法 (向后兼容)
export const getDetector = (modelType, options) => tensorFlowService.getDetector(modelType, options);
export const initTensorFlow = (options) => tensorFlowService.init(options);
export const getTensorFlowStatus = () => tensorFlowService.getStatus();

// 重新导出MODEL_TYPES以便其他模块使用
export { MODEL_TYPES };

// 导出 TensorFlowProvider 供高级用户使用
export { TensorFlowProvider };