/**
 * AI引擎接口定义
 * 定义统一的AI引擎接口，支持不同AI算法的插件化集成
 */

/**
 * AI引擎接口
 * @interface IAIEngine
 */
export class IAIEngine {
    /**
     * 初始化AI引擎
     * @param {Object} options - 初始化选项
     * @returns {Promise<void>}
     */
    async init(options = {}) {
        throw new Error('IAIEngine.init() must be implemented');
    }

    /**
     * 处理输入数据
     * @param {any} inputData - 输入数据（图像、视频帧等）
     * @param {Object} options - 处理选项
     * @returns {Promise<any>} 处理结果
     */
    async process(inputData, options = {}) {
        throw new Error('IAIEngine.process() must be implemented');
    }

    /**
     * 获取引擎状态
     * @returns {Object} 引擎状态信息
     */
    getStatus() {
        throw new Error('IAIEngine.getStatus() must be implemented');
    }

    /**
     * 清理资源
     * @returns {Promise<void>}
     */
    async cleanup() {
        throw new Error('IAIEngine.cleanup() must be implemented');
    }

    /**
     * 获取引擎能力描述
     * @returns {Object} 能力描述
     */
    getCapabilities() {
        throw new Error('IAIEngine.getCapabilities() must be implemented');
    }
}

/**
 * AI引擎类型枚举
 */
export const AI_ENGINE_TYPES = {
    POSE_ESTIMATION: 'pose_estimation',
    OBJECT_DETECTION: 'object_detection',
    IMAGE_CLASSIFICATION: 'image_classification',
    FACE_DETECTION: 'face_detection'
};

/**
 * AI引擎状态枚举
 */
export const AI_ENGINE_STATUS = {
    UNINITIALIZED: 'uninitialized',
    INITIALIZING: 'initializing',
    READY: 'ready',
    PROCESSING: 'processing',
    ERROR: 'error',
    DISPOSED: 'disposed'
};

/**
 * AI处理结果接口
 * @interface IAIResult
 */
export class IAIResult {
    constructor() {
        this.success = false;
        this.data = null;
        this.error = null;
        this.metadata = {};
        this.timestamp = Date.now();
    }
}

/**
 * AI引擎配置接口
 * @interface IAIEngineConfig
 */
export class IAIEngineConfig {
    constructor() {
        this.type = null;
        this.modelPath = null;
        this.options = {};
        this.performance = {
            enableGPU: true,
            maxMemoryUsage: 512 * 1024 * 1024, // 512MB
            batchSize: 1
        };
    }
}