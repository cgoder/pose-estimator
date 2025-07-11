/**
 * 模型管理器
 * 统一管理所有AI模型的加载、缓存、内存管理等功能
 */

import { IModelProvider, MODEL_STATUS, MODEL_TYPES, IModelInfo } from '../interfaces/IModelProvider.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * 模型管理器类
 * 实现统一的模型管理接口，支持多种模型框架
 */
export class ModelManager extends IModelProvider {
    constructor(options = {}) {
        super();
        
        this.models = new Map(); // 已加载的模型缓存
        this.modelConfigs = new Map(); // 模型配置缓存
        this.currentModel = null; // 当前使用的模型
        this.loadingPromises = new Map(); // 正在加载的模型Promise
        
        // 配置选项
        this.options = {
            maxCacheSize: options.maxCacheSize || 3, // 最大缓存模型数量
            enableGPU: options.enableGPU !== false,
            enableCache: options.enableCache !== false,
            preloadModels: options.preloadModels || [],
            modelBasePath: options.modelBasePath || '/models',
            memoryThreshold: options.memoryThreshold || 400 * 1024 * 1024, // 400MB
            ...options
        };
        
        // 统计信息
        this.stats = {
            modelsLoaded: 0,
            totalLoadTime: 0,
            averageLoadTime: 0,
            cacheHits: 0,
            cacheMisses: 0,
            memoryUsage: 0
        };
        
        // 预定义的模型配置
        this._initModelConfigs();
        
        console.log('📦 模型管理器已创建');
    }
    
