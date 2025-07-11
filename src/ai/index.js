/**
 * AI模块统一入口
 * 提供所有AI相关功能的统一接口
 */

// 模型提供器
export { TensorFlowProvider } from './models/TensorFlowProvider.js';
export { TensorFlowService } from './models/TensorFlowService.js'; // 向后兼容

// 滤波器
export { OneEuroFilter, LowPassFilter, createOneEuroFilter, ONE_EURO_PRESETS } from './filters/OneEuroFilter.js';
export { OneEuroFilterManager, createOneEuroFilterManager } from './filters/OneEuroFilterManager.js';

// 接口定义
export { IDataProcessor } from './interfaces/IDataProcessor.js';
export { IModelProvider } from './interfaces/IModelProvider.js';
export { IFilter } from './interfaces/IDataProcessor.js';

// 工厂函数和实用工具
export { createAIProvider, createFilterManager } from './utils/factories.js';

/**
 * AI模块配置
 */
export const AI_CONFIG = {
    // 默认模型配置
    DEFAULT_MODEL: {
        type: 'movenet',
        backend: 'webgl',
        cacheSize: 3
    },
    
    // 默认滤波器配置
    DEFAULT_FILTER: {
        frequency: 30.0,
        minCutoff: 1.0,
        beta: 0.5,
        derivateCutoff: 1.0
    },
    
    // 性能配置
    PERFORMANCE: {
        enableMemoryMonitoring: true,
        memoryCleanupInterval: 30000, // 30秒
        maxMemoryUsage: 512 * 1024 * 1024 // 512MB
    }
};

/**
 * 创建完整的AI处理管道
 * @param {Object} options - 配置选项
 * @returns {Object} AI处理管道实例
 */
export async function createAIPipeline(options = {}) {
    const {
        modelType = AI_CONFIG.DEFAULT_MODEL.type,
        backend = AI_CONFIG.DEFAULT_MODEL.backend,
        filterParams = AI_CONFIG.DEFAULT_FILTER,
        enableFiltering = true
    } = options;
    
    // 创建模型提供器
    const modelProvider = new TensorFlowProvider({
        backend,
        modelCacheSize: AI_CONFIG.DEFAULT_MODEL.cacheSize
    });
    
    // 初始化模型提供器
    await modelProvider.initialize();
    
    // 加载检测器
    const detector = await modelProvider.getDetector(modelType);
    
    // 创建滤波器管理器
    const filterManager = enableFiltering ? 
        new OneEuroFilterManager(filterParams) : null;
    
    return {
        modelProvider,
        detector,
        filterManager,
        
        /**
         * 处理输入数据
         * @param {ImageData|HTMLVideoElement|HTMLCanvasElement} input - 输入数据
         * @param {number} timestamp - 时间戳
         * @returns {Object} 处理结果
         */
        async process(input, timestamp = Date.now()) {
            try {
                // 模型推理
                const rawResults = await detector.estimatePoses(input);
                
                // 应用滤波（如果启用）
                const filteredResults = filterManager && rawResults.length > 0 ?
                    rawResults.map(pose => ({
                        ...pose,
                        keypoints: filterManager.filterPose(pose.keypoints, timestamp)
                    })) : rawResults;
                
                return {
                    poses: filteredResults,
                    timestamp,
                    modelType,
                    filtered: !!filterManager
                };
                
            } catch (error) {
                console.error('❌ AI处理管道失败:', error);
                throw error;
            }
        },
        
        /**
         * 更新滤波器参数
         * @param {Object} params - 新参数
         */
        updateFilterParams(params) {
            if (filterManager) {
                filterManager.updateParameters(params);
            }
        },
        
        /**
         * 获取统计信息
         * @returns {Object} 统计信息
         */
        getStats() {
            return {
                model: modelProvider.getStats(),
                filter: filterManager ? filterManager.getStats() : null,
                memory: modelProvider.getMemoryUsage()
            };
        },
        
        /**
         * 清理资源
         */
        async cleanup() {
            if (filterManager) {
                filterManager.destroy();
            }
            await modelProvider.destroy();
        }
    };
}

/**
 * AI模块版本信息
 */
export const AI_VERSION = {
    version: '2.0.0',
    build: Date.now(),
    features: [
        'TensorFlow.js集成',
        'One Euro Filter滤波',
        '多模型支持',
        '内存管理',
        '性能监控',
        '批量处理'
    ]
};

console.log(`🤖 AI模块已加载 v${AI_VERSION.version}`);