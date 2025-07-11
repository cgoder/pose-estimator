/**
 * AI模块工厂函数
 * 提供便捷的创建和配置方法
 */

import { TensorFlowProvider } from '../models/TensorFlowProvider.js';
import { OneEuroFilterManager } from '../filters/OneEuroFilterManager.js';
import { ONE_EURO_PRESETS } from '../filters/OneEuroFilter.js';
import { CONFIG } from '../../utils/constants.js';
import { ErrorHandler } from '../../utils/errorHandling.js';

/**
 * 创建AI提供器
 * @param {Object} options - 配置选项
 * @param {string} options.backend - 后端类型 ('webgl', 'cpu', 'webgpu')
 * @param {number} options.modelCacheSize - 模型缓存大小
 * @param {boolean} options.enableMemoryMonitoring - 是否启用内存监控
 * @returns {Promise<TensorFlowProvider>} AI提供器实例
 */
export async function createAIProvider(options = {}) {
    const {
        backend = 'webgl',
        modelCacheSize = 3,
        enableMemoryMonitoring = true
    } = options;
    
    try {
        const provider = new TensorFlowProvider({
            backend,
            modelCacheSize,
            enableMemoryMonitoring
        });
        
        await provider.initialize();
        
        console.log(`✅ AI提供器已创建 (backend: ${backend})`);
        return provider;
        
    } catch (error) {
        console.error('❌ AI提供器创建失败:', error);
        throw ErrorHandler.createError('AIFactory', `AI提供器创建失败: ${error.message}`, error);
    }
}

/**
 * 创建滤波器管理器
 * @param {Object} options - 配置选项
 * @param {string} options.preset - 预设名称
 * @param {Object} options.customParams - 自定义参数
 * @param {boolean} options.enabled - 是否启用
 * @returns {OneEuroFilterManager} 滤波器管理器实例
 */
export function createFilterManager(options = {}) {
    const {
        preset = 'balanced',
        customParams = {},
        enabled = true
    } = options;
    
    try {
        // 获取预设参数
        let filterParams;
        if (preset && ONE_EURO_PRESETS[preset]) {
            filterParams = { ...ONE_EURO_PRESETS[preset] };
        } else {
            filterParams = {
                frequency: CONFIG.FILTER.DEFAULT_FREQUENCY,
                minCutoff: CONFIG.FILTER.DEFAULT_MIN_CUTOFF,
                beta: CONFIG.FILTER.DEFAULT_BETA,
                dCutoff: CONFIG.FILTER.DEFAULT_D_CUTOFF
            };
        }
        
        // 应用自定义参数
        Object.assign(filterParams, customParams);
        
        const manager = new OneEuroFilterManager(filterParams);
        manager.setEnabled(enabled);
        
        console.log(`✅ 滤波器管理器已创建 (preset: ${preset})`);
        return manager;
        
    } catch (error) {
        console.error('❌ 滤波器管理器创建失败:', error);
        throw ErrorHandler.createError('AIFactory', `滤波器管理器创建失败: ${error.message}`, error);
    }
}

/**
 * 创建模型检测器
 * @param {Object} options - 配置选项
 * @param {string} options.modelType - 模型类型
 * @param {TensorFlowProvider} options.provider - AI提供器实例
 * @returns {Promise<Object>} 检测器实例
 */
export async function createDetector(options = {}) {
    const {
        modelType = 'movenet',
        provider
    } = options;
    
    if (!provider) {
        throw new Error('必须提供AI提供器实例');
    }
    
    try {
        const detector = await provider.getDetector(modelType);
        console.log(`✅ ${modelType}检测器已创建`);
        return detector;
        
    } catch (error) {
        console.error(`❌ ${modelType}检测器创建失败:`, error);
        throw ErrorHandler.createError('AIFactory', `检测器创建失败: ${error.message}`, error);
    }
}

/**
 * 创建完整的AI处理器
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} AI处理器实例
 */
