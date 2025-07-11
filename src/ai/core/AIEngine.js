/**
 * AI引擎主类
 * 统一管理所有AI功能，提供统一的AI处理接口
 */

import { IAIEngine, AI_ENGINE_TYPES, AI_ENGINE_STATUS, IAIResult } from '../interfaces/IAIEngine.js';
import { eventBus, EVENTS } from '../../utils/EventBus.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * AI引擎主类
 * 实现统一的AI处理接口，协调模型管理器和滤波器管理器
 */
export class AIEngine extends IAIEngine {
    constructor(options = {}) {
        super();
        
        this.type = options.type || AI_ENGINE_TYPES.POSE_ESTIMATION;
        this.status = AI_ENGINE_STATUS.UNINITIALIZED;
        this.modelManager = null;
        this.filterManager = null;
        this.processors = new Map();
        
        // 配置选项
        this.options = {
            enableFiltering: options.enableFiltering !== false,
            enableCaching: options.enableCaching !== false,
            enableGPU: options.enableGPU !== false,
            maxMemoryUsage: options.maxMemoryUsage || 512 * 1024 * 1024, // 512MB
            ...options
        };
        
        // 性能统计
        this.stats = {
            processedFrames: 0,
            totalProcessingTime: 0,
            averageProcessingTime: 0,
            lastProcessingTime: 0,
            errorCount: 0
        };
        
        // 绑定事件监听器
        this._bindEventListeners();
        
        console.log('🤖 AI引擎已创建:', this.type);
    }
    
    /**
     * 初始化AI引擎
     * @param {Object} options - 初始化选项
     * @returns {Promise<void>}
     */
    async init(options = {}) {
        if (this.status !== AI_ENGINE_STATUS.UNINITIALIZED) {
            console.warn('⚠️ AI引擎已初始化，跳过重复初始化');
            return;
        }
        
        try {
            this.status = AI_ENGINE_STATUS.INITIALIZING;
            console.log('🚀 正在初始化AI引擎...');
            
            // 合并配置
            this.options = { ...this.options, ...options };
            
            // 初始化模型管理器
            if (!this.modelManager) {
                const { ModelManager } = await import('./ModelManager.js');
                this.modelManager = new ModelManager(this.options.model || {});
                await this.modelManager.init();
            }
            
            // 初始化滤波器管理器
            if (this.options.enableFiltering && !this.filterManager) {
                const { FilterManager } = await import('./FilterManager.js');
                this.filterManager = new FilterManager(this.options.filter || {});
                await this.filterManager.init();
            }
            
            // 初始化数据处理器
            await this._initProcessors();
            
            this.status = AI_ENGINE_STATUS.READY;
            
            // 发布初始化完成事件
            eventBus.emit(EVENTS.AI_ENGINE_INITIALIZED, {
                type: this.type,
                status: this.status,
                capabilities: this.getCapabilities()
            });
            
            console.log('✅ AI引擎初始化完成');
            
        } catch (error) {
            this.status = AI_ENGINE_STATUS.ERROR;
            console.error('❌ AI引擎初始化失败:', error);
            throw ErrorHandler.createError('AIEngine', `初始化失败: ${error.message}`, error);
        }
    }
    
    /**
     * 处理输入数据
     * @param {any} inputData - 输入数据（图像、视频帧等）
     * @param {Object} options - 处理选项
     * @returns {Promise<IAIResult>} 处理结果
     */
    async process(inputData, options = {}) {
        const result = new IAIResult();
        const startTime = performance.now();
        
        try {
            // 检查引擎状态
            if (this.status !== AI_ENGINE_STATUS.READY) {
                throw new Error(`AI引擎未就绪，当前状态: ${this.status}`);
            }
            
            this.status = AI_ENGINE_STATUS.PROCESSING;
            
            // 数据预处理
            let processedData = inputData;
            if (this.processors.has('preprocessor')) {
                const preprocessor = this.processors.get('preprocessor');
                processedData = await preprocessor.preprocess(inputData, options);
            }
            
            // 模型推理
            let modelResult = null;
            if (this.modelManager) {
                modelResult = await this.modelManager.process(processedData, options);
            }
            
            // 数据后处理
            let postprocessedData = modelResult;
            if (this.processors.has('postprocessor')) {
                const postprocessor = this.processors.get('postprocessor');
                postprocessedData = await postprocessor.postprocess(modelResult, options);
            }
            
            // 应用滤波器
            let filteredData = postprocessedData;
            if (this.options.enableFiltering && this.filterManager && postprocessedData) {
                filteredData = await this.filterManager.filter(postprocessedData, {
                    timestamp: performance.now(),
                    ...options
                });
            }
            
            // 格式化结果
            let formattedData = filteredData;
            if (this.processors.has('formatter')) {
                const formatter = this.processors.get('formatter');
                formattedData = formatter.format(filteredData, options.format || 'default');
            }
            
            // 设置成功结果
            result.success = true;
            result.data = formattedData;
            result.metadata = {
                processingTime: performance.now() - startTime,
                inputType: typeof inputData,
                outputType: typeof formattedData,
                modelUsed: this.modelManager?.getCurrentModel() || null,
                filterApplied: this.options.enableFiltering && !!this.filterManager
            };
            
            // 更新统计信息
            this._updateStats(result.metadata.processingTime);
            
            this.status = AI_ENGINE_STATUS.READY;
            
        } catch (error) {
            result.success = false;
            result.error = error;
            result.metadata = {
                processingTime: performance.now() - startTime,
                errorType: error.constructor.name,
                errorMessage: error.message
            };
            
            this.stats.errorCount++;
            this.status = AI_ENGINE_STATUS.READY; // 恢复就绪状态
            
            console.error('❌ AI处理失败:', error);
        }
        
        return result;
    }
    