    /**
     * 初始化模型管理器
     * @returns {Promise<void>}
     */
    async init() {
        try {
            console.log('🚀 正在初始化模型管理器...');
            
            // 检查TensorFlow.js是否可用
            if (typeof window === 'undefined' || !window.tf) {
                throw new Error('TensorFlow.js未加载或不可用');
            }
            
            // 设置TensorFlow.js后端
            await this._setupTensorFlowBackend();
            
            // 预加载指定的模型
            if (this.options.preloadModels.length > 0) {
                await this._preloadModels();
            }
            
            // 监听内存使用情况
            this._startMemoryMonitoring();
            
            console.log('✅ 模型管理器初始化完成');
            
        } catch (error) {
            console.error('❌ 模型管理器初始化失败:', error);
            throw ErrorHandler.createError('ModelManager', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 加载模型
     * @param {string} modelType - 模型类型
     * @param {Object} config - 模型配置
     * @returns {Promise<Object>} 加载的模型
     */
    async loadModel(modelType, config = {}) {
        try {
            // 检查是否已在缓存中
            if (this.models.has(modelType)) {
                this.stats.cacheHits++;
                console.log(`📦 从缓存加载模型: ${modelType}`);
                return this.models.get(modelType);
            }
            
            // 检查是否正在加载
            if (this.loadingPromises.has(modelType)) {
                console.log(`⏳ 等待模型加载完成: ${modelType}`);
                return await this.loadingPromises.get(modelType);
            }
            
            // 开始加载模型
            const loadingPromise = this._loadModelInternal(modelType, config);
            this.loadingPromises.set(modelType, loadingPromise);
            
            try {
                const model = await loadingPromise;
                this.loadingPromises.delete(modelType);
                return model;
            } catch (error) {
                this.loadingPromises.delete(modelType);
                throw error;
            }
            
        } catch (error) {
            console.error(`❌ 模型加载失败: ${modelType}`, error);
            throw ErrorHandler.createError('ModelManager', `模型加载失败: ${modelType}`, error);
        }
    }
    
    /**
     * 卸载模型
     * @param {string} modelType - 模型类型
     * @returns {Promise<void>}
     */
    async unloadModel(modelType) {
        try {
            if (!this.models.has(modelType)) {
                console.warn(`⚠️ 模型未加载，无需卸载: ${modelType}`);
                return;
            }
            
            const model = this.models.get(modelType);
            
            // 释放模型内存
            if (model && typeof model.dispose === 'function') {
                model.dispose();
            }
            
            // 从缓存中移除
            this.models.delete(modelType);
            this.modelConfigs.delete(modelType);
            
            // 如果是当前模型，清空引用
            if (this.currentModel === modelType) {
                this.currentModel = null;
            }
            
            console.log(`🗑️ 模型已卸载: ${modelType}`);
            
            // 发布模型卸载事件
            eventBus.emit(EVENTS.MODEL_UNLOADED, {
                modelType,
                remainingModels: Array.from(this.models.keys())
            });
            
        } catch (error) {
            console.error(`❌ 模型卸载失败: ${modelType}`, error);
            throw error;
        }
    }
    
    /**
     * 获取模型信息
     * @param {string} modelType - 模型类型
     * @returns {IModelInfo|null} 模型信息
     */
    getModelInfo(modelType) {
        const config = this.modelConfigs.get(modelType);
        if (!config) {
            return null;
        }
        
        const isLoaded = this.models.has(modelType);
        const model = this.models.get(modelType);
        
        return {
            type: modelType,
            status: isLoaded ? MODEL_STATUS.LOADED : MODEL_STATUS.UNLOADED,
            config: { ...config },
            memoryUsage: this._getModelMemoryUsage(model),
            loadTime: config.loadTime || 0,
            lastUsed: config.lastUsed || null,
            isCurrent: this.currentModel === modelType
        };
    }
    
    /**
     * 预热模型
     * @param {string} modelType - 模型类型
     * @param {any} sampleInput - 样本输入数据
     * @returns {Promise<void>}
     */
    async warmupModel(modelType, sampleInput = null) {
        try {
            const model = await this.loadModel(modelType);
            
            if (!sampleInput) {
                // 使用默认样本数据
                sampleInput = this._createSampleInput(modelType);
            }
            
            console.log(`🔥 正在预热模型: ${modelType}`);
            
            // 执行一次推理来预热模型
            const startTime = performance.now();
            await this._runInference(model, sampleInput);
            const warmupTime = performance.now() - startTime;
            
            // 更新配置
            const config = this.modelConfigs.get(modelType);
            if (config) {
                config.warmupTime = warmupTime;
                config.isWarmedUp = true;
            }
            
            console.log(`✅ 模型预热完成: ${modelType} (${warmupTime.toFixed(2)}ms)`);
            
        } catch (error) {
            console.error(`❌ 模型预热失败: ${modelType}`, error);
            throw error;
        }
    }
    
    /**
     * 清理未使用的模型
     * @returns {Promise<void>}
     */
    async cleanupUnusedModels() {
        try {
            const now = Date.now();
            const unusedThreshold = 5 * 60 * 1000; // 5分钟未使用
            const modelsToRemove = [];
            
            for (const [modelType, config] of this.modelConfigs.entries()) {
                if (modelType === this.currentModel) {
                    continue; // 不清理当前使用的模型
                }
                
                if (config.lastUsed && (now - config.lastUsed) > unusedThreshold) {
                    modelsToRemove.push(modelType);
                }
            }
            
            // 按最后使用时间排序，优先清理最久未使用的
            modelsToRemove.sort((a, b) => {
                const configA = this.modelConfigs.get(a);
                const configB = this.modelConfigs.get(b);
                return (configA.lastUsed || 0) - (configB.lastUsed || 0);
            });
            
            // 清理模型
            for (const modelType of modelsToRemove) {
                await this.unloadModel(modelType);
            }
            
            if (modelsToRemove.length > 0) {
                console.log(`🧹 已清理 ${modelsToRemove.length} 个未使用的模型`);
            }
            
        } catch (error) {
            console.error('❌ 清理未使用模型失败:', error);
        }
    }
    
    /**
     * 获取当前使用的模型
     * @returns {string|null} 当前模型类型
     */
    getCurrentModel() {
        return this.currentModel;
    }
    
    /**
     * 设置当前使用的模型
     * @param {string} modelType - 模型类型
     */
    setCurrentModel(modelType) {
        if (this.models.has(modelType)) {
            this.currentModel = modelType;
            
            // 更新最后使用时间
            const config = this.modelConfigs.get(modelType);
            if (config) {
                config.lastUsed = Date.now();
            }
            
            console.log(`🎯 当前模型设置为: ${modelType}`);
        } else {
            console.warn(`⚠️ 模型未加载，无法设置为当前模型: ${modelType}`);
        }
    }
    
    /**
     * 处理输入数据
     * @param {any} inputData - 输入数据
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 处理结果
     */
    async process(inputData, options = {}) {
        try {
            const modelType = options.modelType || this.currentModel;
            if (!modelType) {
                throw new Error('未指定模型类型且无当前模型');
            }
            
            const model = await this.loadModel(modelType);
            this.setCurrentModel(modelType);
            
            // 执行推理
            const result = await this._runInference(model, inputData, options);
            
            return result;
            
        } catch (error) {
            console.error('❌ 模型处理失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取管理器状态
     * @returns {Object} 状态信息
     */
    getStatus() {
        return {
            loadedModels: Array.from(this.models.keys()),
            currentModel: this.currentModel,
            cacheSize: this.models.size,
            maxCacheSize: this.options.maxCacheSize,
            stats: { ...this.stats },
            memoryUsage: this._getTotalMemoryUsage(),
            options: { ...this.options }
        };
    }
    
    /**
     * 清理所有资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 正在清理模型管理器资源...');
            
            // 停止内存监控
            if (this.memoryMonitorInterval) {
                clearInterval(this.memoryMonitorInterval);
                this.memoryMonitorInterval = null;
            }
            
            // 卸载所有模型
            const modelTypes = Array.from(this.models.keys());
            for (const modelType of modelTypes) {
                await this.unloadModel(modelType);
            }
            
            // 清空缓存
            this.models.clear();
            this.modelConfigs.clear();
            this.loadingPromises.clear();
            this.currentModel = null;
            
            console.log('✅ 模型管理器资源清理完成');
            
        } catch (error) {
            console.error('❌ 模型管理器清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 内部模型加载实现
     * @private
     * @param {string} modelType - 模型类型
     * @param {Object} config - 模型配置
     * @returns {Promise<Object>} 加载的模型
     */
    async _loadModelInternal(modelType, config = {}) {
        const startTime = performance.now();
        
        try {
            // 检查缓存大小，必要时清理
            await this._ensureCacheSpace();
            
            // 获取模型配置
            const modelConfig = this._getModelConfig(modelType, config);
            
            console.log(`📦 正在加载模型: ${modelType}`);
            
            // 根据模型类型加载
            let model;
            switch (modelConfig.framework) {
                case 'tensorflow':
                    model = await this._loadTensorFlowModel(modelConfig);
                    break;
                default:
                    throw new Error(`不支持的模型框架: ${modelConfig.framework}`);
            }
            
            const loadTime = performance.now() - startTime;
            
            // 更新配置
            modelConfig.loadTime = loadTime;
            modelConfig.lastUsed = Date.now();
            modelConfig.status = MODEL_STATUS.LOADED;
            
            // 缓存模型和配置
            this.models.set(modelType, model);
            this.modelConfigs.set(modelType, modelConfig);
            
            // 更新统计
            this.stats.modelsLoaded++;
            this.stats.totalLoadTime += loadTime;
            this.stats.averageLoadTime = this.stats.totalLoadTime / this.stats.modelsLoaded;
            this.stats.cacheMisses++;
            
            console.log(`✅ 模型加载完成: ${modelType} (${loadTime.toFixed(2)}ms)`);
            
            // 发布模型加载事件
            eventBus.emit(EVENTS.MODEL_LOADED, {
                modelType,
                loadTime,
                memoryUsage: this._getModelMemoryUsage(model)
            });
            
            return model;
            
        } catch (error) {
            console.error(`❌ 模型加载失败: ${modelType}`, error);
            throw error;
        }
    }
    
    /**
     * 加载TensorFlow模型
     * @private
     * @param {Object} config - 模型配置
     * @returns {Promise<Object>} TensorFlow模型
     */
    async _loadTensorFlowModel(config) {
        const tf = window.tf;
        
        if (!tf) {
            throw new Error('TensorFlow.js未加载');
        }
        
        // 构建模型URL
        const modelUrl = `${this.options.modelBasePath}/${config.path}/model.json`;
        
        // 加载模型
        const model = await tf.loadLayersModel(modelUrl, {
            onProgress: (fraction) => {
                console.log(`📦 模型加载进度: ${(fraction * 100).toFixed(1)}%`);
            }
        });
        
        return model;
    }
    
    /**
     * 执行模型推理
     * @private
     * @param {Object} model - 模型实例
     * @param {any} inputData - 输入数据
     * @param {Object} options - 推理选项
     * @returns {Promise<any>} 推理结果
     */
    async _runInference(model, inputData, options = {}) {
        const tf = window.tf;
        
        if (!tf || !model) {
            throw new Error('模型或TensorFlow.js不可用');
        }
        
        // 将输入数据转换为张量
        let inputTensor;
        if (inputData instanceof tf.Tensor) {
            inputTensor = inputData;
        } else {
            inputTensor = tf.browser.fromPixels(inputData);
        }
        
        try {
            // 执行推理
            const result = await model.predict(inputTensor);
            return result;
            
        } finally {
            // 清理输入张量（如果是我们创建的）
            if (!(inputData instanceof tf.Tensor)) {
                inputTensor.dispose();
            }
        }
    }
    
    /**
     * 初始化模型配置
     * @private
     */
    _initModelConfigs() {
        // PoseNet模型配置
        this.modelConfigs.set(MODEL_TYPES.POSENET, {
            type: MODEL_TYPES.POSENET,
            framework: 'tensorflow',
            path: 'posenet',
            inputShape: [1, 513, 513, 3],
            outputShape: [1, 17, 3],
            status: MODEL_STATUS.UNLOADED
        });
        
        // MoveNet模型配置
        this.modelConfigs.set(MODEL_TYPES.MOVENET, {
            type: MODEL_TYPES.MOVENET,
            framework: 'tensorflow',
            path: 'movenet',
            inputShape: [1, 256, 256, 3],
            outputShape: [1, 17, 3],
            status: MODEL_STATUS.UNLOADED
        });
    }
    
    /**
     * 获取模型配置
     * @private
     * @param {string} modelType - 模型类型
     * @param {Object} customConfig - 自定义配置
     * @returns {Object} 合并后的配置
     */
    _getModelConfig(modelType, customConfig = {}) {
        const defaultConfig = this.modelConfigs.get(modelType);
        if (!defaultConfig) {
            throw new Error(`未知的模型类型: ${modelType}`);
        }
        
        return { ...defaultConfig, ...customConfig };
    }
    
    /**
     * 确保缓存空间
     * @private
     */
    async _ensureCacheSpace() {
        if (this.models.size >= this.options.maxCacheSize) {
            // 找到最久未使用的模型
            let oldestModel = null;
            let oldestTime = Date.now();
            
            for (const [modelType, config] of this.modelConfigs.entries()) {
                if (modelType === this.currentModel) {
                    continue; // 不清理当前模型
                }
                
                const lastUsed = config.lastUsed || 0;
                if (lastUsed < oldestTime) {
                    oldestTime = lastUsed;
                    oldestModel = modelType;
                }
            }
            
            if (oldestModel) {
                await this.unloadModel(oldestModel);
            }
        }
    }
    
    /**
     * 预加载模型
     * @private
     */
    async _preloadModels() {
        for (const modelType of this.options.preloadModels) {
            try {
                await this.loadModel(modelType);
            } catch (error) {
                console.warn(`⚠️ 预加载模型失败: ${modelType}`, error);
            }
        }
    }
    
    /**
     * 设置TensorFlow后端
     * @private
     */
    async _setupTensorFlowBackend() {
        const tf = window.tf;
        
        if (this.options.enableGPU) {
            try {
                await tf.setBackend('webgl');
                console.log('🎮 GPU后端已启用');
            } catch (error) {
                console.warn('⚠️ GPU后端启用失败，回退到CPU:', error);
                await tf.setBackend('cpu');
            }
        } else {
            await tf.setBackend('cpu');
            console.log('💻 CPU后端已启用');
        }
        
        await tf.ready();
    }
    
    /**
     * 创建样本输入数据
     * @private
     * @param {string} modelType - 模型类型
     * @returns {any} 样本输入
     */
    _createSampleInput(modelType) {
        const tf = window.tf;
        const config = this.modelConfigs.get(modelType);
        
        if (config && config.inputShape) {
            return tf.zeros(config.inputShape);
        }
        
        // 默认样本输入
        return tf.zeros([1, 256, 256, 3]);
    }
    
    /**
     * 获取模型内存使用量
     * @private
     * @param {Object} model - 模型实例
     * @returns {number} 内存使用量（字节）
     */
    _getModelMemoryUsage(model) {
        if (!model) return 0;
        
        try {
            // 估算模型内存使用量
            if (model.countParams) {
                return model.countParams() * 4; // 假设每个参数4字节
            }
        } catch (error) {
            // 忽略错误
        }
        
        return 0;
    }
    
    /**
     * 获取总内存使用量
     * @private
     * @returns {Object} 内存使用信息
     */
    _getTotalMemoryUsage() {
        const tf = window.tf;
        if (tf && tf.memory) {
            return tf.memory();
        }
        return { numTensors: 0, numDataBuffers: 0, numBytes: 0 };
    }
    
    /**
     * 开始内存监控
     * @private
     */
    _startMemoryMonitoring() {
        this.memoryMonitorInterval = setInterval(() => {
            const memoryInfo = this._getTotalMemoryUsage();
            this.stats.memoryUsage = memoryInfo.numBytes;
            
            // 检查内存阈值
            if (memoryInfo.numBytes > this.options.memoryThreshold) {
                eventBus.emit(EVENTS.MEMORY_WARNING, {
                    current: memoryInfo.numBytes,
                    threshold: this.options.memoryThreshold,
                    source: 'ModelManager'
                });
            }
        }, 10000); // 每10秒检查一次
    }
}

// 导出模型类型和状态枚举
export { MODEL_STATUS, MODEL_TYPES };