export async function createAIProcessor(options = {}) {
    const {
        modelType = 'movenet',
        backend = 'webgl',
        filterPreset = 'balanced',
        enableFiltering = true,
        modelCacheSize = 3
    } = options;
    
    try {
        // 创建AI提供器
        const provider = await createAIProvider({
            backend,
            modelCacheSize
        });
        
        // 创建检测器
        const detector = await createDetector({
            modelType,
            provider
        });
        
        // 创建滤波器管理器
        const filterManager = enableFiltering ? 
            createFilterManager({ preset: filterPreset }) : null;
        
        return {
            provider,
            detector,
            filterManager,
            modelType,
            
            /**
             * 处理输入
             * @param {*} input - 输入数据
             * @param {number} timestamp - 时间戳
             * @returns {Promise<Object>} 处理结果
             */
            async process(input, timestamp = Date.now()) {
                const poses = await detector.estimatePoses(input);
                
                if (filterManager && poses.length > 0) {
                    return poses.map(pose => ({
                        ...pose,
                        keypoints: filterManager.filterPose(pose.keypoints, timestamp)
                    }));
                }
                
                return poses;
            },
            
            /**
             * 获取状态
             * @returns {Object} 状态信息
             */
            getStatus() {
                return {
                    modelType,
                    backend,
                    provider: provider.getStatus(),
                    filter: filterManager ? filterManager.getStats() : null
                };
            },
            
            /**
             * 清理资源
             */
            async cleanup() {
                if (filterManager) {
                    filterManager.destroy();
                }
                await provider.destroy();
            }
        };
        
    } catch (error) {
        console.error('❌ AI处理器创建失败:', error);
        throw ErrorHandler.createError('AIFactory', `AI处理器创建失败: ${error.message}`, error);
    }
}

/**
 * 批量创建多个AI处理器
 * @param {Array<Object>} configs - 配置数组
 * @returns {Promise<Array<Object>>} AI处理器数组
 */
export async function createMultipleAIProcessors(configs) {
    if (!Array.isArray(configs)) {
        throw new Error('配置必须是数组');
    }
    
    const processors = [];
    
    for (const config of configs) {
        try {
            const processor = await createAIProcessor(config);
            processors.push(processor);
        } catch (error) {
            console.error('❌ 批量创建AI处理器失败:', error);
            // 清理已创建的处理器
            for (const processor of processors) {
                try {
                    await processor.cleanup();
                } catch (cleanupError) {
                    console.warn('⚠️ 处理器清理失败:', cleanupError);
                }
            }
            throw error;
        }
    }
    
    console.log(`✅ 批量创建了${processors.length}个AI处理器`);
    return processors;
}

/**
 * 预设配置
 */
export const AI_PRESETS = {
    // 高性能配置
    HIGH_PERFORMANCE: {
        modelType: 'movenet',
        backend: 'webgl',
        filterPreset: 'performance',
        enableFiltering: true,
        modelCacheSize: 5
    },
    
    // 高精度配置
    HIGH_ACCURACY: {
        modelType: 'posenet',
        backend: 'webgl',
        filterPreset: 'precision',
        enableFiltering: true,
        modelCacheSize: 3
    },
    
    // 平衡配置
    BALANCED: {
        modelType: 'movenet',
        backend: 'webgl',
        filterPreset: 'balanced',
        enableFiltering: true,
        modelCacheSize: 3
    },
    
    // 低端设备配置
    LOW_END: {
        modelType: 'movenet',
        backend: 'cpu',
        filterPreset: 'performance',
        enableFiltering: false,
        modelCacheSize: 1
    },
    
    // 实时交互配置
    REAL_TIME: {
        modelType: 'movenet',
        backend: 'webgl',
        filterPreset: 'responsive',
        enableFiltering: true,
        modelCacheSize: 2
    }
};

/**
 * 根据预设创建AI处理器
 * @param {string} presetName - 预设名称
 * @param {Object} overrides - 覆盖参数
 * @returns {Promise<Object>} AI处理器实例
 */
export async function createAIProcessorFromPreset(presetName = 'BALANCED', overrides = {}) {
    const preset = AI_PRESETS[presetName];
    if (!preset) {
        console.warn(`⚠️ 未知预设: ${presetName}，使用默认预设`);
        return createAIProcessor({ ...AI_PRESETS.BALANCED, ...overrides });
    }
    
    return createAIProcessor({ ...preset, ...overrides });
}

/**
 * 获取推荐配置
 * @param {Object} constraints - 约束条件
 * @returns {Object} 推荐配置
 */
export function getRecommendedConfig(constraints = {}) {
    const {
        deviceType = 'desktop', // 'mobile', 'desktop', 'tablet'
        performanceLevel = 'medium', // 'low', 'medium', 'high'
        accuracyRequirement = 'medium', // 'low', 'medium', 'high'
        realTimeRequirement = 'medium' // 'low', 'medium', 'high'
    } = constraints;
    
    // 基于约束条件选择配置
    if (deviceType === 'mobile' || performanceLevel === 'low') {
        return AI_PRESETS.LOW_END;
    }
    
    if (accuracyRequirement === 'high') {
        return AI_PRESETS.HIGH_ACCURACY;
    }
    
    if (realTimeRequirement === 'high') {
        return AI_PRESETS.REAL_TIME;
    }
    
    if (performanceLevel === 'high') {
        return AI_PRESETS.HIGH_PERFORMANCE;
    }
    
    return AI_PRESETS.BALANCED;
}