    /**
     * 获取引擎状态
     * @returns {Object} 引擎状态信息
     */
    getStatus() {
        return {
            type: this.type,
            status: this.status,
            isReady: this.status === AI_ENGINE_STATUS.READY,
            modelManager: this.modelManager?.getStatus() || null,
            filterManager: this.filterManager?.getStatus() || null,
            processors: Array.from(this.processors.keys()),
            stats: { ...this.stats },
            options: { ...this.options },
            memoryUsage: this._getMemoryUsage()
        };
    }
    
    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        try {
            console.log('🧹 正在清理AI引擎资源...');
            
            // 清理模型管理器
            if (this.modelManager) {
                await this.modelManager.cleanup();
                this.modelManager = null;
            }
            
            // 清理滤波器管理器
            if (this.filterManager) {
                await this.filterManager.cleanup();
                this.filterManager = null;
            }
            
            // 清理数据处理器
            this.processors.clear();
            
            // 重置状态
            this.status = AI_ENGINE_STATUS.DISPOSED;
            
            // 发布清理完成事件
            eventBus.emit(EVENTS.AI_ENGINE_DISPOSED, {
                type: this.type
            });
            
            console.log('✅ AI引擎资源清理完成');
            
        } catch (error) {
            console.error('❌ AI引擎清理失败:', error);
            throw error;
        }
    }
    
    /**
     * 获取引擎能力描述
     * @returns {Object} 能力描述
     */
    getCapabilities() {
        return {
            type: this.type,
            supportedInputTypes: ['image', 'video', 'canvas', 'tensor'],
            supportedOutputTypes: ['poses', 'keypoints', 'objects'],
            features: {
                modelManagement: !!this.modelManager,
                filtering: this.options.enableFiltering,
                caching: this.options.enableCaching,
                gpu: this.options.enableGPU,
                preprocessing: this.processors.has('preprocessor'),
                postprocessing: this.processors.has('postprocessor'),
                formatting: this.processors.has('formatter')
            },
            performance: {
                maxMemoryUsage: this.options.maxMemoryUsage,
                averageProcessingTime: this.stats.averageProcessingTime,
                processedFrames: this.stats.processedFrames
            }
        };
    }
    
    /**
     * 初始化数据处理器
     * @private
     */
    async _initProcessors() {
        try {
            // 根据AI引擎类型加载对应的处理器
            if (this.type === AI_ENGINE_TYPES.POSE_ESTIMATION) {
                const { PoseProcessor } = await import('../processors/PoseProcessor.js');
                this.processors.set('preprocessor', new PoseProcessor());
                this.processors.set('postprocessor', new PoseProcessor());
                
                const { ResultFormatter } = await import('../processors/ResultFormatter.js');
                this.processors.set('formatter', new ResultFormatter());
            }
            
            console.log('✅ 数据处理器初始化完成');
            
        } catch (error) {
            console.warn('⚠️ 数据处理器初始化失败:', error);
            // 处理器初始化失败不应该阻止AI引擎启动
        }
    }
    
    /**
     * 绑定事件监听器
     * @private
     */
    _bindEventListeners() {
        // 监听模型加载事件
        eventBus.on(EVENTS.MODEL_LOADED, (data) => {
            console.log('📦 模型已加载:', data.modelType);
        });
        
        // 监听内存警告事件
        eventBus.on(EVENTS.MEMORY_WARNING, (data) => {
            console.warn('⚠️ 内存使用警告:', data);
            this._handleMemoryWarning(data);
        });
    }
    
    /**
     * 更新统计信息
     * @private
     * @param {number} processingTime - 处理时间
     */
    _updateStats(processingTime) {
        this.stats.processedFrames++;
        this.stats.lastProcessingTime = processingTime;
        this.stats.totalProcessingTime += processingTime;
        this.stats.averageProcessingTime = this.stats.totalProcessingTime / this.stats.processedFrames;
    }
    
    /**
     * 获取内存使用情况
     * @private
     * @returns {Object} 内存使用信息
     */
    _getMemoryUsage() {
        if (typeof window !== 'undefined' && window.tf) {
            return window.tf.memory();
        }
        return null;
    }
    
    /**
     * 处理内存警告
     * @private
     * @param {Object} data - 内存警告数据
     */
    async _handleMemoryWarning(data) {
        try {
            // 清理未使用的模型
            if (this.modelManager) {
                await this.modelManager.cleanupUnusedModels();
            }
            
            // 重置滤波器
            if (this.filterManager) {
                this.filterManager.resetFilters();
            }
            
            console.log('🧹 内存警告处理完成');
            
        } catch (error) {
            console.error('❌ 内存警告处理失败:', error);
        }
    }
}

// 导出AI引擎类型和状态枚举
export { AI_ENGINE_TYPES, AI_ENGINE_STATUS };